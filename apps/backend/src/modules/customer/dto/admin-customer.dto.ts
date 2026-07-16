import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty()
  @IsEmail()
  declare email: string;

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

  @ApiPropertyOptional({ description: 'Customer group to assign on creation' })
  @IsOptional()
  @IsUUID()
  declare groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  declare marketingOptIn?: boolean;
}

export class AdminUpdateCustomerDto {
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

  // Pass null to remove the customer from their group; a UUID to (re)assign.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  declare groupId?: string | null;
}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'disabled'] })
  @IsOptional()
  @IsEnum(['active', 'disabled'])
  declare status?: 'active' | 'disabled';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  declare groupId?: string;

  @ApiPropertyOptional({
    description: 'Free-text search across email, first name & last name',
  })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  declare page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  declare limit?: number;
}
