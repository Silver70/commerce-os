import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../repositories/price-list.repository';
import { CustomerRepository } from '../../customer/repositories/customer.repository';
import { applyPercentage } from '../../../shared/utils/money.util';

export interface ResolveContext {
  orgId: string;
  storeId: string;
  customerId?: string | null;
}

export interface ResolvedPrice {
  unitPrice: number;
  appliedPriceListId: string | null;
}

/**
 * Resolves contract (price-list) unit prices for a set of variants.
 *
 * Pipeline position: sits *below* the discount engine. Resolved prices are
 * written into `cartItem.unitPrice`; discounts/coupons/tax then stack on top
 * with no changes to PricingEngineService.
 */
@Injectable()
export class PriceResolverService {
  constructor(
    private readonly priceListRepo: PriceListRepository,
    private readonly customerRepo: CustomerRepository,
  ) {}

  /**
   * For each variant, returns the effective unit price (price-list override or
   * base) plus which list applied. Everything is batched — one candidate-list
   * query and one fixed-price query for the whole variant set (no N+1).
   */
  async resolve(
    variantIds: string[],
    ctx: ResolveContext,
    basePrices: Map<string, number>,
  ): Promise<Map<string, ResolvedPrice>> {
    const result = new Map<string, ResolvedPrice>();
    for (const variantId of variantIds) {
      result.set(variantId, {
        unitPrice: basePrices.get(variantId) ?? 0,
        appliedPriceListId: null,
      });
    }

    // Guests (no customer) always get base pricing — there is no store-wide
    // list type in v1.
    if (!ctx.customerId || variantIds.length === 0) return result;

    const customer = await this.customerRepo.findById(
      ctx.customerId,
      ctx.orgId,
    );
    if (!customer) return result; // unknown customer → base
    const groupId = customer.groupId ?? null;

    const now = new Date();
    const candidates = await this.priceListRepo.findCandidateLists(
      ctx.orgId,
      ctx.storeId,
      ctx.customerId,
      groupId,
      now,
    );
    if (candidates.length === 0) return result;

    // Batch-load fixed prices for every fixed candidate × every variant.
    const fixedListIds = candidates
      .filter((c) => c.type === 'fixed')
      .map((c) => c.id);
    const fixedRows = await this.priceListRepo.findFixedPrices(
      fixedListIds,
      variantIds,
    );
    // priceListId → (variantId → price)
    const fixedMap = new Map<string, Map<string, number>>();
    for (const row of fixedRows) {
      let inner = fixedMap.get(row.priceListId);
      if (!inner) {
        inner = new Map();
        fixedMap.set(row.priceListId, inner);
      }
      inner.set(row.variantId, row.price);
    }

    for (const variantId of variantIds) {
      const base = basePrices.get(variantId) ?? 0;

      for (const list of candidates) {
        if (list.type === 'adjustment') {
          // adjustment lists cover every variant
          const bps = list.adjustmentBasisPoints ?? 0;
          const effective = Math.max(0, applyPercentage(base, 10000 + bps));
          result.set(variantId, {
            unitPrice: effective,
            appliedPriceListId: list.id,
          });
          break;
        }

        // fixed: covers the variant only if it has an explicit row
        const price = fixedMap.get(list.id)?.get(variantId);
        if (price !== undefined) {
          result.set(variantId, {
            unitPrice: price,
            appliedPriceListId: list.id,
          });
          break;
        }
        // not covered → fall through to next candidate
      }
    }

    return result;
  }
}
