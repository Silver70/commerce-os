import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEmail,
  ValidateNested,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare company?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare line2?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare state?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  declare postalCode: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;
}

export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'Saved address UUID to use as shipping address',
  })
  @IsOptional()
  @IsUUID()
  declare shippingAddressId?: string;

  @ApiPropertyOptional({
    description: 'Inline shipping address (alternative to shippingAddressId)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  declare shippingAddress?: AddressInputDto;

  @ApiProperty({ description: 'Shipping method UUID' })
  @IsUUID()
  declare shippingMethodId: string;

  @ApiPropertyOptional({ description: 'Email for guest checkout' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare idempotencyKey?: string;
}
