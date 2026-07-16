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
    storeId: string,
    actorType: 'admin' | 'system',
    actorId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
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
      storeId,
      newStatus,
    );
    if (!updated) throw new NotFoundException('Order not found after update');

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      storeId,
      orderId,
      eventType: 'status_changed',
      message: `Order status changed from ${order.status} to ${newStatus}`,
      actorType,
      actorId,
    });

    this.eventEmitter.emit(
      'order.status_changed',
      new OrderStatusChangedEvent(
        orderId,
        orgId,
        storeId,
        order.status,
        newStatus,
      ),
    );

    await this.auditService.log({
      entityType: 'order',
      entityId: orderId,
      action: 'status_changed',
      actorType,
      actorId,
      changes: { from: order.status, to: newStatus },
      organizationId: orgId,
      storeId,
    });

    return updated;
  }

  async markPaid(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'paid') return order;

    return this.transition(
      orderId,
      'paid',
      orgId,
      storeId,
      'system',
      'stripe-webhook',
    );
  }

  async markFailed(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'pending') {
      return this.transition(
        orderId,
        'cancelled',
        orgId,
        storeId,
        'system',
        'stripe-webhook',
      );
    }
    return order;
  }

  async findById(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getDetail(
    orderId: string,
    orgId: string,
    storeId: string,
  ): Promise<OrderWithDetails> {
    const detail = await this.orderRepo.findWithDetails(
      orderId,
      orgId,
      storeId,
    );
    if (!detail) throw new NotFoundException('Order not found');
    return detail;
  }

  /**
   * Guest order lookup for the storefront confirmation/status page. Requires
   * both the order number AND the email used at checkout — order numbers are
   * sequential and guessable, so the email acts as the shared secret. Returns
   * null (never reveals existence) when the number is unknown or the email does
   * not match, so the endpoint can't be used to enumerate orders.
   */
  async getGuestOrderStatus(
    orderNumber: string,
    email: string,
    orgId: string,
    storeId: string,
  ): Promise<OrderWithDetails | null> {
    const order = await this.orderRepo.findByOrderNumber(
      orderNumber,
      orgId,
      storeId,
    );
    const normalize = (s: string): string => s.trim().toLowerCase();
    if (!order || normalize(order.customerEmail) !== normalize(email)) {
      return null;
    }
    return this.orderRepo.findWithDetails(order.id, orgId, storeId);
  }

  async listOrders(
    filters: OrderFilterDto,
    orgId: string,
    storeId: string,
  ): Promise<ListOrdersResult> {
    return this.orderRepo.listWithFilters({
      orgId,
      storeId,
      status: filters.status,
      customerId: filters.customerId,
      search: filters.search,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      cursor: filters.cursor,
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getOrdersByCustomer(
    customerId: string,
    orgId: string,
    storeId: string,
    cursor?: string,
    limit = 10,
  ): Promise<ListOrdersResult> {
    return this.orderRepo.listWithFilters({
      orgId,
      storeId,
      customerId,
      cursor,
      limit,
    });
  }

  async addNote(
    orderId: string,
    orgId: string,
    storeId: string,
    note: string,
    actorId: string,
  ): Promise<void> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      storeId,
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
    storeId: string,
  ): Promise<Shipment> {
    const order = await this.orderRepo.findById(orderId, orgId, storeId);
    if (!order) throw new NotFoundException('Order not found');

    if (!['paid', 'processing'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot create a shipment for an order in status "${order.status}"`,
      );
    }

    const shipment = await this.orderRepo.createShipment({
      organizationId: orgId,
      storeId,
      orderId,
      carrier: dto.carrier ?? null,
      trackingNumber: dto.trackingNumber ?? null,
      trackingUrl: dto.trackingUrl ?? null,
      status: 'pending',
      createdBy: adminId,
    });

    await this.orderRepo.updateFulfillmentStatus(
      orderId,
      orgId,
      storeId,
      'partial',
    );

    await this.transition(orderId, 'shipped', orgId, storeId, 'admin', adminId);

    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      storeId,
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
      storeId,
    });

    return shipment;
  }

  async createManualOrder(
    dto: CreateOrderDto,
    adminName: string,
    adminId: string,
    orgId: string,
    storeId: string,
  ): Promise<Order> {
    const currency = dto.currency ?? 'USD';

    // Compute totals from line items + admin-supplied adjustments (all in cents)
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = dto.taxAmount ?? 0;
    const shippingAmount = dto.shippingAmount ?? 0;
    const total = Math.max(
      0,
      subtotal - discountAmount + taxAmount + shippingAmount,
    );

    const orderNumber = await this.orderRepo.generateOrderNumber(
      orgId,
      storeId,
    );

    const isPaid = dto.paymentType === 'paid';

    const order = await this.orderRepo.create({
      organizationId: orgId,
      storeId,
      orderNumber,
      customerId: dto.customerId ?? null,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      status: isPaid ? 'paid' : 'pending',
      fulfillmentStatus: 'unfulfilled',
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      total,
      currency,
      couponCode: dto.couponCode ?? null,
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
      storeId,
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
            storeId,
          )
          .catch(() => {
            // Non-fatal: manual orders can be created even if inventory tracking is missing
          });
      }
    }

    // Create a manual payment record
    await this.db.insert(payments).values({
      organizationId: orgId,
      storeId,
      orderId: order.id,
      provider: 'manual',
      status: isPaid ? 'captured' : 'pending',
      amount: total,
      currency,
    });

    // Timeline entry
    await this.orderRepo.addTimelineEntry({
      organizationId: orgId,
      storeId,
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
      storeId,
    });

    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order.id, orgId, storeId, dto.customerId ?? null),
    );

    return order;
  }

  async updateFulfillmentStatus(
    orderId: string,
    orgId: string,
    storeId: string,
    fulfillmentStatus: Order['fulfillmentStatus'],
  ): Promise<Order> {
    const updated = await this.orderRepo.updateFulfillmentStatus(
      orderId,
      orgId,
      storeId,
      fulfillmentStatus,
    );
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }
}
