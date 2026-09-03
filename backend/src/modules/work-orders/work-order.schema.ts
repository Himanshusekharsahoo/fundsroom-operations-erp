import { z } from 'zod'
import { WorkOrderStatus } from '@prisma/client'

export const createWorkOrderSchema = z.object({
  body: z.object({
    itemId: z.string().optional(),
    item: z.string().optional(),
    locationId: z.string().optional(),
    location: z.string().optional(),
    requiredQuantity: z.number().int().positive().optional(),
    required: z.number().int().positive().optional(),
    assignedUserId: z.string().optional(),
    assignedUser: z.string().optional(),
  }).refine((data) => data.itemId || data.item, {
    message: 'Either item or itemId is required',
  }).refine((data) => (data.requiredQuantity && data.requiredQuantity > 0) || (data.required && data.required > 0), {
    message: 'Required quantity must be a positive integer',
  }),
})

export const updateWorkOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(WorkOrderStatus),
  }),
})

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>['body']
export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>['body']
