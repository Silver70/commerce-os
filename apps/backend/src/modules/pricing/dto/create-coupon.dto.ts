import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: 'Unique coupon code (stored uppercased)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare code: string;

  @ApiProperty({ enum: ['percentage', 'fixed_amount', 'free_shipping'] })
  @IsEnum(['percentage', 'fixed_amount', 'free_shipping'])
  declare type: 'percentage' | 'fixed_amount' | 'free_shipping';

  @ApiPropertyOptional({
    description:
      'Basis points for percentage type, cents for fixed_amount, 0 for free_shipping',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare value?: number;

  @ApiPropertyOptional({ description: 'Minimum order subtotal in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Total usage limit across all customers',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  declare maxUsageCount?: number;

  @ApiPropertyOptional({ description: 'Per-customer usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  declare maxUsagePerCustomer?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  declare startsAt?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  declare endsAt?: string;
}

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare code?: string;

  @ApiPropertyOptional({
    enum: ['percentage', 'fixed_amount', 'free_shipping'],
  })
  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount', 'free_shipping'])
  declare type?: 'percentage' | 'fixed_amount' | 'free_shipping';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  declare maxUsageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  declare maxUsagePerCustomer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  declare startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  declare endsAt?: string;
}
