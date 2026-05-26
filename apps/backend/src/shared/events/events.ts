export class TenantCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

export class ProductCreatedEvent {
  constructor(
    public readonly productId: string,
    public readonly organizationId: string,
  ) {}
}

export class ProductUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly organizationId: string,
  ) {}
}

export class ProductDeletedEvent {
  constructor(
    public readonly productId: string,
    public readonly organizationId: string,
  ) {}
}

export class InventoryLowEvent {
  constructor(
    public readonly variantId: string,
    public readonly organizationId: string,
    public readonly currentQuantity: number,
    public readonly threshold: number,
  ) {}
}

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly organizationId: string,
    public readonly customerId: string | null,
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly organizationId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {}
}

export class PaymentSucceededEvent {
  constructor(
    public readonly orderId: string,
    public readonly organizationId: string,
    public readonly paymentIntentId: string,
    public readonly amount: number,
  ) {}
}

export class PaymentFailedEvent {
  constructor(
    public readonly orderId: string,
    public readonly organizationId: string,
    public readonly paymentIntentId: string,
    public readonly reason: string,
  ) {}
}

export class RefundIssuedEvent {
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly organizationId: string,
    public readonly amount: number,
  ) {}
}

export class CartAbandonedEvent {
  constructor(
    public readonly cartId: string,
    public readonly organizationId: string,
    public readonly customerId: string | null,
  ) {}
}

export class CustomerRegisteredEvent {
  constructor(
    public readonly customerId: string,
    public readonly organizationId: string,
    public readonly email: string,
  ) {}
}
