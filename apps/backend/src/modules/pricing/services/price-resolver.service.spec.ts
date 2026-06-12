import { PriceResolverService } from './price-resolver.service';
import type {
  PriceListRepository,
  CandidatePriceList,
} from '../repositories/price-list.repository';
import type { CustomerRepository } from '../../customer/repositories/customer.repository';
import type { Customer, PriceListPrice } from '../../../shared/database/schema';

const orgId = 'org-1';
const storeId = 'store-1';
const customerId = 'cust-1';
const groupId = 'group-1';

function makeCandidate(
  overrides: Partial<CandidatePriceList> = {},
): CandidatePriceList {
  return {
    id: 'list-1',
    organizationId: orgId,
    storeId,
    name: 'List',
    type: 'fixed',
    adjustmentBasisPoints: null,
    priority: 100,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tier: 'customer',
    ...overrides,
  };
}

function makeFixedPrice(
  priceListId: string,
  variantId: string,
  price: number,
): PriceListPrice {
  return {
    id: `${priceListId}-${variantId}`,
    organizationId: orgId,
    priceListId,
    variantId,
    price,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: customerId,
    organizationId: orgId,
    email: 'a@b.com',
    passwordHash: null,
    groupId,
    firstName: null,
    lastName: null,
    phone: null,
    status: 'active',
    emailVerified: false,
    marketingOptIn: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

interface Mocks {
  priceListRepo: jest.Mocked<
    Pick<PriceListRepository, 'findCandidateLists' | 'findFixedPrices'>
  >;
  customerRepo: jest.Mocked<Pick<CustomerRepository, 'findById'>>;
}

function build(
  candidates: CandidatePriceList[],
  fixedPrices: PriceListPrice[],
  customer: Customer | null = makeCustomer(),
): { service: PriceResolverService; mocks: Mocks } {
  const priceListRepo = {
    findCandidateLists: jest.fn().mockResolvedValue(candidates),
    findFixedPrices: jest.fn().mockResolvedValue(fixedPrices),
  };
  const customerRepo = {
    findById: jest.fn().mockResolvedValue(customer),
  };
  const service = new PriceResolverService(
    priceListRepo as unknown as PriceListRepository,
    customerRepo as unknown as CustomerRepository,
  );
  return { service, mocks: { priceListRepo, customerRepo } };
}

describe('PriceResolverService', () => {
  const ctx = { orgId, storeId, customerId };

  it('returns base prices for guests without touching the DB', async () => {
    const { service, mocks } = build([], []);
    const result = await service.resolve(
      ['v1'],
      { orgId, storeId, customerId: null },
      new Map([['v1', 1000]]),
    );
    expect(result.get('v1')).toEqual({
      unitPrice: 1000,
      appliedPriceListId: null,
    });
    expect(mocks.customerRepo.findById).not.toHaveBeenCalled();
    expect(mocks.priceListRepo.findCandidateLists).not.toHaveBeenCalled();
  });

  it('returns base prices for an unknown customer', async () => {
    const { service } = build([], [], null);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')?.unitPrice).toBe(1000);
    expect(result.get('v1')?.appliedPriceListId).toBeNull();
  });

  it('returns base prices when no candidate lists match', async () => {
    const { service } = build([], []);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')?.unitPrice).toBe(1000);
  });

  it('applies a fixed list price when the variant has a row', async () => {
    const list = makeCandidate({ id: 'list-1', type: 'fixed' });
    const { service } = build([list], [makeFixedPrice('list-1', 'v1', 700)]);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')).toEqual({
      unitPrice: 700,
      appliedPriceListId: 'list-1',
    });
  });

  it('applies a negative adjustment (percentage off base)', async () => {
    const list = makeCandidate({
      id: 'list-1',
      type: 'adjustment',
      adjustmentBasisPoints: -1500,
    });
    const { service } = build([list], []);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')).toEqual({
      unitPrice: 850,
      appliedPriceListId: 'list-1',
    });
  });

  it('applies a positive adjustment (markup over base)', async () => {
    const list = makeCandidate({
      id: 'list-1',
      type: 'adjustment',
      adjustmentBasisPoints: 2000,
    });
    const { service } = build([list], []);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')?.unitPrice).toBe(1200);
  });

  it('clamps adjustment results to >= 0', async () => {
    const list = makeCandidate({
      id: 'list-1',
      type: 'adjustment',
      adjustmentBasisPoints: -20000,
    });
    const { service } = build([list], []);
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')?.unitPrice).toBe(0);
  });

  it('falls through to the next candidate when a fixed list lacks the variant', async () => {
    const customerList = makeCandidate({
      id: 'cust-list',
      type: 'fixed',
      tier: 'customer',
    });
    const groupList = makeCandidate({
      id: 'group-list',
      type: 'fixed',
      tier: 'group',
    });
    // customer list has no row for v1; group list does
    const { service } = build(
      [customerList, groupList],
      [makeFixedPrice('group-list', 'v1', 600)],
    );
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')).toEqual({
      unitPrice: 600,
      appliedPriceListId: 'group-list',
    });
  });

  it('prefers the customer-tier list over the group-tier list', async () => {
    // repo returns candidates already ordered: customer tier first
    const customerList = makeCandidate({
      id: 'cust-list',
      type: 'fixed',
      tier: 'customer',
    });
    const groupList = makeCandidate({
      id: 'group-list',
      type: 'fixed',
      tier: 'group',
    });
    const { service } = build(
      [customerList, groupList],
      [
        makeFixedPrice('cust-list', 'v1', 500),
        makeFixedPrice('group-list', 'v1', 400),
      ],
    );
    const result = await service.resolve(['v1'], ctx, new Map([['v1', 1000]]));
    expect(result.get('v1')?.unitPrice).toBe(500);
    expect(result.get('v1')?.appliedPriceListId).toBe('cust-list');
  });

  it('resolves a batch of variants independently', async () => {
    const list = makeCandidate({ id: 'list-1', type: 'fixed' });
    // only v1 is covered; v2 falls back to base
    const { service } = build([list], [makeFixedPrice('list-1', 'v1', 700)]);
    const result = await service.resolve(
      ['v1', 'v2'],
      ctx,
      new Map([
        ['v1', 1000],
        ['v2', 2000],
      ]),
    );
    expect(result.get('v1')?.unitPrice).toBe(700);
    expect(result.get('v2')?.unitPrice).toBe(2000);
    expect(result.get('v2')?.appliedPriceListId).toBeNull();
  });
});
