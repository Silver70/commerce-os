import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryLowEvent } from '../../../shared/events/events';
import { InventoryRepository } from '../repositories/inventory.repository';
import type {
  InventoryItemView,
  ListInventoryOptions,
  PaginatedInventory,
} from '../repositories/inventory.repository';
import { AuditService } from '../../audit/services/audit.service';
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
    storeId: string,
  ): Promise<boolean> {
    const item = await this.inventoryRepo.findByVariantId(
      variantId,
      orgId,
      storeId,
    );
    if (!item) return false;
    const available = item.quantity - item.reserved;
    return item.allowBackorder || available >= qty;
  }

  async reserve(
    variantId: string,
    qty: number,
    orgId: string,
    storeId: string,
    cartId?: string,
    orderId?: string,
  ) {
    const item = await this.inventoryRepo.findByVariantId(
      variantId,
      orgId,
      storeId,
    );
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
      storeId,
      expiresAt,
    });
  }

  async release(
    reservationId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    const reservation = await this.inventoryRepo.findReservation(
      reservationId,
      orgId,
      storeId,
    );
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== 'active') return;

    await this.inventoryRepo.updateReservationStatus(reservationId, 'released');
    await this.inventoryRepo.decrementReserved(
      reservation.inventoryItemId,
      orgId,
      storeId,
      reservation.quantity,
    );
  }

  async convert(
    reservationId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    const reservation = await this.inventoryRepo.findReservation(
      reservationId,
      orgId,
      storeId,
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
      storeId,
      reservation.quantity,
    );
  }

  async convertReservations(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    const reservations = await this.inventoryRepo.findActiveReservationsByOrder(
      orderId,
      orgId,
      storeId,
    );
    for (const r of reservations) {
      await this.convert(r.id, orgId, storeId);
    }
  }

  async releaseReservations(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    const reservations = await this.inventoryRepo.findActiveReservationsByOrder(
      orderId,
      orgId,
      storeId,
    );
    for (const r of reservations) {
      await this.release(r.id, orgId, storeId);
    }
  }

  async adjust(
    variantId: string,
    delta: number,
    reason: string,
    adminId: string,
    orgId: string,
    storeId: string,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepo.findByVariantId(
      variantId,
      orgId,
      storeId,
    );
    if (!item) throw new NotFoundException('Inventory item not found');

    const updated = await this.inventoryRepo.adjustQuantity(
      item.id,
      orgId,
      storeId,
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
      storeId,
    });

    const newAvailable = updated.quantity - updated.reserved;
    if (newAvailable <= updated.lowStockThreshold) {
      this.eventEmitter.emit(
        'inventory.low',
        new InventoryLowEvent(
          variantId,
          orgId,
          storeId,
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
    storeId: string,
    initialQuantity = 0,
  ): Promise<InventoryItem> {
    return this.inventoryRepo.createForVariant(
      variantId,
      orgId,
      storeId,
      initialQuantity,
    );
  }

  async getByVariantId(
    variantId: string,
    orgId: string,
    storeId: string,
  ): Promise<InventoryItem | null> {
    return this.inventoryRepo.findByVariantId(variantId, orgId, storeId);
  }

  async getAllForOrg(
    orgId: string,
    storeId: string,
    opts: ListInventoryOptions = {},
  ): Promise<PaginatedInventory> {
    return this.inventoryRepo.findAll(orgId, storeId, opts);
  }

  async getLowStockItems(
    orgId: string,
    storeId: string,
  ): Promise<InventoryItemView[]> {
    return this.inventoryRepo.findLowStock(orgId, storeId);
  }

  async associateReservationsWithOrder(
    reservationIds: string[],
    orderId: string,
  ): Promise<void> {
    await this.inventoryRepo.associateReservationsWithOrder(
      reservationIds,
      orderId,
    );
  }

  @Cron('*/5 * * * *')
  async expireStaleReservations(): Promise<void> {
    const stale = await this.inventoryRepo.findStaleActiveReservations();
    for (const r of stale) {
      await this.inventoryRepo.updateReservationStatus(r.id, 'expired');
      await this.inventoryRepo.decrementReserved(
        r.inventoryItemId,
        r.organizationId,
        r.storeId,
        r.quantity,
      );
    }
  }
}
