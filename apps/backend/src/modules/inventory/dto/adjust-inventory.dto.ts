import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Quantity adjustment (positive or negative)' })
  @IsInt()
  declare adjustment: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;

  @ApiPropertyOptional({ description: 'Reference (e.g. PO number)' })
  @IsOptional()
  @IsString()
  declare reference?: string;
}
