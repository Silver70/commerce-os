import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerAuthService } from '../../auth/services/customer-auth.service';
import { CustomerRepository } from '../repositories/customer.repository';
import type { ListCustomersOptions } from '../repositories/customer.repository';
import type { Paginated } from '../../../shared/utils/pagination.util';
import { CustomerGroupRepository } from '../repositories/customer-group.repository';
import { OrderRepository } from '../../order/repositories/order.repository';
import {
  CustomerRegisteredEvent,
  CustomerCreatedByAdminEvent,
} from '../../../shared/events/events';
import type { Customer, Address } from '../../../shared/database/schema';
import type { RegisterCustomerDto } from '../dto/register-customer.dto';
import type {
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from '../dto/update-customer.dto';
import type {
  CreateCustomerDto,
  AdminUpdateCustomerDto,
} from '../dto/admin-customer.dto';
import type {
  CreateAddressDto,
  UpdateAddressDto,
} from '../dto/create-address.dto';

export type SafeCustomer = Omit<Customer, 'passwordHash'> & {
  ordersCount?: number;
  totalSpent?: number;
};

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  customer: SafeCustomer;
}

export interface CreatedCustomerResult {
  customer: SafeCustomer;
  setPasswordUrl: string;
}

export interface SetPasswordLinkResult {
  setPasswordUrl: string;
  expiresAt: Date;
}

