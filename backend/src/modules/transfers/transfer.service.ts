import { TransferStatus } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors'
import { CreateTransferInput } from './transfer.schema'

export class TransferService {
  private formatTransfer(t: any) {
    return {
      id: t.id,
      itemId: t.itemId,
      item: t.item?.name || '',
      sku: t.item?.sku || '',
      quantity: t.quantity,
      sourceLocationId: t.sourceLocationId,
      sourceLocation: t.sourceLocation?.name || '',
      from: t.sourceLocation?.name || '',
      destinationLocationId: t.destinationLocationId,
      destinationLocation: t.destinationLocation?.name || '',
      to: t.destinationLocation?.name || '',
      requestedById: t.requestedById,
      requestedBy: t.requestedBy?.name || '',
      status: t.status,
      workOrderId: t.workOrderId || undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }
  }

  async getAllTransfers() {
    const transfers = await prisma.transfer.findMany({
      include: {
        item: true,
        sourceLocation: true,
        destinationLocation: true,
        requestedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return transfers.map((t) => this.formatTransfer(t))
  }

  async getTransferById(id: string) {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        item: true,
        sourceLocation: true,
        destinationLocation: true,
        requestedBy: true,
      },
    })

    if (!transfer) {
      throw new NotFoundError(`Transfer ${id} not found`, 'NOT_FOUND')
    }

    return this.formatTransfer(transfer)
  }

  async createTransfer(input: CreateTransferInput, requestedById: string) {
    // 1. Resolve item
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

    // 2. Resolve source location
    let sourceLoc
    if (input.sourceLocationId) {
      sourceLoc = await prisma.location.findUnique({ where: { id: input.sourceLocationId } })
    } else if (input.from) {
      sourceLoc = await prisma.location.findFirst({
        where: { name: { equals: input.from, mode: 'insensitive' } },
      })
    }

    if (!sourceLoc) {
      throw new NotFoundError('Source location not found', 'LOCATION_NOT_FOUND')
    }

    // 3. Resolve destination location
    let destLoc
    if (input.destinationLocationId) {
      destLoc = await prisma.location.findUnique({ where: { id: input.destinationLocationId } })
    } else if (input.to) {
      destLoc = await prisma.location.findFirst({
        where: { name: { equals: input.to, mode: 'insensitive' } },
      })
    }

    if (!destLoc) {
      throw new NotFoundError('Destination location not found', 'LOCATION_NOT_FOUND')
    }

    if (sourceLoc.id === destLoc.id) {
      throw new BadRequestError(
        'Source and destination locations must be different',
        'SAME_LOCATION_TRANSFER'
      )
    }

    const transferCount = await prisma.transfer.count()
    const generatedId = `TR-${2009 + transferCount}`

    // Note: Critical business rule: REQUESTED status does NOT mutate inventory
    const transfer = await prisma.transfer.create({
      data: {
        id: generatedId,
        sourceLocationId: sourceLoc.id,
        destinationLocationId: destLoc.id,
        itemId: item.id,
        quantity: input.quantity,
        requestedById,
        status: TransferStatus.REQUESTED,
        workOrderId: input.workOrderId || null,
      },
      include: {
        item: true,
        sourceLocation: true,
        destinationLocation: true,
        requestedBy: true,
      },
    })

    return this.formatTransfer(transfer)
  }

