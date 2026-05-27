import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'user_01ABC' })
  @IsString()
  declare userId: string;
}