function sanitize(customer: Customer): SafeCustomer {
  const { passwordHash: _passwordHash, ...safe } = customer;
  return safe;
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly customerGroupRepo: CustomerGroupRepository,
    private readonly customerAuth: CustomerAuthService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderRepo: OrderRepository,
  ) {}

  async register(
    dto: RegisterCustomerDto,
    orgId: string,
  ): Promise<AuthPayload> {
    const customer = await this.customerAuth.register(
      dto.email,
      dto.password,
      orgId,
    );

    if (dto.firstName || dto.lastName) {
      const updated = await this.customerRepo.update(customer.id, orgId, {
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
      });
      if (updated) {
        this.eventEmitter.emit(
          'customer.registered',
          new CustomerRegisteredEvent(updated.id, orgId, updated.email),
        );
        const { accessToken, refreshToken } = await this.customerAuth.login(
          dto.email,
          dto.password,
          orgId,
        );
        return { accessToken, refreshToken, customer: sanitize(updated) };
      }
    }

    this.eventEmitter.emit(
      'customer.registered',
      new CustomerRegisteredEvent(customer.id, orgId, customer.email),
    );

    const { accessToken, refreshToken } = await this.customerAuth.login(
      dto.email,
      dto.password,
      orgId,
    );
    return { accessToken, refreshToken, customer: sanitize(customer) };
  }

  async login(
    email: string,
    password: string,
    orgId: string,
  ): Promise<AuthPayload> {
    const result = await this.customerAuth.login(email, password, orgId);
    await this.customerRepo.update(result.customer.id, orgId, {
      lastLoginAt: new Date(),
    });
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customer: sanitize(result.customer),
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    const { customerId, organizationId } = this.customerAuth.verifyToken(token);
    const customer = await this.customerRepo.findById(
      customerId,
      organizationId,
    );
    if (!customer) throw new UnauthorizedException('Customer not found');
    if (customer.status === 'disabled') {
      throw new UnauthorizedException('Account is disabled');
    }
    const accessToken = this.customerAuth.issueAccessToken(
      customerId,
      organizationId,
    );
    return { accessToken };
  }

  async getProfile(customerId: string, orgId: string): Promise<SafeCustomer> {
    const customer = await this.customerRepo.findById(customerId, orgId);
    if (!customer) throw new NotFoundException('Customer not found');
    return sanitize(customer);
  }

  async updateProfile(
    customerId: string,
    orgId: string,
    dto: UpdateCustomerDto,
  ): Promise<SafeCustomer> {
    const customer = await this.customerRepo.findById(customerId, orgId);
    if (!customer) throw new NotFoundException('Customer not found');

    const updated = await this.customerRepo.update(customerId, orgId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      marketingOptIn: dto.marketingOptIn,
    });
    if (!updated)
      throw new NotFoundException('Customer not found after update');
    return sanitize(updated);
  }

  async updateStatus(
    customerId: string,
    orgId: string,
    dto: UpdateCustomerStatusDto,
  ): Promise<SafeCustomer> {
    const customer = await this.customerRepo.findById(customerId, orgId);
    if (!customer) throw new NotFoundException('Customer not found');

    const updated = await this.customerRepo.update(customerId, orgId, {
      status: dto.status,
    });
    if (!updated)
      throw new NotFoundException('Customer not found after update');
    return sanitize(updated);
  }

  async listCustomers(
    orgId: string,
    opts: ListCustomersOptions = {},
  ): Promise<Paginated<SafeCustomer>> {
    const page = await this.customerRepo.findAll(orgId, opts);
    // Stats are only fetched for the rows on this page, not the whole table.
    const stats = await this.orderRepo.getCustomerStats(
      orgId,
      page.items.map((c) => c.id),
    );
    const items = page.items.map((c) => {
      const stat = stats.get(c.id);
      return {
        ...sanitize(c),
        ordersCount: stat?.ordersCount ?? 0,
        totalSpent: stat?.totalSpent ?? 0,
      };
    });
    return { ...page, items };
  }

  // ─── Admin-managed accounts ─────────────────────────────────────────────────

  /**
   * Admin-creates a customer with no password, optionally assigns a group, and
   * returns a single-use set-password link for the admin to share manually.
   */
  async createCustomer(
    orgId: string,
    dto: CreateCustomerDto,
  ): Promise<CreatedCustomerResult> {
    if (dto.groupId) {
      await this.assertGroupExists(dto.groupId, orgId);
    }

    const created = await this.customerAuth.createByAdmin(dto.email, orgId);

    const updated = await this.customerRepo.update(created.id, orgId, {
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      phone: dto.phone ?? null,
      groupId: dto.groupId ?? null,
      marketingOptIn: dto.marketingOptIn ?? false,
    });
    const customer = updated ?? created;

    this.eventEmitter.emit(
      'customer.created_by_admin',
      new CustomerCreatedByAdminEvent(customer.id, orgId, customer.email),
    );

    const { token } = await this.customerAuth.createSetPasswordToken(
      customer.id,
      orgId,
    );

    return {
      customer: sanitize(customer),
      setPasswordUrl: this.buildSetPasswordUrl(token),
    };
  }

  async updateCustomer(
    customerId: string,
    orgId: string,
    dto: AdminUpdateCustomerDto,
  ): Promise<SafeCustomer> {
    const customer = await this.customerRepo.findById(customerId, orgId);
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.groupId) {
      await this.assertGroupExists(dto.groupId, orgId);
    }

    const patch: Parameters<CustomerRepository['update']>[2] = {};
    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.marketingOptIn !== undefined)
      patch.marketingOptIn = dto.marketingOptIn;
    if (dto.groupId !== undefined) patch.groupId = dto.groupId;

    if (Object.keys(patch).length === 0) return sanitize(customer);

    const updated = await this.customerRepo.update(customerId, orgId, patch);
    if (!updated)
      throw new NotFoundException('Customer not found after update');
    return sanitize(updated);
  }

  /** (Re)issue a set-password link for an existing customer. */
  async generateSetPasswordLink(
    customerId: string,
    orgId: string,
  ): Promise<SetPasswordLinkResult> {
    const customer = await this.customerRepo.findById(customerId, orgId);
    if (!customer) throw new NotFoundException('Customer not found');

    const { token, expiresAt } = await this.customerAuth.createSetPasswordToken(
      customerId,
      orgId,
    );
    return { setPasswordUrl: this.buildSetPasswordUrl(token), expiresAt };
  }

  private async assertGroupExists(
    groupId: string,
    orgId: string,
  ): Promise<void> {
    const group = await this.customerGroupRepo.findById(groupId, orgId);
    if (!group) throw new BadRequestException('Customer group not found');
  }

  private buildSetPasswordUrl(token: string): string {
    const base = this.config
      .get<string>('STOREFRONT_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
    return `${base}/auth/set-password?token=${token}`;
  }

  // ─── Addresses ────────────────────────────────────────────────────────────────

  async listAddresses(customerId: string, orgId: string): Promise<Address[]> {
    await this.getProfile(customerId, orgId);
    return this.customerRepo.findAddresses(customerId, orgId);
  }

  async addAddress(
    customerId: string,
    orgId: string,
    dto: CreateAddressDto,
  ): Promise<Address> {
    await this.getProfile(customerId, orgId);
    return this.customerRepo.createAddress(customerId, orgId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      company: dto.company,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      countryCode: dto.countryCode,
      phone: dto.phone,
      isDefault: dto.isDefault,
    });
  }

  async updateAddress(
    customerId: string,
    orgId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.customerRepo.findAddressById(
      addressId,
      customerId,
      orgId,
    );
    if (!address) throw new NotFoundException('Address not found');

    const updated = await this.customerRepo.updateAddress(
      addressId,
      customerId,
      orgId,
      {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.line1 !== undefined && { line1: dto.line1 }),
        ...(dto.line2 !== undefined && { line2: dto.line2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    );
    if (!updated) throw new NotFoundException('Address not found after update');
    return updated;
  }

  async deleteAddress(
    customerId: string,
    orgId: string,
    addressId: string,
  ): Promise<void> {
    const address = await this.customerRepo.findAddressById(
      addressId,
      customerId,
      orgId,
    );
    if (!address) throw new NotFoundException('Address not found');
    await this.customerRepo.deleteAddress(addressId, customerId, orgId);
  }
}
