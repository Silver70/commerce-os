import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'Category IDs — replaces current assignments',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