  async dispatchTransfer(id: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock/fetch transfer
      const transfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          item: true,
          sourceLocation: true,
          destinationLocation: true,
          requestedBy: true,
        },
      })

      if (!transfer) {
        throw new NotFoundError(`Transfer ${id} was not found`, 'NOT_FOUND')
      }

      if (transfer.status === TransferStatus.DISPATCHED) {
        throw new ConflictError('Transfer has already been dispatched', 'INVALID_TRANSFER_STATE')
      }

      if (transfer.status === TransferStatus.RECEIVED) {
        throw new ConflictError('Transfer has already been received', 'INVALID_TRANSFER_STATE')
      }

      if (transfer.status !== TransferStatus.REQUESTED) {
        throw new ConflictError('Only requested transfers can be dispatched', 'INVALID_TRANSFER_STATE')
      }

      // 2. Lock and check source inventory
      const sourceInventories = await tx.inventory.findMany({
        where: {
          itemId: transfer.itemId,
          locationId: transfer.sourceLocationId,
        },
        orderBy: { physicalQuantity: 'desc' },
      })

      const totalAvailable = sourceInventories.reduce((sum, inv) => {
        return sum + Math.max(0, inv.physicalQuantity - inv.reservedQuantity)
      }, 0)

      if (totalAvailable < transfer.quantity) {
        throw new ConflictError(
          `Insufficient available stock at source location (${transfer.sourceLocation.name}). Available: ${totalAvailable}, Requested: ${transfer.quantity}`,
          'INSUFFICIENT_AVAILABLE_STOCK'
        )
      }

      // 3. Deduct from source inventory
      let remainingToDeduct = transfer.quantity
      for (const inv of sourceInventories) {
        if (remainingToDeduct <= 0) break
        const availableInRecord = Math.max(0, inv.physicalQuantity - inv.reservedQuantity)
        if (availableInRecord <= 0) continue

        const deductAmount = Math.min(availableInRecord, remainingToDeduct)

        // Perform conditional update to prevent negative stock
        const updateResult = await tx.$executeRaw`
          UPDATE inventory
          SET "physicalQuantity" = "physicalQuantity" - ${deductAmount},
              "updatedAt" = NOW()
          WHERE id = ${inv.id}
            AND ("physicalQuantity" - "reservedQuantity") >= ${deductAmount}
            AND "physicalQuantity" >= ${deductAmount}
        `

        if (updateResult === 0) {
          throw new ConflictError(
            'Concurrent inventory modification prevented transfer dispatch',
            'INSUFFICIENT_AVAILABLE_STOCK'
          )
        }

        remainingToDeduct -= deductAmount
      }

      if (remainingToDeduct > 0) {
        throw new ConflictError(
          'Could not deduct required quantity from source inventory',
          'INSUFFICIENT_AVAILABLE_STOCK'
        )
      }

      // 4. Update transfer status to DISPATCHED
      // Destination inventory DOES NOT increase upon dispatch
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.DISPATCHED },
        include: {
          item: true,
          sourceLocation: true,
          destinationLocation: true,
          requestedBy: true,
        },
      })

      return this.formatTransfer(updatedTransfer)
    })
  }

  async receiveTransfer(id: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch transfer
      const transfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          item: true,
          sourceLocation: true,
          destinationLocation: true,
          requestedBy: true,
        },
      })

      if (!transfer) {
        throw new NotFoundError(`Transfer ${id} was not found`, 'NOT_FOUND')
      }

      if (transfer.status === TransferStatus.REQUESTED) {
        throw new ConflictError(
          'Transfer cannot be received before dispatch',
          'INVALID_TRANSFER_STATE'
        )
      }

      if (transfer.status === TransferStatus.RECEIVED) {
        throw new ConflictError(
          'Transfer has already been received',
          'INVALID_TRANSFER_STATE'
        )
      }

      if (transfer.status !== TransferStatus.DISPATCHED) {
        throw new ConflictError(
          'Only dispatched transfers can be received',
          'INVALID_TRANSFER_STATE'
        )
      }

      // 2. Increase destination inventory
      const destInventory = await tx.inventory.findFirst({
        where: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
        },
      })

      if (destInventory) {
        await tx.inventory.update({
          where: { id: destInventory.id },
          data: {
            physicalQuantity: destInventory.physicalQuantity + transfer.quantity,
          },
        })
      } else {
        await tx.inventory.create({
          data: {
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
            physicalQuantity: transfer.quantity,
            reservedQuantity: 0,
          },
        })
      }

      // 3. Mark transfer as RECEIVED
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.RECEIVED },
        include: {
          item: true,
          sourceLocation: true,
          destinationLocation: true,
          requestedBy: true,
        },
      })

      return this.formatTransfer(updatedTransfer)
    })
  }
}

export const transferService = new TransferService()
