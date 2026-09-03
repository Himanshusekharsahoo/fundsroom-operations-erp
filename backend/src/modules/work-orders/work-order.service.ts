import { WorkOrderStatus } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { BadRequestError, NotFoundError } from '../../utils/errors'
import { CreateWorkOrderInput } from './work-order.schema'

export class WorkOrderService {
  private async calculateAvailableStock(itemId: string, locationId: string): Promise<number> {
    const inventories = await prisma.inventory.findMany({
      where: {
        itemId,
        locationId,
      },
    })

    const totalAvailable = inventories.reduce((sum, inv) => {
      const avail = Math.max(0, inv.physicalQuantity - inv.reservedQuantity)
      return sum + avail
    }, 0)

    return totalAvailable
  }

  private async formatWorkOrder(wo: any) {
    const available = await this.calculateAvailableStock(wo.itemId, wo.locationId)
    const shortage = Math.max(0, wo.requiredQuantity - available)

    return {
      id: wo.id,
      location: wo.location?.name || '',
      item: wo.item?.name || '',
      sku: wo.item?.sku || '',
      required: wo.requiredQuantity,
      requiredQuantity: wo.requiredQuantity,
      assignedUser: wo.assignedUser?.name || '',
      status: wo.status,
      available,
      shortage,
      hasShortage: shortage > 0,
      locationId: wo.locationId,
      itemId: wo.itemId,
      assignedUserId: wo.assignedUserId,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt,
    }
  }

  async getAllWorkOrders() {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        location: true,
        item: true,
        assignedUser: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(workOrders.map((wo) => this.formatWorkOrder(wo)))
  }

  async getWorkOrderById(id: string) {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        location: true,
        item: true,
        assignedUser: true,
      },
    })

    if (!wo) {
      throw new NotFoundError(`Work order ${id} not found`, 'WORK_ORDER_NOT_FOUND')
    }

    return this.formatWorkOrder(wo)
  }

  async createWorkOrder(input: CreateWorkOrderInput, creatorId: string) {
    const requiredQty = input.requiredQuantity || input.required
    if (!requiredQty || requiredQty <= 0) {
      throw new BadRequestError('Required quantity must be greater than zero', 'INVALID_QUANTITY')
    }

    // Resolve item
    let item
    if (input.itemId) {
      item = await prisma.item.findUnique({ where: { id: input.itemId } })
    } else if (input.item) {
      item = await prisma.item.findFirst({
        where: {
          OR: [
            { name: { equals: input.item, mode: 'insensitive' } },
            { sku: { equals: input.item, mode: 'insensitive' } },
          ],
        },
      })
    }

    if (!item) {
      throw new NotFoundError(`Item "${input.itemId || input.item}" not found`, 'ITEM_NOT_FOUND')
    }

    // Resolve location
    let location
    if (input.locationId) {
      location = await prisma.location.findUnique({ where: { id: input.locationId } })
    } else if (input.location) {
      location = await prisma.location.findFirst({
        where: { name: { equals: input.location, mode: 'insensitive' } },
      })
    } else {
      location = await prisma.location.findFirst()
    }

    if (!location) {
      throw new NotFoundError('Location not found', 'LOCATION_NOT_FOUND')
    }

    // Resolve assigned user
    let assignedUser
    if (input.assignedUserId) {
      assignedUser = await prisma.user.findUnique({ where: { id: input.assignedUserId } })
    } else if (input.assignedUser) {
      assignedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: input.assignedUser, mode: 'insensitive' } },
            { email: { equals: input.assignedUser, mode: 'insensitive' } },
          ],
        },
      })
    }

    if (!assignedUser) {
      assignedUser = await prisma.user.findUnique({ where: { id: creatorId } })
      if (!assignedUser) {
        assignedUser = await prisma.user.findFirst()
      }
    }

    if (!assignedUser) {
      throw new NotFoundError('No user available for assignment', 'USER_NOT_FOUND')
    }

    const woCount = await prisma.workOrder.count()
    const generatedId = `WO-${4822 + woCount}`

    const created = await prisma.workOrder.create({
      data: {
        id: generatedId,
        locationId: location.id,
        itemId: item.id,
        requiredQuantity: requiredQty,
        assignedUserId: assignedUser.id,
        status: WorkOrderStatus.ASSIGNED,
      },
      include: {
        location: true,
        item: true,
        assignedUser: true,
      },
    })

    return this.formatWorkOrder(created)
  }

  async updateStatus(id: string, status: WorkOrderStatus) {
    const existing = await prisma.workOrder.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundError(`Work order ${id} not found`, 'WORK_ORDER_NOT_FOUND')
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { status },
      include: {
        location: true,
        item: true,
        assignedUser: true,
      },
    })

    return this.formatWorkOrder(updated)
  }

  async stockCheck(id: string) {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        location: true,
        item: true,
      },
    })

    if (!wo) {
      throw new NotFoundError(`Work order ${id} not found`, 'WORK_ORDER_NOT_FOUND')
    }

    const available = await this.calculateAvailableStock(wo.itemId, wo.locationId)
    const required = wo.requiredQuantity
    const shortage = Math.max(0, required - available)

    return {
      workOrderId: wo.id,
      item: wo.item.name,
      sku: wo.item.sku,
      location: wo.location.name,
      required,
      available,
      shortage,
      hasShortage: shortage > 0,
    }
  }
}

export const workOrderService = new WorkOrderService()
