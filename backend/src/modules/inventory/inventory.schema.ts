import { z } from 'zod'

export const addInventorySchema = z.object({
  body: z.object({
    inventoryId: z.string().optional(),
    itemId: z.string().optional(),
    locationId: z.string().optional(),
    batchId: z.string().optional(),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
  }).refine((data) => data.inventoryId || (data.itemId && data.locationId), {
    message: 'Either inventoryId or both itemId and locationId are required',
  }),
})

export const inventoryFilterSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    location: z.string().optional(),
    category: z.string().optional(),
    batch: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
})

export type AddInventoryInput = z.infer<typeof addInventorySchema>['body']
export type InventoryFilterQuery = z.infer<typeof inventoryFilterSchema>['query']
