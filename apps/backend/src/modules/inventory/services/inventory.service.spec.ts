import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import type { InventoryRepository } from '../repositories/inventory.repository';
import type { AuditService } from '../../audit/services/audit.service';
import type { InventoryItem } from '../../../shared/database/schema';

const orgId = 'org-1';
const storeId = 'store-1';

function makeInventoryItem(
  overrides: Partial<InventoryItem> = {},
): InventoryItem {
  return {
    id: 'inv-1',
    organizationId: orgId,
    storeId,
    variantId: 'variant-1',
    quantity: 10,
    reserved: 2,
    allowBackorder: false,
    lowStockThreshold: 5,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    organizationId: orgId,
    storeId,
    inventoryItemId: 'inv-1',
    variantId: 'variant-1',
    quantity: 2,
    cartId: 'cart-1',
    orderId: null,
    status: 'active' as const,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function buildService(
  repoMethods: Partial<Record<keyof InventoryRepository, jest.Mock>> = {},
) {
  const repo = {
    findByVariantId: jest.fn().mockResolvedValue(null),
    findReservation: jest.fn().mockResolvedValue(null),
    createReservation: jest.fn(),
    updateReservationStatus: jest.fn().mockResolvedValue(undefined),
    decrementReserved: jest.fn().mockResolvedValue(undefined),
    convertReservation: jest.fn().mockResolvedValue(undefined),
    adjustQuantity: jest.fn(),
    findActiveReservationsByOrder: jest.fn().mockResolvedValue([]),
    findStaleActiveReservations: jest.fn().mockResolvedValue([]),
    createForVariant: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findLowStock: jest.fn().mockResolvedValue([]),
    associateReservationsWithOrder: jest.fn().mockResolvedValue(undefined),
    ...repoMethods,
  } as unknown as InventoryRepository;

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;

  const eventEmitter = {
    emit: jest.fn(),
  };

  const service = new InventoryService(
    repo,
    auditService,
    eventEmitter as never,
  );
  return { service, repo, auditService, eventEmitter };
}

describe('InventoryService', () => {
  describe('checkAvailability', () => {
    it('returns false when inventory item is not found', async () => {
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(null),
      });
      const result = await service.checkAvailability('v1', 1, orgId, storeId);
      expect(result).toBe(false);
    });

    it('returns true when available stock covers requested quantity', async () => {
      const item = makeInventoryItem({ quantity: 10, reserved: 2 });
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
      });
      const result = await service.checkAvailability('v1', 7, orgId, storeId);
      expect(result).toBe(true);
    });

    it('returns false when available stock is insufficient', async () => {
      const item = makeInventoryItem({ quantity: 10, reserved: 2 });
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
      });
      const result = await service.checkAvailability('v1', 9, orgId, storeId);
      expect(result).toBe(false);
    });

    it('returns true for backorder item regardless of stock', async () => {
      const item = makeInventoryItem({
        quantity: 0,
        reserved: 0,
        allowBackorder: true,
      });
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
      });
      const result = await service.checkAvailability('v1', 100, orgId, storeId);
      expect(result).toBe(true);
    });
  });

  describe('reserve', () => {
    it('throws NotFoundException when inventory item is not found', async () => {
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(null),
      });
      await expect(service.reserve('v1', 1, orgId, storeId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      const item = makeInventoryItem({ quantity: 5, reserved: 4 });
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
      });
      await expect(service.reserve('v1', 2, orgId, storeId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a reservation when stock is sufficient', async () => {
      const item = makeInventoryItem({ quantity: 10, reserved: 2 });
      const res = makeReservation();
      const { service, repo } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
        createReservation: jest.fn().mockResolvedValue(res),
      });
      const result = await service.reserve('v1', 5, orgId, storeId, 'cart-1');
      expect(repo.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5, cartId: 'cart-1' }),
      );
      expect(result).toEqual(res);
    });
  });

  describe('release', () => {
    it('throws NotFoundException when reservation is not found', async () => {
      const { service } = buildService({
        findReservation: jest.fn().mockResolvedValue(null),
      });
      await expect(service.release('res-1', orgId, storeId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is idempotent for already-released reservation', async () => {
      const res = makeReservation({ status: 'released' });
      const { service, repo } = buildService({
        findReservation: jest.fn().mockResolvedValue(res),
      });
      await service.release('res-1', orgId, storeId);
      expect(repo.updateReservationStatus).not.toHaveBeenCalled();
    });

    it('decrements reserved quantity on successful release', async () => {
      const res = makeReservation({ quantity: 3, status: 'active' });
      const { service, repo } = buildService({
        findReservation: jest.fn().mockResolvedValue(res),
      });
      await service.release('res-1', orgId, storeId);
      expect(repo.updateReservationStatus).toHaveBeenCalledWith(
        'res-1',
        'released',
      );
      expect(repo.decrementReserved).toHaveBeenCalled();
    });
  });

  describe('convert', () => {
    it('decrements both quantity and reserved on successful convert', async () => {
      const res = makeReservation({ quantity: 2, status: 'active' });
      const { service, repo } = buildService({
        findReservation: jest.fn().mockResolvedValue(res),
      });
      await service.convert('res-1', orgId, storeId);
      expect(repo.updateReservationStatus).toHaveBeenCalledWith(
        'res-1',
        'converted',
      );
      expect(repo.convertReservation).toHaveBeenCalled();
    });
  });

  describe('adjust', () => {
    it('throws NotFoundException when inventory item is not found', async () => {
      const { service } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.adjust('v1', 5, 'restock', 'admin-1', orgId, storeId),
      ).rejects.toThrow(NotFoundException);
    });

    it('emits low_stock event when available stock falls below threshold', async () => {
      const item = makeInventoryItem({
        quantity: 10,
        reserved: 0,
        lowStockThreshold: 5,
      });
      const updated = { ...item, quantity: 4 };
      const { service, eventEmitter } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
        adjustQuantity: jest.fn().mockResolvedValue(updated),
      });
      await service.adjust('v1', -6, 'sold', 'admin-1', orgId, storeId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low',
        expect.anything(),
      );
    });

    it('does not emit low_stock event when stock is above threshold', async () => {
      const item = makeInventoryItem({
        quantity: 20,
        reserved: 0,
        lowStockThreshold: 5,
      });
      const updated = { ...item, quantity: 15 };
      const { service, eventEmitter } = buildService({
        findByVariantId: jest.fn().mockResolvedValue(item),
        adjustQuantity: jest.fn().mockResolvedValue(updated),
      });
      await service.adjust('v1', -5, 'sold', 'admin-1', orgId, storeId);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
