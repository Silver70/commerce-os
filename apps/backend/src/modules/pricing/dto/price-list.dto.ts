import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePriceListDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiProperty({ enum: ['fixed', 'adjustment'] })
  @IsEnum(['fixed', 'adjustment'])
  declare type: 'fixed' | 'adjustment';

  @ApiPropertyOptional({
    description:
      'Signed basis points, required when type=adjustment (e.g. -1500 = 15% off, 2000 = 20% markup)',
  })
  @IsOptional()
  @IsInt()
  declare adjustmentBasisPoints?: number;

  @ApiPropertyOptional({ description: 'Lower wins. Default 100.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare priority?: number;

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

export class UpdatePriceListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name?: string;

  @ApiPropertyOptional({ enum: ['fixed', 'adjustment'] })
  @IsOptional()
  @IsEnum(['fixed', 'adjustment'])
  declare type?: 'fixed' | 'adjustment';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  declare adjustmentBasisPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare priority?: number;

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

export class PriceListPriceEntryDto {
  @ApiProperty()
  @IsUUID()
  declare variantId: string;

  @ApiProperty({ description: 'Price in cents' })
  @IsInt()
  @Min(0)
  declare price: number;
}

export class SetPriceListPricesDto {
  @ApiProperty({ type: [PriceListPriceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListPriceEntryDto)
  declare prices: PriceListPriceEntryDto[];
}

export class CreateAssignmentDto {
  @ApiPropertyOptional({ description: 'Set exactly one of customerId/groupId' })
  @IsOptional()
  @IsUUID()
  declare customerId?: string;

  @ApiPropertyOptional({ description: 'Set exactly one of customerId/groupId' })
  @IsOptional()
  @IsUUID()
  declare groupId?: string;
}
