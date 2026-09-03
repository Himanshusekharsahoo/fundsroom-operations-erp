import { z } from 'zod'

export const createTransferSchema = z.object({
  body: z.object({
    itemId: z.string().optional(),
    item: z.string().optional(),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
    sourceLocationId: z.string().optional(),
    from: z.string().optional(),
    destinationLocationId: z.string().optional(),
    to: z.string().optional(),
    workOrderId: z.string().optional(),
  }).refine((data) => data.itemId || data.item, {
    message: 'Either itemId or item is required',
  }).refine((data) => (data.sourceLocationId || data.from) && (data.destinationLocationId || data.to), {
    message: 'Both source and destination locations are required',
  }),
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>['body']
