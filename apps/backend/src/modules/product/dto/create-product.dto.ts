import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOptionValueDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare position?: number;
}

export class CreateProductOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare position?: number;

  @ApiPropertyOptional({ type: [CreateOptionValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionValueDto)
  declare values?: CreateOptionValueDto[];
}

export class VariantOptionValueRefDto {
  @ApiProperty({ description: 'Option name (e.g. "Color")' })
  @IsString()
  @IsNotEmpty()
  declare option: string;

  @ApiProperty({ description: 'Option value (e.g. "Black")' })
  @IsString()
  @IsNotEmpty()
  declare value: string;
}

export class CreateVariantInProductDto {
  @ApiPropertyOptional({ description: 'Auto-generated if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare sku?: string;

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
  @IsInt()
  @Min(0)
  declare position?: number;

  @ApiPropertyOptional({
    description: 'Option value IDs assigned to this variant',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare optionValueIds?: string[];

  @ApiPropertyOptional({
    description:
      'Option values for this variant by option name + value. Used when ' +
      'creating a product with its options and variants in one request, where ' +
      'the option-value IDs do not exist yet — resolved server-side to real IDs.',
    type: [VariantOptionValueRefDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantOptionValueRefDto)
  declare optionValues?: VariantOptionValueRefDto[];

  @ApiPropertyOptional({ description: 'Initial stock quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare initialStock?: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  declare status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare vendor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare seoDescription?: string;

  @ApiPropertyOptional({ type: [CreateProductOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  declare options?: CreateProductOptionDto[];

  @ApiPropertyOptional({ type: [CreateVariantInProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantInProductDto)
  declare variants?: CreateVariantInProductDto[];

  @ApiPropertyOptional({
    description: 'Category IDs to assign to this product',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare categoryIds?: string[];
}
