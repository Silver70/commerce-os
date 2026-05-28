import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShippingMethodDto {
  @ApiProperty()
  @IsUUID()
  declare zoneId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional({ enum: ['flat_rate', 'free', 'calculated'] })
  @IsOptional()
  @IsEnum(['flat_rate', 'free', 'calculated'])
  declare rateType?: 'flat_rate' | 'free' | 'calculated';

  @ApiProperty({ description: 'Price in cents' })
  @IsInt()
  @Min(0)
  declare price: number;

  @ApiPropertyOptional({
    description: 'Minimum order amount in cents for eligibility',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare estimatedDaysMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare estimatedDaysMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}

export class UpdateShippingMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare name?: string;

  @ApiPropertyOptional({ enum: ['flat_rate', 'free', 'calculated'] })
  @IsOptional()
  @IsEnum(['flat_rate', 'free', 'calculated'])
  declare rateType?: 'flat_rate' | 'free' | 'calculated';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare estimatedDaysMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare estimatedDaysMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}
