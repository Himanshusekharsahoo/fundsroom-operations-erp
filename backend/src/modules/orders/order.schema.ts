import { z } from 'zod'

export const createOrderSchema = z.object({
  body: z.object({
    customer: z.string().min(1, 'Customer name is required'),
    item: z.string().optional(),
    itemId: z.string().optional(),
    requested: z.number().int('Requested quantity must be an integer').positive('Requested quantity must be positive').optional(),
    quantity: z.number().int().positive().optional(),
    locationId: z.string().optional(),
  }).refine((data) => data.item || data.itemId, {
    message: 'Either item or itemId is required',
  }).refine((data) => (data.requested && data.requested > 0) || (data.quantity && data.quantity > 0), {
    message: 'Requested quantity must be positive',
  }),
})

export const reserveOrderSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive().optional(),
    orderId: z.string().optional(),
    inventoryId: z.string().optional(),
  }),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body']
export type ReserveOrderInput = z.infer<typeof reserveOrderSchema>['body']
