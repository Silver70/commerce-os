import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  declare password: string;
}
