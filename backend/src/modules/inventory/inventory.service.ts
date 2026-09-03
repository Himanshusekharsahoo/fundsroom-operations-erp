import { prisma } from '../../utils/prisma'
import { BadRequestError, NotFoundError } from '../../utils/errors'
import { AddInventoryInput, InventoryFilterQuery } from './inventory.schema'

export class InventoryService {
  private formatInventoryRecord(inv: any) {
    const physical = inv.physicalQuantity
    const reserved = inv.reservedQuantity
    const available = Math.max(0, physical - reserved)

    return {
      id: inv.id,
      sku: inv.item?.sku || '',
      item: inv.item?.name || '',
      location: inv.location?.name || '',
      category: inv.item?.category?.name || '',
      batch: inv.batch?.batchNumber || 'N/A',
      physical,
      reserved,
      unit: inv.item?.unit || 'units',
      physicalQuantity: physical,
      reservedQuantity: reserved,
      availableQuantity: available,
      itemId: inv.itemId,
      locationId: inv.locationId,
      batchId: inv.batchId,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }
  }

  async getAllInventory(query?: InventoryFilterQuery) {
    const where: any = {}

    if (query?.location && query.location !== 'All locations') {
      where.location = { name: query.location }
    }

    if (query?.category && query.category !== 'All categories') {
      where.item = {
        ...(where.item || {}),
        category: { name: query.category },
      }
    }

    if (query?.batch && query.batch !== 'All batches') {
      where.batch = { batchNumber: query.batch }
    }

    if (query?.search) {
      const search = query.search.toLowerCase()
      where.OR = [
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { sku: { contains: search, mode: 'insensitive' } } },
        { location: { name: { contains: search, mode: 'insensitive' } } },
        { item: { category: { name: { contains: search, mode: 'insensitive' } } } },
        { batch: { batchNumber: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const records = await prisma.inventory.findMany({
      where,
      include: {
        item: {
          include: {
            category: true,
          },
        },
        location: true,
        batch: true,
      },
      orderBy: { id: 'asc' },
    })

    return records.map((r) => this.formatInventoryRecord(r))
  }

  async getInventoryById(id: string) {
    const record = await prisma.inventory.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        location: true,
        batch: true,
      },
    })

    if (!record) {
      throw new NotFoundError(`Inventory record with ID ${id} was not found`, 'INVENTORY_NOT_FOUND')
    }

    return this.formatInventoryRecord(record)
  }

  async addInventory(input: AddInventoryInput) {
    if (input.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero', 'INVALID_QUANTITY')
    }

    return await prisma.$transaction(async (tx) => {
      let record

      if (input.inventoryId) {
        record = await tx.inventory.findUnique({
          where: { id: input.inventoryId },
          include: {
            item: { include: { category: true } },
            location: true,
            batch: true,
          },
        })

        if (!record) {
          throw new NotFoundError(
            `Inventory record ${input.inventoryId} not found`,
            'INVENTORY_NOT_FOUND'
          )
        }

        const newPhysical = record.physicalQuantity + input.quantity
        if (newPhysical < record.reservedQuantity) {
          throw new BadRequestError(
            'Physical quantity cannot be less than reserved quantity',
            'INVALID_QUANTITY'
          )
        }

        const updated = await tx.inventory.update({
          where: { id: input.inventoryId },
          data: { physicalQuantity: newPhysical },
          include: {
            item: { include: { category: true } },
            location: true,
            batch: true,
          },
        })

        return this.formatInventoryRecord(updated)
      } else if (input.itemId && input.locationId) {
        // Find existing or create
        const existing = await tx.inventory.findFirst({
          where: {
            itemId: input.itemId,
            locationId: input.locationId,
            batchId: input.batchId || null,
          },
          include: {
            item: { include: { category: true } },
            location: true,
            batch: true,
          },
        })

        if (existing) {
          const updated = await tx.inventory.update({
            where: { id: existing.id },
            data: { physicalQuantity: existing.physicalQuantity + input.quantity },
            include: {
              item: { include: { category: true } },
              location: true,
              batch: true,
            },
          })
          return this.formatInventoryRecord(updated)
        } else {
          const created = await tx.inventory.create({
            data: {
              itemId: input.itemId,
              locationId: input.locationId,
              batchId: input.batchId || null,
              physicalQuantity: input.quantity,
              reservedQuantity: 0,
            },
            include: {
              item: { include: { category: true } },
              location: true,
              batch: true,
            },
          })
          return this.formatInventoryRecord(created)
        }
      } else {
        throw new BadRequestError('Invalid input for inventory update', 'INVALID_INPUT')
      }
    })
  }

  async getItems() {
    return prisma.item.findMany({
      include: {
        category: true,
        batches: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async getLocations() {
    return prisma.location.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async getBatches() {
    return prisma.batch.findMany({
      include: {
        item: true,
      },
      orderBy: { batchNumber: 'asc' },
    })
  }
}

export const inventoryService = new InventoryService()
