import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() declare email: string;
  @IsString() declare password: string;
  @IsOptional() @IsString() clientId?: string;
}
