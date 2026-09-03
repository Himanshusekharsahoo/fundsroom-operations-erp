import type { ApiError, AuthUser, CustomerOrder, InventoryRecord, Role, Transfer, WorkOrder } from './erp-types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'fundsroom_erp_token'
const USER_KEY = 'fundsroom_erp_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(USER_KEY)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function setCurrentUser(user: AuthUser | null) {
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }
}

export function apiLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    window.location.href = '/login'
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE}${endpoint}`
  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    throw {
      status: 500,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the backend server. Make sure the backend is running.',
    } satisfies ApiError
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      apiLogout()
    }

    const err: ApiError = {
      status: res.status as any,
      code: data?.error?.code || 'ERROR',
      message: data?.error?.message || 'An unexpected error occurred.',
    }
    throw err
  }

  return data.data !== undefined ? data.data : data
}

export async function apiLogin(credentials: { email: string; password: string }) {
  const res = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  })

  setToken(res.token)
  setCurrentUser(res.user)
  return res
}

export async function apiGetMe() {
  const res = await request<{ user: AuthUser }>('/api/auth/me')
  setCurrentUser(res.user)
  return res
}

export async function apiGetInventory() {
  return request<InventoryRecord[]>('/api/inventory')
}

export async function apiAddInventory(input: { inventoryId: string; quantity: number }) {
  return request<{ ok: boolean }>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiGetWorkOrders() {
  return request<WorkOrder[]>('/api/work-orders')
}

export async function apiCreateWorkOrder(input: { item: string; required: number; location?: string; assignedUser?: string }) {
  return request<{ id: string }>('/api/work-orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiStockCheck(workOrderId: string) {
  return request<{
    workOrderId: string
    item: string
    sku: string
    location: string
    required: number
    available: number
    shortage: number
    hasShortage: boolean
  }>(`/api/work-orders/${workOrderId}/stock-check`)
}

export async function apiGetTransfers() {
  return request<Transfer[]>('/api/transfers')
}

export async function apiDispatchTransfer(id: string) {
  return request<{ ok: boolean }>(`/api/transfers/${id}/dispatch`, {
    method: 'POST',
  })
}

export async function apiReceiveTransfer(id: string) {
  return request<{ ok: boolean }>(`/api/transfers/${id}/receive`, {
    method: 'POST',
  })
}

export async function apiGetOrders() {
  return request<CustomerOrder[]>('/api/orders')
}

export async function apiCreateOrder(input: { customer: string; item: string; requested: number }) {
  return request<{ id: string }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiReserveStock(input: { orderId: string; quantity?: number }) {
  return request<{ ok: boolean }>(`/api/orders/${input.orderId}/reserve`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiCancelOrder(orderId: string) {
  return request<{ ok: boolean }>(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}
