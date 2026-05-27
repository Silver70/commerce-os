import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ description: 'Variant UUID to add to the cart' })
  @IsUUID()
  declare variantId: string;

  @ApiProperty({ description: 'Quantity to add (minimum 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  declare quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity. Set to 0 to remove the item.' })
  @IsInt()
  @Min(0)
  declare quantity: number;
}
