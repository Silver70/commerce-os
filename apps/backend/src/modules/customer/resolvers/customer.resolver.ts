import {
  Resolver,
  Mutation,
  Query,
  Args,
  ID,
  InputType,
  Field,
  Context,
} from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  Length,
} from 'class-validator';
import { StorefrontAuthGuard } from '../../auth/guards/storefront-auth.guard';
import { CustomerService } from '../services/customer.service';
import {
  CustomerType,
  AuthPayloadType,
  AddressType,
  RefreshTokenPayloadType,
} from '../models/customer.model';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { Request } from 'express';

interface GqlContext {
  req: Request & { tenantContext?: TenantContext };
}

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsEmail()
  declare email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  declare password: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare lastName?: string;
}

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsEmail()
  declare email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  declare password: string;
}

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare lastName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  declare marketingOptIn?: boolean;
}

@InputType()
export class AddressInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare firstName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare lastName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare company?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare line1: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare line2?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare city: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare state?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  declare postalCode: string;

  @Field(() => String)
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare phone?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}

@Resolver(() => CustomerType)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Mutation(() => AuthPayloadType, {
    description: 'Register a new storefront customer',
  })
  @UseGuards(StorefrontAuthGuard)
  async register(
    @Context() ctx: GqlContext,
    @Args('input') input: RegisterInput,
  ): Promise<AuthPayloadType> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    const result = await this.customerService.register(
      input,
      tenant.organizationId,
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customer: result.customer,
    };
  }

  @Mutation(() => AuthPayloadType, {
    description: 'Login as a storefront customer',
  })
  @UseGuards(StorefrontAuthGuard)
  async login(
    @Context() ctx: GqlContext,
    @Args('input') input: LoginInput,
  ): Promise<AuthPayloadType> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    const result = await this.customerService.login(
      input.email,
      input.password,
      tenant.organizationId,
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customer: result.customer,
    };
  }

  @Mutation(() => RefreshTokenPayloadType, {
    description: 'Refresh the customer access token',
  })
  @UseGuards(StorefrontAuthGuard)
  async refreshToken(
    @Args('token') token: string,
  ): Promise<RefreshTokenPayloadType> {
    return this.customerService.refreshToken(token);
  }

  @Query(() => CustomerType, {
    description: 'Get the current authenticated customer',
  })
  @UseGuards(StorefrontAuthGuard)
  async me(@Context() ctx: GqlContext): Promise<CustomerType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    return this.customerService.getProfile(
      tenant.customerId,
      tenant.organizationId,
    );
  }

  @Mutation(() => CustomerType, {
    description: 'Update the current customer profile',
  })
  @UseGuards(StorefrontAuthGuard)
  async updateProfile(
    @Context() ctx: GqlContext,
    @Args('input') input: UpdateProfileInput,
  ): Promise<CustomerType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    return this.customerService.updateProfile(
      tenant.customerId,
      tenant.organizationId,
      input,
    );
  }

  @Query(() => [AddressType], {
    description: 'List addresses for the current customer',
  })
  @UseGuards(StorefrontAuthGuard)
  async myAddresses(@Context() ctx: GqlContext): Promise<AddressType[]> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    return this.customerService.listAddresses(
      tenant.customerId,
      tenant.organizationId,
    );
  }

  @Mutation(() => AddressType, {
    description: 'Add an address for the current customer',
  })
  @UseGuards(StorefrontAuthGuard)
  async addAddress(
    @Context() ctx: GqlContext,
    @Args('input') input: AddressInput,
  ): Promise<AddressType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    return this.customerService.addAddress(
      tenant.customerId,
      tenant.organizationId,
      input,
    );
  }

  @Mutation(() => AddressType, { description: 'Update an address' })
  @UseGuards(StorefrontAuthGuard)
  async updateAddress(
    @Context() ctx: GqlContext,
    @Args('addressId', { type: () => ID }) addressId: string,
    @Args('input') input: AddressInput,
  ): Promise<AddressType> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    return this.customerService.updateAddress(
      tenant.customerId,
      tenant.organizationId,
      addressId,
      input,
    );
  }

  @Mutation(() => Boolean, { description: 'Delete an address' })
  @UseGuards(StorefrontAuthGuard)
  async deleteAddress(
    @Context() ctx: GqlContext,
    @Args('addressId', { type: () => ID }) addressId: string,
  ): Promise<boolean> {
    const tenant = ctx.req.tenantContext;
    if (!tenant?.customerId) {
      throw new UnauthorizedException('Customer authentication required');
    }
    await this.customerService.deleteAddress(
      tenant.customerId,
      tenant.organizationId,
      addressId,
    );
    return true;
  }
}
