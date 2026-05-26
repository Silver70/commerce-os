import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare name?: string;

  @ApiProperty({ description: 'Price in cents' })
  @IsInt()
  @Min(0)
  declare price: number;

  @ApiPropertyOptional({ description: 'Compare-at price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Cost price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  declare weightUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare requiresShipping?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare position?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare optionValueIds?: string[];

  @ApiPropertyOptional({ description: 'Initial stock quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare initialStock?: number;
}
