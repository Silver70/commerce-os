import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const ANALYTICS_EVENT_TYPES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'purchase',
] as const;

export type AnalyticsEventTypeDto = (typeof ANALYTICS_EVENT_TYPES)[number];

/** One tracked storefront event. All fields except type + sessionId optional. */
export class TrackEventDto {
  @IsEnum(ANALYTICS_EVENT_TYPES)
  declare type: AnalyticsEventTypeDto;

  /** Caller-managed visitor/session id — the unit of unique-visitor + funnel. */
  @IsString()
  @MaxLength(128)
  declare sessionId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmCampaign?: string;

  /** Client-side event time (ISO-8601). Defaults to ingest time when omitted. */
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

/** Batch envelope — send many events in one request to stay under rate limits. */
export class TrackEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  declare events: TrackEventDto[];
}
