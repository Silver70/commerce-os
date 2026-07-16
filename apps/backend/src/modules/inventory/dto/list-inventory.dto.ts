import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListInventoryQueryDto {
  @ApiPropertyOptional({
    enum: ['low', 'out'],
    description: 'Stock bucket. Omit for all items.',
  })
  @IsOptional()
  @IsEnum(['low', 'out'])
  declare status?: 'low' | 'out';

  @ApiPropertyOptional({
    description: 'Free-text search across product name & variant SKU',
  })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  declare page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  declare limit?: number;
}
