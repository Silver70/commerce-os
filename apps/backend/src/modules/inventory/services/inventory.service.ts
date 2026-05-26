import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryLowEvent } from '../../../shared/events/events';
import type { InventoryRepository } from '../repositories/inventory.repository';
import type { AuditService } from '../../audit/services/audit.service';
import type { InventoryItem } from '../../../shared/database/schema';

const RESERVATION_TTL_MINUTES = 15;

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkAvailability(
    variantId: string,
    qty: number,
    orgId: string,
  ): Promise<boolean> {
    const item = await this.inventoryRepo.findByVariantId(variantId, orgId);
    if (!item) return false;
    const available = item.quantity - item.reserved;
    return item.allowBackorder || available >= qty;
  }

  async reserve(
    variantId: string,
    qty: number,
    orgId: string,
    cartId?: string,
    orderId?: string,
  ) {
    const item = await this.inventoryRepo.findByVariantId(variantId, orgId);
    if (!item) throw new NotFoundException('Inventory item not found');

    const available = item.quantity - item.reserved;
    if (!item.allowBackorder && available < qty) {
      throw new BadRequestException(
        `Insufficient stock: ${available} available, ${qty} requested`,
      );
    }

    const expiresAt = new Date(
      Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
    );

    return this.inventoryRepo.createReservation({
      variantId,
      quantity: qty,
      cartId,
      orderId,
      organizationId: orgId,
      expiresAt,
    });
  }

  async release(reservationId: string, orgId: string): Promise<void> {
    const reservation = await this.inventoryRepo.findReservation(
      reservationId,
      orgId,
    );
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'active') return;

    await this.inventoryRepo.updateReservationStatus(reservationId, 'released');
    await this.inventoryRepo.decrementReserved(
      reservation.inventoryItemId,
      orgId,
      reservation.quantity,
    );
  }

  async convert(reservationId: string, orgId: string): Promise<void> {
    const reservation = await this.inventoryRepo.findReservation(
      reservationId,
      orgId,
    );
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'active') return;

    await this.inventoryRepo.updateReservationStatus(
      reservationId,
      'converted',
    );
    await this.inventoryRepo.convertReservation(
      reservation.inventoryItemId,
      orgId,
      reservation.quantity,
    );
  }

  async convertReservations(orderId: string, orgId: string): Promise<void> {
    const reservations = await this.inventoryRepo.findActiveReservationsByOrder(
      orderId,
      orgId,
    );
    for (const r of reservations) {
      await this.convert(r.id, orgId);
    }
  }

  async releaseReservations(orderId: string, orgId: string): Promise<void> {
    const reservations = await this.inventoryRepo.findActiveReservationsByOrder(
      orderId,
      orgId,
    );
    for (const r of reservations) {
      await this.release(r.id, orgId);
    }
  }

  async adjust(
    variantId: string,
    delta: number,
    reason: string,
    adminId: string,
    orgId: string,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepo.findByVariantId(variantId, orgId);
    if (!item) throw new NotFoundException('Inventory item not found');

    const updated = await this.inventoryRepo.adjustQuantity(
      item.id,
      orgId,
      delta,
    );
    if (!updated)
      throw new NotFoundException('Inventory item not found after update');

    await this.auditService.log({
      entityType: 'inventory_item',
      entityId: item.id,
      action: 'adjusted',
      actorType: 'admin',
      actorId: adminId,
      changes: { delta, reason },
      organizationId: orgId,
    });

    const newAvailable = updated.quantity - updated.reserved;
    if (newAvailable <= updated.lowStockThreshold) {
      this.eventEmitter.emit(
        'inventory.low',
        new InventoryLowEvent(
          variantId,
          orgId,
          newAvailable,
          updated.lowStockThreshold,
        ),
      );
    }

    return updated;
  }

  async createForVariant(
    variantId: string,
    orgId: string,
    initialQuantity = 0,
  ): Promise<InventoryItem> {
    return this.inventoryRepo.createForVariant(
      variantId,
      orgId,
      initialQuantity,
    );
  }

  async getByVariantId(
    variantId: string,
    orgId: string,
  ): Promise<InventoryItem | null> {
    return this.inventoryRepo.findByVariantId(variantId, orgId);
  }

  async getAllForOrg(orgId: string): Promise<InventoryItem[]> {
    return this.inventoryRepo.findAll(orgId);
  }

  async getLowStockItems(orgId: string): Promise<InventoryItem[]> {
    return this.inventoryRepo.findLowStock(orgId);
  }

  @Cron('*/5 * * * *')
  async expireStaleReservations(): Promise<void> {
    const stale = await this.inventoryRepo.findStaleActiveReservations();
    for (const r of stale) {
      await this.inventoryRepo.updateReservationStatus(r.id, 'expired');
      await this.inventoryRepo.decrementReserved(
        r.inventoryItemId,
        r.organizationId,
        r.quantity,
      );
    }
  }
}
