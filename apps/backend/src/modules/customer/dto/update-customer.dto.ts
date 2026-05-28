import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare marketingOptIn?: boolean;
}

export class UpdateCustomerStatusDto {
  @ApiPropertyOptional({ enum: ['active', 'disabled'] })
  @IsEnum(['active', 'disabled'])
  declare status: 'active' | 'disabled';
}
