import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Compare-at price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Cost price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  weightUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresShipping?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionValueIds?: string[];
}
