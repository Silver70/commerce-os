import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class AddressType {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  declare customerId: string;

  @Field()
  declare firstName: string;

  @Field()
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

  @Field(() => Boolean)
  declare isDefault: boolean;

  @Field(() => Date)
  declare createdAt: Date;

  @Field(() => Date)
  declare updatedAt: Date;
}

@ObjectType()
export class CustomerType {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  declare organizationId: string;

  @Field(() => String)
  declare email: string;

  @Field(() => String, { nullable: true })
  declare firstName: string | null;

  @Field(() => String, { nullable: true })
  declare lastName: string | null;

  @Field(() => String, { nullable: true })
  declare phone: string | null;

  @Field(() => String)
  declare status: string;

  @Field(() => Boolean)
  declare emailVerified: boolean;

  @Field(() => Boolean)
  declare marketingOptIn: boolean;

  @Field(() => Date, { nullable: true })
  declare lastLoginAt: Date | null;

  @Field(() => Date)
  declare createdAt: Date;

  @Field(() => Date)
  declare updatedAt: Date;
}

@ObjectType()
export class AuthPayloadType {
  @Field()
  declare accessToken: string;

  @Field()
  declare refreshToken: string;

  @Field(() => CustomerType)
  declare customer: CustomerType;
}

@ObjectType()
export class RefreshTokenPayloadType {
  @Field()
  declare accessToken: string;
}
