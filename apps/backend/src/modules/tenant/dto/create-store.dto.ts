import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({ description: 'Display name of the store' })
  @IsString()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional({
    description:
      'URL-safe slug, unique within the organization. Auto-generated if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase, alphanumeric, with optional hyphen separators',
  })
  @MaxLength(255)
  declare slug?: string;

  @ApiPropertyOptional({
    description: 'ISO-4217 currency code',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  declare currency?: string;

  @ApiPropertyOptional({ description: 'IANA timezone string', default: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare timezone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
