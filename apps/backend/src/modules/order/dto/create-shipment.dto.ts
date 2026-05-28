import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiPropertyOptional({ description: 'Carrier name (e.g. UPS, FedEx)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Full tracking URL' })
  @IsOptional()
  @IsString()
  declare trackingUrl?: string;
}
