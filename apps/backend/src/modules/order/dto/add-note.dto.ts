import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddNoteDto {
  @ApiProperty({ description: 'Note text to add to the order timeline' })
  @IsString()
  @IsNotEmpty()
  declare note: string;
}
