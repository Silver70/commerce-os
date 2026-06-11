import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CustomerGroupRepository } from '../repositories/customer-group.repository';
import type { CustomerGroup } from '../../../shared/database/schema';
import type {
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
} from '../dto/customer-group.dto';

@Injectable()
export class CustomerGroupService {
  constructor(private readonly groupRepo: CustomerGroupRepository) {}

  list(orgId: string): Promise<CustomerGroup[]> {
    return this.groupRepo.findAll(orgId);
  }

  async getById(id: string, orgId: string): Promise<CustomerGroup> {
    const group = await this.groupRepo.findById(id, orgId);
    if (!group) throw new NotFoundException('Customer group not found');
    return group;
  }

  async create(
    dto: CreateCustomerGroupDto,
    orgId: string,
  ): Promise<CustomerGroup> {
    if (await this.groupRepo.nameExists(dto.name, orgId)) {
      throw new ConflictException('A group with this name already exists');
    }
    return this.groupRepo.create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  async update(
    id: string,
    dto: UpdateCustomerGroupDto,
    orgId: string,
  ): Promise<CustomerGroup> {
    await this.getById(id, orgId);

    if (
      dto.name !== undefined &&
      (await this.groupRepo.nameExists(dto.name, orgId, id))
    ) {
      throw new ConflictException('A group with this name already exists');
    }

    const patch: Partial<Pick<CustomerGroup, 'name' | 'description'>> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined)
      patch.description = dto.description ?? null;

    if (Object.keys(patch).length === 0) {
      return this.getById(id, orgId);
    }

    const updated = await this.groupRepo.update(id, orgId, patch);
    if (!updated) throw new NotFoundException('Customer group not found');
    return updated;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.getById(id, orgId);
    await this.groupRepo.delete(id, orgId);
  }
}
