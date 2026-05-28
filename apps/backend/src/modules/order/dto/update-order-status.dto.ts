import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ADMIN_SETTABLE_STATUSES = [
  'paid',
  'processing',
  'shipped',
  'delivered',
  'refunded',
  'cancelled',
] as const;

export type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ADMIN_SETTABLE_STATUSES })
  @IsEnum(ADMIN_SETTABLE_STATUSES)
  declare status: AdminSettableStatus;
}
