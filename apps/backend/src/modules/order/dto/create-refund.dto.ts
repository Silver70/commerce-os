import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ description: 'Refund amount in cents', minimum: 1 })
  @IsInt()
  @Min(1)
  declare amount: number;

  @ApiPropertyOptional({ description: 'Human-readable reason for the refund' })
  @IsOptional()
  @IsString()
  declare reason?: string;
}
