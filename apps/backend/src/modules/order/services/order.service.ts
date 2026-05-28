import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderRepository } from '../repositories/order.repository';
import { AuditService } from '../../audit/services/audit.service';
import { OrderStatusChangedEvent } from '../../../shared/events/events';
import type { Order } from '../../../shared/database/schema';

type OrderStatus = Order['status'];

// Valid transitions per the state machine
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

    // Already paid — idempotent
    if (order.status === 'paid') return order;

    return this.transition(orderId, 'paid', orgId, 'system', 'stripe-webhook');
  }

  async markFailed(orderId: string, orgId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId, orgId);
    if (!order) throw new NotFoundException('Order not found');

    // Transition to cancelled on payment failure from pending
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
}
