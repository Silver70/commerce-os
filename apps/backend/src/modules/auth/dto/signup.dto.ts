import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'supersecret123', minLength: 8 })
  @IsString()
  @MinLength(8)
  declare password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  declare firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  declare lastName: string;

  @ApiProperty({ example: 'Acme Store' })
  @IsString()
  declare organizationName: string;
}
