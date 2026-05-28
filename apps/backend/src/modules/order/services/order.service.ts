import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { OrderRepository } from '../repositories/order.repository';
import type {
  OrderWithDetails,
  ListOrdersResult,
} from '../repositories/order.repository';
import { AuditService } from '../../audit/services/audit.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import {
  OrderStatusChangedEvent,
  OrderCreatedEvent,
} from '../../../shared/events/events';
import { payments } from '../../../shared/database/schema';
import type { Order, Shipment } from '../../../shared/database/schema';
import type { CreateOrderDto } from '../dto/create-order.dto';
import type { CreateShipmentDto } from '../dto/create-shipment.dto';
import type { OrderFilterDto } from '../dto/order-filter.dto';

type OrderStatus = Order['status'];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  refunded: [],
  cancelled: [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventoryService: InventoryService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {}

  async transition(
    orderId: string,
    newStatus: OrderStatus,
    orgId: string,
    actorType: 'admin' | 'system',
    actorId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${newStatus}"`,
      );
    }

    const updated = await this.orderRepo.updateStatus(
      orderId,
      orgId,
      newStatus,
    );
    if (!updated) throw new NotFoundException('Order not found after update');

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      orderId,
      eventType: 'status_changed',
      message: `Order status changed from ${order.status} to ${newStatus}`,
      actorType,
      actorId,
    });

    this.eventEmitter.emit(
      'order.status_changed',
      new OrderStatusChangedEvent(orderId, orgId, order.status, newStatus),
    );

    await this.auditService.log({
      entityType: 'order',
      entityId: orderId,
      action: 'status_changed',
      actorType,
      actorId,
      changes: { from: order.status, to: newStatus },
      organizationId: orgId,
    });

    return updated;
  }

  async markPaid(orderId: string, orgId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'paid') return order;

    return this.transition(orderId, 'paid', orgId, 'system', 'stripe-webhook');
  }

  async markFailed(orderId: string, orgId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'pending') {
      return this.transition(
        orderId,
        'cancelled',
        orgId,
        'system',
        'stripe-webhook',
      );
    }
    return order;
  }

  async findById(orderId: string, orgId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getDetail(orderId: string, orgId: string): Promise<OrderWithDetails> {
    const detail = await this.orderRepo.findWithDetails(orderId, orgId);
    if (!detail) throw new NotFoundException('Order not found');
    return detail;
  }

  async listOrders(
    filters: OrderFilterDto,
    orgId: string,
  ): Promise<ListOrdersResult> {
    return this.orderRepo.listWithFilters({
      orgId,
      status: filters.status,
      customerId: filters.customerId,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      cursor: filters.cursor,
      limit: filters.limit,
    });
  }

  async getOrdersByCustomer(
    customerId: string,
    orgId: string,
    cursor?: string,
    limit = 10,
  ): Promise<ListOrdersResult> {
    return this.orderRepo.listWithFilters({
      orgId,
      customerId,
      cursor,
      limit,
    });
  }

  async addNote(
    orderId: string,
    orgId: string,
    note: string,
    actorId: string,
  ): Promise<void> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      orderId,
      eventType: 'note_added',
      message: note,
      actorType: 'admin',
      actorId,
    });
  }

  async createShipment(
    orderId: string,
    dto: CreateShipmentDto,
    adminId: string,
    orgId: string,
  ): Promise<Shipment> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    if (!['paid', 'processing'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot create a shipment for an order in status "${order.status}"`,
      );
    }

    const shipment = await this.orderRepo.createShipment({
      organizationId: orgId,
      orderId,
      carrier: dto.carrier ?? null,
      trackingNumber: dto.trackingNumber ?? null,
      trackingUrl: dto.trackingUrl ?? null,
      status: 'pending',
      createdBy: adminId,
    });

    await this.orderRepo.updateFulfillmentStatus(orderId, orgId, 'partial');

    await this.transition(orderId, 'shipped', orgId, 'admin', adminId);

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      orderId,
      eventType: 'shipment_created',
      message: `Shipment created${dto.trackingNumber ? ` — tracking: ${dto.trackingNumber}` : ''}`,
      actorType: 'admin',
      actorId: adminId,
    });

    await this.auditService.log({
      entityType: 'shipment',
      entityId: shipment.id,
      action: 'created',
      actorType: 'admin',
      actorId: adminId,
      changes: { carrier: dto.carrier, trackingNumber: dto.trackingNumber },
      organizationId: orgId,
    });

    return shipment;
  }

  async createManualOrder(
    dto: CreateOrderDto,
    adminName: string,
    adminId: string,
    orgId: string,
  ): Promise<Order> {
    const currency = dto.currency ?? 'USD';

    // Compute totals from line items
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const total = subtotal;

    const orderNumber = await this.orderRepo.generateOrderNumber(orgId);

    const isPaid = dto.paymentType === 'paid';

    const order = await this.orderRepo.create({
      organizationId: orgId,
      orderNumber,
      customerId: dto.customerId ?? null,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      status: isPaid ? 'paid' : 'pending',
      fulfillmentStatus: 'unfulfilled',
      subtotal,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      total,
      currency,
      couponCode: null,
      shippingAddress: {
        firstName: dto.shippingAddress.firstName,
        lastName: dto.shippingAddress.lastName,
        company: dto.shippingAddress.company ?? null,
        line1: dto.shippingAddress.line1,
        line2: dto.shippingAddress.line2 ?? null,
        city: dto.shippingAddress.city,
        state: dto.shippingAddress.state ?? null,
        postalCode: dto.shippingAddress.postalCode,
        countryCode: dto.shippingAddress.countryCode,
        phone: dto.shippingAddress.phone ?? null,
      },
      billingAddress: dto.billingAddress
        ? {
            firstName: dto.billingAddress.firstName,
            lastName: dto.billingAddress.lastName,
            company: dto.billingAddress.company ?? null,
            line1: dto.billingAddress.line1,
            line2: dto.billingAddress.line2 ?? null,
            city: dto.billingAddress.city,
            state: dto.billingAddress.state ?? null,
            postalCode: dto.billingAddress.postalCode,
            countryCode: dto.billingAddress.countryCode,
            phone: dto.billingAddress.phone ?? null,
          }
        : null,
      notes: dto.notes ?? null,
      source: 'admin',
    });

    // Create line item snapshots + adjust inventory directly (no reservation)
    const lineItemData = dto.items.map((item) => ({
      organizationId: orgId,
      orderId: order.id,
      variantId: item.variantId ?? null,
      productName: item.productName,
      variantName: item.variantName ?? null,
      sku: item.sku ?? null,
      imageUrl: null as string | null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      discountAmount: 0,
    }));

    await this.orderRepo.createLineItems(lineItemData);

    // Decrement stock for each variant directly (no reservation TTL for manual orders)
    for (const item of dto.items) {
      if (item.variantId) {
        await this.inventoryService
          .adjust(
            item.variantId,
            -item.quantity,
            `Manual order ${order.orderNumber}`,
            adminId,
            orgId,
          )
          .catch(() => {
            // Non-fatal: manual orders can be created even if inventory tracking is missing
          });
      }
    }

    // Create a manual payment record
    await this.db.insert(payments).values({
      organizationId: orgId,
      orderId: order.id,
      provider: 'manual',
      status: isPaid ? 'captured' : 'pending',
      amount: total,
      currency,
    });

    // Timeline entry
    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      orderId: order.id,
      eventType: 'manually_created',
      message: `Order created manually by ${adminName}`,
      actorType: 'admin',
      actorId: adminId,
    });

    await this.auditService.log({
      entityType: 'order',
      entityId: order.id,
      action: 'manually_created',
      actorType: 'admin',
      actorId: adminId,
      changes: { orderNumber: order.orderNumber, paymentType: dto.paymentType },
      organizationId: orgId,
    });

    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order.id, orgId, dto.customerId ?? null),
    );

    return order;
  }

  async updateFulfillmentStatus(
    orderId: string,
    orgId: string,
    fulfillmentStatus: Order['fulfillmentStatus'],
  ): Promise<Order> {
    const updated = await this.orderRepo.updateFulfillmentStatus(
      orderId,
      orgId,
      fulfillmentStatus,
    );
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }
}
