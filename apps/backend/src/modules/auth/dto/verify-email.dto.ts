import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// Both fields come from the verification link URL WorkOS emails the user.
// The frontend extracts them and POSTs here — the user never types these manually.
export class VerifyEmailDto {
  @ApiProperty({
    example: 'user_01ABC',
    description: 'Extracted from the verification link URL',
  })
  @IsString()
  declare userId: string;

  @ApiProperty({
    example: '123456',
    description: 'Extracted from the verification link URL',
  })
  @IsString()
  declare code: string;
}
