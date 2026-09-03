export type Role = 'ADMIN' | 'OPERATIONS_USER' | 'SALES_USER'
export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'
export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED'
export type MutationState = 'idle' | 'loading' | 'success' | 'error'

export type InventoryRecord = { id: string; sku: string; item: string; location: string; category: string; batch: string; physical: number; reserved: number; availableQuantity?: number; physicalQuantity?: number; reservedQuantity?: number; unit: string }
export type WorkOrder = { id: string; location: string; item: string; sku: string; required: number; assignedUser: string; status: WorkOrderStatus; available: number }
export type Transfer = { id: string; item: string; quantity: number; from: string; to: string; requestedBy: string; status: TransferStatus; workOrderId?: string }
export type CustomerOrder = { id: string; customer: string; item: string; requested: number; status: 'DRAFT' | 'RESERVED' | 'PENDING' | 'CANCELLED'; createdAt: string }
export type ApiError = { status: 400 | 401 | 403 | 404 | 409 | 500; code: string; message: string; field?: string }
export type AuthUser = { id: string; name: string; email: string; role: Role }

export const roleLabels: Record<Role, string> = { ADMIN: 'Administrator', OPERATIONS_USER: 'Operations', SALES_USER: 'Sales' }
export const roleAccess: Record<Role, string[]> = { ADMIN: ['dashboard', 'inventory', 'work-orders', 'transfers', 'orders'], OPERATIONS_USER: ['dashboard', 'inventory', 'work-orders', 'transfers'], SALES_USER: ['dashboard', 'orders'] }

export function availableQuantity(record: Pick<InventoryRecord, 'physical' | 'reserved'> & { availableQuantity?: number }) {
  if (typeof record.availableQuantity === 'number') {
    return record.availableQuantity
  }
  return Math.max(0, record.physical - record.reserved)
}
export function shortageQuantity(required: number, available: number) { return Math.max(0, required - available) }
