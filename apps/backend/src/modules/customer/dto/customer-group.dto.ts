import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;
}

export class UpdateCustomerGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;
}
