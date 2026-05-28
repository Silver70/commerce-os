import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

export interface OrderAddressJson {
  firstName: string;
  lastName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  countryCode: string;
  phone?: string | null;
}

@ObjectType('OrderAddress')
export class OrderAddressType {
  @Field(() => String)
  declare firstName: string;

  @Field(() => String)
  declare lastName: string;

  @Field(() => String, { nullable: true })
  declare company: string | null;

  @Field(() => String)
  declare line1: string;

  @Field(() => String, { nullable: true })
  declare line2: string | null;

  @Field(() => String)
  declare city: string;

  @Field(() => String, { nullable: true })
  declare state: string | null;

  @Field(() => String)
  declare postalCode: string;

  @Field(() => String)
  declare countryCode: string;

  @Field(() => String, { nullable: true })
  declare phone: string | null;
}

@ObjectType('OrderLineItem')
export class OrderLineItemType {
  @Field(() => ID)
  declare id: string;

  @Field(() => String)
  declare productName: string;

  @Field(() => String, { nullable: true })
  declare variantName: string | null;

  @Field(() => String, { nullable: true })
  declare sku: string | null;

  @Field(() => String, { nullable: true })
  declare imageUrl: string | null;

  @Field(() => Int)
  declare quantity: number;

  @Field(() => Int)
  declare unitPrice: number;

  @Field(() => Int)
  declare totalPrice: number;

  @Field(() => Int)
  declare discountAmount: number;
}

@ObjectType('OrderTimelineEntry')
export class OrderTimelineEntryType {
  @Field(() => ID)
  declare id: string;

  @Field(() => String)
  declare eventType: string;

  @Field(() => String)
  declare message: string;

  @Field(() => String, { nullable: true })
  declare actorType: string | null;

  @Field(() => Date)
  declare createdAt: Date;
}

@ObjectType('Order')
export class OrderType {
  @Field(() => ID)
  declare id: string;

  @Field(() => String)
  declare orderNumber: string;

  @Field(() => String)
  declare status: string;

  @Field(() => String)
  declare fulfillmentStatus: string;

  @Field(() => Int)
  declare subtotal: number;

  @Field(() => Int)
  declare discountAmount: number;

  @Field(() => Int)
  declare taxAmount: number;

  @Field(() => Int)
  declare shippingAmount: number;

  @Field(() => Int)
  declare total: number;

  @Field(() => String)
  declare currency: string;

  @Field(() => String, { nullable: true })
  declare couponCode: string | null;

  @Field(() => OrderAddressType)
  declare shippingAddress: OrderAddressType;

  @Field(() => [OrderLineItemType])
  declare lineItems: OrderLineItemType[];

  @Field(() => Date)
  declare createdAt: Date;

  @Field(() => Date)
  declare updatedAt: Date;
}

@ObjectType('OrderPageInfo')
export class OrderPageInfoType {
  @Field(() => Boolean)
  declare hasNextPage: boolean;

  @Field(() => String, { nullable: true })
  declare endCursor: string | null;
}

@ObjectType('OrderEdge')
export class OrderEdgeType {
  @Field(() => String)
  declare cursor: string;

  @Field(() => OrderType)
  declare node: OrderType;
}

@ObjectType('OrderConnection')
export class OrderConnectionType {
  @Field(() => [OrderEdgeType])
  declare edges: OrderEdgeType[];

  @Field(() => OrderPageInfoType)
  declare pageInfo: OrderPageInfoType;
}
