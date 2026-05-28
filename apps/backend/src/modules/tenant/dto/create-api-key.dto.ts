import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Human-readable name for this API key' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  declare name: string;
}
