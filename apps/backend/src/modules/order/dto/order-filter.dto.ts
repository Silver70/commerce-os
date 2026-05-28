import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'refunded',
  'cancelled',
] as const;

export class OrderFilterDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsEnum(ORDER_STATUSES)
  declare status?: (typeof ORDER_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare customerId?: string;

  @ApiPropertyOptional({
    description:
      'ISO date string — filter orders created on or after this date',
  })
  @IsOptional()
  @IsDateString()
  declare from?: string;

  @ApiPropertyOptional({
    description:
      'ISO date string — filter orders created on or before this date',
  })
  @IsOptional()
  @IsDateString()
  declare to?: string;

  @ApiPropertyOptional({
    description: 'Cursor for the next page (from previous response)',
  })
  @IsOptional()
  @IsString()
  declare cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  declare limit?: number;
}
