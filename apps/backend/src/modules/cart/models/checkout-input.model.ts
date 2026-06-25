import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEmail,
  ValidateNested,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class AddressGqlInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare firstName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare lastName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare company?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare line1: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare line2?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare city: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare state?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  declare postalCode: string;

  @Field(() => String, { description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;
}

@InputType()
export class CheckoutInput {
  @Field(() => ID, { nullable: true, description: 'Saved address UUID' })
  @IsOptional()
  @IsUUID()
  declare shippingAddressId?: string;

  @Field(() => AddressGqlInput, {
    nullable: true,
    description: 'Inline shipping address',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressGqlInput)
  declare shippingAddress?: AddressGqlInput;

  @Field(() => ID, { description: 'Shipping method UUID' })
  @IsUUID()
  declare shippingMethodId: string;

  @Field(() => String, {
    description:
      'Contact email for the order. Required — used for the order confirmation ' +
      'and the guest order-status lookup. Storefronts should pre-fill this from ' +
      "the logged-in customer's profile when available.",
  })
  @IsEmail()
  declare email: string;

  @Field(() => String, {
    nullable: true,
    description: 'Client-supplied idempotency key',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare idempotencyKey?: string;
}
