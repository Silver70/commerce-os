import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  MaxLength,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShippingZoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country codes',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  declare countries: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}

export class UpdateShippingZoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare countries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}
