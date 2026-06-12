import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualOrderAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare company?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare line2?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare state?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  declare postalCode: string;

  @ApiProperty()
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;
}

export class ManualOrderLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare variantId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare productName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare variantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare sku?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  declare quantity: number;

  @ApiProperty({ description: 'Unit price in cents', minimum: 0 })
  @IsInt()
  @Min(0)
  declare unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsEmail()
  declare customerEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare customerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare customerId?: string;

  @ApiProperty({ type: [ManualOrderLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualOrderLineItemDto)
  declare items: ManualOrderLineItemDto[];

  @ApiProperty({ type: ManualOrderAddressDto })
  @ValidateNested()
  @Type(() => ManualOrderAddressDto)
  declare shippingAddress: ManualOrderAddressDto;

  @ApiPropertyOptional({ type: ManualOrderAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualOrderAddressDto)
  declare billingAddress?: ManualOrderAddressDto;

  @ApiProperty({
    enum: ['paid', 'invoice'],
    description: "'paid' captures immediately, 'invoice' leaves pending",
  })
  @IsEnum(['paid', 'invoice'])
  declare paymentType: 'paid' | 'invoice';

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  declare currency?: string;

  @ApiPropertyOptional({ description: 'Shipping cost in cents', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare shippingAmount?: number;

  @ApiPropertyOptional({ description: 'Discount amount in cents', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare discountAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount in cents', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare taxAmount?: number;

  @ApiPropertyOptional({ description: 'Coupon code applied to the order' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare notes?: string;
}
