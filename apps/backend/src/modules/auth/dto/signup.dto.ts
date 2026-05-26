import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail() declare email: string;
  @IsString() @MinLength(8) declare password: string;
  @IsString() declare firstName: string;
  @IsString() declare lastName: string;
  @IsString() declare organizationName: string;
}
