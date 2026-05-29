import { Resolver, Query, Args, ID, Int, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { StorefrontAuthGuard } from '../../auth/guards/storefront-auth.guard';
import { OrderService } from '../services/order.service';
import {
  OrderType,
  OrderConnectionType,
  OrderEdgeType,
  OrderPageInfoType,
  OrderAddressType,
  OrderLineItemType,
  OrderTimelineEntryType,
} from '../models/order.model';
import type { OrderAddressJson } from '../models/order.model';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import type { Request } from 'express';
import { encodeCursor } from '../../../shared/utils/pagination.util';

interface GqlContext {
  req: Request & { tenantContext?: TenantContext };
}

function mapAddress(raw: unknown): OrderAddressType {
  const addr = raw as OrderAddressJson;
  const result = new OrderAddressType();
  result.firstName = addr.firstName;
  result.lastName = addr.lastName;
  result.company = addr.company ?? null;
  result.line1 = addr.line1;
  result.line2 = addr.line2 ?? null;
  result.city = addr.city;
  result.state = addr.state ?? null;
  result.postalCode = addr.postalCode;
  result.countryCode = addr.countryCode;
  result.phone = addr.phone ?? null;
  return result;
}

function mapOrderToType(order: {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  shippingAddress: unknown;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    sku: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountAmount: number;
  }>;
}): OrderType {
  const result = new OrderType();
  result.id = order.id;
  result.orderNumber = order.orderNumber;
  result.status = order.status;
  result.fulfillmentStatus = order.fulfillmentStatus;
  result.subtotal = order.subtotal;
  result.discountAmount = order.discountAmount;
  result.taxAmount = order.taxAmount;
  result.shippingAmount = order.shippingAmount;
  result.total = order.total;
  result.currency = order.currency;
  result.couponCode = order.couponCode;
  result.shippingAddress = mapAddress(order.shippingAddress);
  result.lineItems = (order.lineItems ?? []).map((li) => {
    const lineItem = new OrderLineItemType();
    lineItem.id = li.id;
    lineItem.productName = li.productName;
    lineItem.variantName = li.variantName;
    lineItem.sku = li.sku;
    lineItem.imageUrl = li.imageUrl;
    lineItem.quantity = li.quantity;
    lineItem.unitPrice = li.unitPrice;
    lineItem.totalPrice = li.totalPrice;
    lineItem.discountAmount = li.discountAmount;
    return lineItem;
  });
  result.createdAt = order.createdAt;
  result.updatedAt = order.updatedAt;
  return result;
}

@Resolver(() => OrderType)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => OrderConnectionType, {
    description: "Get the current customer's paginated order history",
  })
  @UseGuards(StorefrontAuthGuard)
  async myOrders(
    @Context() ctx: GqlContext,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { type: () => String, nullable: true }) after?: string,
  ): Promise<OrderConnectionType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    const { organizationId, storeId } = requireStoreContext(tenant);

    const limit = first ?? 10;
    const result = await this.orderService.getOrdersByCustomer(
      tenant.customerId,
      organizationId,
      storeId,
      after,
      limit,
    );

    const edges: OrderEdgeType[] = result.orders.map((order) => {
      const edge = new OrderEdgeType();
      edge.cursor = encodeCursor({ createdAt: order.createdAt.toISOString() });
      edge.node = mapOrderToType(order);
      return edge;
    });

    const pageInfo = new OrderPageInfoType();
    pageInfo.hasNextPage = result.nextCursor !== null;
    pageInfo.endCursor = result.nextCursor;

    const connection = new OrderConnectionType();
    connection.edges = edges;
    connection.pageInfo = pageInfo;
    return connection;
  }

  @Query(() => OrderType, {
    description: "Get a specific order from the current customer's history",
  })
  @UseGuards(StorefrontAuthGuard)
  async myOrder(
    @Context() ctx: GqlContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<OrderType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    const { organizationId, storeId } = requireStoreContext(tenant);

    const detail = await this.orderService.getDetail(
      id,
      organizationId,
      storeId,
    );

    if (detail.customerId !== tenant.customerId) {
      throw new UnauthorizedException('Order does not belong to this customer');
    }

    const lineItems = detail.lineItems.map((li) => {
      const lineItem = new OrderLineItemType();
      lineItem.id = li.id;
      lineItem.productName = li.productName;
      lineItem.variantName = li.variantName ?? null;
      lineItem.sku = li.sku ?? null;
      lineItem.imageUrl = li.imageUrl ?? null;
      lineItem.quantity = li.quantity;
      lineItem.unitPrice = li.unitPrice;
      lineItem.totalPrice = li.totalPrice;
      lineItem.discountAmount = li.discountAmount;
      return lineItem;
    });

    // Include timeline entries as well (not exposed in OrderType but available for future extension)
    const _timeline: OrderTimelineEntryType[] = detail.timeline.map((t) => {
      const entry = new OrderTimelineEntryType();
      entry.id = t.id;
      entry.eventType = t.eventType;
      entry.message = t.message;
      entry.actorType = t.actorType ?? null;
      entry.createdAt = t.createdAt;
      return entry;
    });

    const orderType = mapOrderToType({
      ...detail,
      lineItems: detail.lineItems,
    });
    orderType.lineItems = lineItems;
    return orderType;
  }
}
