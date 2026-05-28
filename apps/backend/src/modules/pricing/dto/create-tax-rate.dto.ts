import {
  IsString,
  Length,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateTaxRateDto {
  @ApiProperty({ example: 'California State Tax' })
  @IsString()
  @Length(1, 255)
  declare name: string;

  @ApiProperty({
    example: 'US',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiPropertyOptional({ example: 'CA', description: 'State/province code' })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  declare stateCode?: string;

  @ApiProperty({
    example: 725,
    description: 'Tax rate in basis points (725 = 7.25%)',
  })
  @IsInt()
  @Min(0)
  @Max(10000)
  declare rate: number;

  @ApiPropertyOptional({
    description: 'If true, tax is already included in the listed price',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  declare isInclusive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}
