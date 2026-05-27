import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiscountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiProperty({ enum: ['percentage', 'fixed_amount'] })
  @IsEnum(['percentage', 'fixed_amount'])
  declare type: 'percentage' | 'fixed_amount';

  @ApiProperty({
    description:
      'Basis points for percentage type (1000 = 10%), cents for fixed_amount',
  })
  @IsInt()
  @Min(0)
  declare value: number;

  @ApiProperty({ enum: ['product', 'category', 'order'] })
  @IsEnum(['product', 'category', 'order'])
  declare scope: 'product' | 'category' | 'order';

  @ApiPropertyOptional({
    description: 'Required when scope is product or category',
  })
  @IsOptional()
  @IsUUID()
  declare scopeId?: string;

  @ApiPropertyOptional({ description: 'Minimum order subtotal in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

  @ApiPropertyOptional()
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

export class UpdateDiscountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount'] })
  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount'])
  declare type?: 'percentage' | 'fixed_amount';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare value?: number;

  @ApiPropertyOptional({ enum: ['product', 'category', 'order'] })
  @IsOptional()
  @IsEnum(['product', 'category', 'order'])
  declare scope?: 'product' | 'category' | 'order';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  declare scopeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

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
