import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  declare password: string;

  @ApiPropertyOptional({ example: 'client_01ABC' })
  @IsOptional()
  @IsString()
  clientId?: string;
}
