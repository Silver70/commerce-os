import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ShippingRateType {
  @Field(() => ID)
  declare methodId: string;

  @Field(() => String)
  declare name: string;

  @Field(() => Int, { description: 'Price in cents' })
  declare price: number;

  @Field(() => String)
  declare rateType: string;

  @Field(() => Int, { nullable: true })
  declare estimatedDaysMin: number | null;

  @Field(() => Int, { nullable: true })
  declare estimatedDaysMax: number | null;
}
