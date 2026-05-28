import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class CheckoutResultType {
  @Field(() => ID, { description: 'Created order ID' })
  declare orderId: string;

  @Field(() => String, { description: 'Order number (e.g. ORD-000001)' })
  declare orderNumber: string;

  @Field(() => String, { description: 'Stripe PaymentIntent client secret' })
  declare paymentClientSecret: string;

  @Field(() => Int, { description: 'Grand total charged in cents' })
  declare total: number;

  @Field(() => String, { description: 'ISO 4217 currency code' })
  declare currency: string;
}
