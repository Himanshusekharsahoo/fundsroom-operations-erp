import { OrderStatus, ReservationStatus } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors'
import { CreateOrderInput, ReserveOrderInput } from './order.schema'

export class OrderService {
  private formatOrder(order: any) {
    const primaryItem = order.items?.[0]
    return {
      id: order.id,
      customer: order.customer,
      item: primaryItem?.item?.name || '',
      sku: primaryItem?.item?.sku || '',
      requested: primaryItem?.quantity || 0,
      status: order.status,
      createdById: order.createdById,
      createdBy: order.createdBy?.name || '',
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        itemId: item.itemId,
        item: item.item?.name || '',
        sku: item.item?.sku || '',
        quantity: item.quantity,
        inventoryId: item.inventoryId,
        reservationStatus: item.reservationStatus,
      })),
      createdAt: order.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      rawCreatedAt: order.createdAt,
      updatedAt: order.updatedAt,
    }
  }

  async getAllOrders() {
    const orders = await prisma.customerOrder.findMany({
      include: {
        createdBy: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return orders.map((o) => this.formatOrder(o))
  }

  async getOrderById(id: string) {
    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        createdBy: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundError(`Customer order ${id} not found`, 'NOT_FOUND')
    }

    return this.formatOrder(order)
  }

  async createOrder(input: CreateOrderInput, userId: string) {
    const requestedQty = input.requested || input.quantity
    if (!requestedQty || requestedQty <= 0) {
      throw new BadRequestError('Requested quantity must be greater than zero', 'INVALID_QUANTITY')
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

    // Check if there is an inventory record for this item to link
    const inventory = await prisma.inventory.findFirst({
      where: {
        itemId: item.id,
        ...(input.locationId ? { locationId: input.locationId } : {}),
      },
      orderBy: { physicalQuantity: 'desc' },
    })

    const orderCount = await prisma.customerOrder.count()
    const generatedId = `CO-${7731 + orderCount}`

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.create({
        data: {
          id: generatedId,
          customer: input.customer.trim(),
          createdById: userId,
          status: OrderStatus.PENDING,
        },
      })

      await tx.orderItem.create({
        data: {
          customerOrderId: order.id,
          itemId: item.id,
          inventoryId: inventory?.id || null,
          quantity: requestedQty,
          reservationStatus: ReservationStatus.PENDING,
        },
      })

      return tx.customerOrder.findUnique({
        where: { id: order.id },
        include: {
          createdBy: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      })
    })

    return this.formatOrder(newOrder)
  }

  /**
   * Concurrency-safe atomic stock reservation
   * Uses conditional UPDATE with row count verification to prevent race conditions.
   */
  async reserveStock(orderId: string, input?: ReserveOrderInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Find customer order and item
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          createdBy: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      })

      if (!order) {
        throw new NotFoundError(`Customer order ${orderId} not found`, 'NOT_FOUND')
      }

      if (order.status === OrderStatus.RESERVED) {
        throw new ConflictError('Order is already reserved', 'ORDER_ALREADY_RESERVED')
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictError('Cannot reserve stock for a cancelled order', 'ORDER_CANCELLED')
      }

      const orderItem = order.items[0]
      if (!orderItem) {
        throw new BadRequestError('Order has no items to reserve', 'EMPTY_ORDER')
      }

      const qtyToReserve = input?.quantity || orderItem.quantity
      if (qtyToReserve <= 0) {
        throw new BadRequestError('Quantity to reserve must be greater than zero', 'INVALID_QUANTITY')
      }

      // 2. Identify target inventory
      let targetInventoryId = input?.inventoryId || orderItem.inventoryId

      if (!targetInventoryId) {
        // Find an inventory record for this item that has sufficient available stock
        const candidate = await tx.inventory.findFirst({
          where: {
            itemId: orderItem.itemId,
          },
          orderBy: { physicalQuantity: 'desc' },
        })

        if (!candidate) {
          throw new ConflictError('Insufficient available stock.', 'INSUFFICIENT_AVAILABLE_STOCK')
        }
        targetInventoryId = candidate.id
      }

      // 3. ATOMIC CONDITIONAL UPDATE:
      // The WHERE clause checks: ("physicalQuantity" - "reservedQuantity") >= qtyToReserve
      // This is atomic at the Postgres row-lock level, making race conditions impossible!
      const affectedRows = await tx.$executeRaw`
        UPDATE inventory
        SET "reservedQuantity" = "reservedQuantity" + ${qtyToReserve},
            "updatedAt" = NOW()
        WHERE id = ${targetInventoryId}
          AND ("physicalQuantity" - "reservedQuantity") >= ${qtyToReserve}
      `

      if (affectedRows === 0) {
        throw new ConflictError('Insufficient available stock.', 'INSUFFICIENT_AVAILABLE_STOCK')
      }

      // 4. Update order and item status
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          inventoryId: targetInventoryId,
          reservationStatus: ReservationStatus.RESERVED,
        },
      })

      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: OrderStatus.RESERVED },
        include: {
          createdBy: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      })

      return this.formatOrder(updatedOrder)
    })
  }

  /**
   * Order cancellation with transactional reservation release
   */
  async cancelOrder(orderId: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          createdBy: true,
          items: true,
        },
      })

      if (!order) {
        throw new NotFoundError(`Customer order ${orderId} not found`, 'NOT_FOUND')
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictError('Order has already been cancelled', 'ORDER_ALREADY_CANCELLED')
      }

      // If order was reserved, release reserved quantity safely
      for (const item of order.items) {
        if (item.reservationStatus === ReservationStatus.RESERVED && item.inventoryId) {
          // Release reservation atomically and ensure reservedQuantity never drops below 0
          const affectedRows = await tx.$executeRaw`
            UPDATE inventory
            SET "reservedQuantity" = "reservedQuantity" - ${item.quantity},
                "updatedAt" = NOW()
            WHERE id = ${item.inventoryId}
              AND "reservedQuantity" >= ${item.quantity}
          `

          if (affectedRows === 0) {
            throw new ConflictError(
              'Failed to release inventory reservation due to data inconsistency',
              'RESERVATION_RELEASE_FAILED'
            )
          }

          await tx.orderItem.update({
            where: { id: item.id },
            data: { reservationStatus: ReservationStatus.RELEASED },
          })
        }
      }

      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          createdBy: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      })

      return this.formatOrder(updatedOrder)
    })
  }
}

export const orderService = new OrderService()
