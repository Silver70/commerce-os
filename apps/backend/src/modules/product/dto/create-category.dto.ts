import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  declare parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  declare position?: number;
}
