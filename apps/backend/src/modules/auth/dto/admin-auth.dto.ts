import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class AdminRegisterDto {
  @ApiProperty({ example: 'owner@acme.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  declare email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  declare password: string;

  @ApiProperty({ required: false, description: 'Organization name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare orgName?: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'owner@acme.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  declare email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare password: string;
}

export class AdminRefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare refreshToken: string;
}
