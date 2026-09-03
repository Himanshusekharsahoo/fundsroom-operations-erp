'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ChevronDown, Plus, RefreshCw, Search, Truck, Warehouse } from 'lucide-react'
import { ErpShell } from './erp-shell'
import {
  apiAddInventory,
  apiCancelOrder,
  apiCreateOrder,
  apiCreateWorkOrder,
  apiDispatchTransfer,
  apiGetInventory,
  apiGetOrders,
  apiGetTransfers,
  apiGetWorkOrders,
  apiReceiveTransfer,
  apiReserveStock,
  apiStockCheck,
  getCurrentUser,
  getToken,
} from '@/lib/erp-api'
import { availableQuantity, shortageQuantity, type CustomerOrder, type InventoryRecord, type Role, type Transfer, type WorkOrder } from '@/lib/erp-types'
import { Button } from '@/components/ui/button'

type View = 'overview' | 'inventory' | 'work-orders' | 'transfers' | 'orders'
const errorText = (error: any) => error?.message ?? 'The request could not be completed.'

function Status({ children }: { children: string }) {
  return <span className={`status status-${children.toLowerCase().replace('_', '-')}`}>{children.replace('_', ' ')}</span>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  )
}

function PageIntro({ title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="intro">
      <div>
        <h2>{title}</h2>
        <p className="description">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Feedback({ state, message }: { state: string; message?: string }) {
  if (state === 'idle') return null
  return (
    <div className={`feedback feedback-${state}`} role="status">
      {state === 'loading' ? (
        'Working…'
      ) : state === 'success' ? (
        <>
          <Check className="size-4" />
          {message ?? 'Saved successfully.'}
        </>
      ) : (
        <>
          <AlertTriangle className="size-4" />
          {message}
        </>
      )}
    </div>
  )
}

export function ErpApp({ view, role = 'ADMIN' as Role }: { view: View; role?: Role }) {
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mutation, setMutation] = useState({ state: 'idle', message: '' })
  const [selected, setSelected] = useState<WorkOrder | null>(null)
  const [userRole, setUserRole] = useState<Role>(role)

  const fetchData = async () => {
    try {
      const [i, w, t, o] = await Promise.all([
        apiGetInventory().catch(() => []),
        apiGetWorkOrders().catch(() => []),
        apiGetTransfers().catch(() => []),
        apiGetOrders().catch(() => []),
      ])
      setInventory(i)
      setWorkOrders(w)
      setTransfers(t)
      setOrders(o)
    } catch (e) {
      console.error('Error fetching ERP data:', e)
    }
  }

  useEffect(() => {
    if (!getToken() && typeof window !== 'undefined') {
      window.location.href = '/login'
      return
    }

    const currentUser = getCurrentUser()
    if (currentUser?.role) {
      setUserRole(currentUser.role)
    }

    fetchData().finally(() => setLoading(false))
  }, [])

  const run = async (fn: () => Promise<any>, success: string) => {
    setMutation({ state: 'loading', message: '' })
    try {
      await fn()
      await fetchData()
      setMutation({ state: 'success', message: success })
    } catch (e) {
      await fetchData()
      setMutation({ state: 'error', message: errorText(e) })
    }
  }

  const effectiveRole = userRole || role

  if (loading) {
    return (
      <ErpShell role={effectiveRole}>
        <div className="loading-grid">
          <div className="skeleton wide" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton table" />
        </div>
      </ErpShell>
    )
  }

  const availableTotal = inventory.reduce((sum, item) => sum + availableQuantity(item), 0)
  const reservedTotal = inventory.reduce((sum, item) => sum + item.reserved, 0)

  return (
    <ErpShell role={effectiveRole}>
      {view === 'overview' && (
        <OverviewView inventory={inventory} workOrders={workOrders} transfers={transfers} orders={orders} />
      )}
      {view === 'inventory' && (
        <>
          <PageIntro
            eyebrow="Stock control"
            title="Inventory"
            description="Monitor physical, reserved, and available quantities across every operating location."
            action={effectiveRole === 'ADMIN' || effectiveRole === 'OPERATIONS_USER' ? <AddInventory run={run} inventory={inventory} mutation={mutation} /> : null}
          />
          <Feedback state={mutation.state} message={mutation.message} />
          <div className="metrics">
            <Metric label="Total items" value={inventory.length.toString()} detail="Tracked SKUs" />
            <Metric
              label="Physical quantity"
              value={inventory.reduce((sum, item) => sum + item.physical, 0).toLocaleString()}
              detail="On hand across locations"
            />
            <Metric label="Reserved quantity" value={reservedTotal.toLocaleString()} detail="Committed to orders" />
            <Metric label="Available quantity" value={availableTotal.toLocaleString()} detail="Physical less reserved" />
          </div>
          <InventoryTable inventory={inventory} />
        </>
      )}
      {view === 'work-orders' && (
        <>
          <PageIntro
            eyebrow="Production flow"
            title="Work Orders"
            description="Track material requirements and resolve shortages before they stop production."
            action={effectiveRole === 'ADMIN' ? <CreateWorkOrder run={run} mutation={mutation} /> : null}
          />
          <Feedback state={mutation.state} message={mutation.message} />
          <div className="table-card">
            <div className="table-head">
              <div>
                <h3>Active work orders</h3>
                <p>Open a work order to inspect material availability.</p>
              </div>
              <button className="icon-button" onClick={() => fetchData()} aria-label="Refresh work orders">
                <RefreshCw className="size-4" />
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Work order</th>
                    <th>Item</th>
                    <th>Location</th>
                    <th>Required</th>
                    <th>Available</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="strong">{order.id}</td>
                      <td>
                        {order.item}
                        <small>{order.sku}</small>
                      </td>
                      <td>{order.location}</td>
                      <td>{order.required}</td>
                      <td className={shortageQuantity(order.required, order.available) ? 'danger-text' : ''}>
                        {order.available}
                      </td>
                      <td>
                        <Status>{order.status}</Status>
                      </td>
                      <td>
                        <button className="text-button" onClick={() => setSelected(order)}>
                          Stock check <ArrowRight className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {selected && <StockCheck order={selected} onClose={() => setSelected(null)} />}
        </>
      )}
      {view === 'transfers' && <TransferView transfers={transfers} run={run} mutation={mutation} role={effectiveRole} />}
      {view === 'orders' && <OrdersView orders={orders} inventory={inventory} run={run} mutation={mutation} role={effectiveRole} />}
    </ErpShell>
  )
}

function OverviewView({
  inventory,
  workOrders,
  transfers,
  orders,
}: {
  inventory: InventoryRecord[]
  workOrders: WorkOrder[]
  transfers: Transfer[]
  orders: CustomerOrder[]
}) {
  const physical = inventory.reduce((sum, item) => sum + item.physical, 0)
  const available = inventory.reduce((sum, item) => sum + availableQuantity(item), 0)
  const lowStock = inventory.filter((item) => availableQuantity(item) < 30)

  return (
    <>
      <PageIntro
        eyebrow="Operations at a glance"
        title="Overview"
        description="A concise view of inventory, production, movement, and reservations."
      />
      <div className="metrics">
        <Metric label="Total inventory" value={physical.toLocaleString()} detail="Physical units on hand" />
        <Metric label="Available stock" value={available.toLocaleString()} detail="Ready to allocate" />
        <Metric
          label="Active work orders"
          value={workOrders.filter((item) => item.status !== 'COMPLETED').length.toString()}
          detail="Assigned or in progress"
        />
        <Metric
          label="Pending transfers"
          value={transfers.filter((item) => item.status !== 'RECEIVED').length.toString()}
          detail="Awaiting dispatch or receipt"
        />
        <Metric
          label="Orders awaiting reservation"
          value={orders.filter((item) => item.status === 'PENDING').length.toString()}
          detail="Need stock confirmation"
        />
      </div>
      <div className="overview-grid">
        <div className="table-card">
          <div className="table-head">
            <div>
              <h3>Recent work orders</h3>
              <p>Production requirements needing attention.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Work order</th>
                  <th>Item</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.slice(0, 4).map((order) => (
                  <tr key={order.id}>
                    <td className="strong">{order.id}</td>
                    <td>{order.item}</td>
                    <td>
                      <Status>{order.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="table-card">
          <div className="table-head">
            <div>
              <h3>Recent transfers</h3>
              <p>Material moving across locations.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Transfer</th>
                  <th>Route</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 4).map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="strong">{transfer.id}</td>
                    <td>
                      {transfer.from} → {transfer.to}
                    </td>
                    <td>
                      <Status>{transfer.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="table-card">
          <div className="table-head">
            <div>
              <h3>Customer orders</h3>
              <p>Reservation queue.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 4).map((order) => (
                  <tr key={order.id}>
                    <td className="strong">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>
                      <Status>{order.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="alert-card">
          <p className="eyebrow">Low / short inventory alerts</p>
          <h3>{lowStock.length ? `${lowStock.length} items need attention` : 'Inventory is in good shape'}</h3>
          {lowStock.map((item) => (
            <p key={item.id}>
              <b>{item.item}</b> · {availableQuantity(item)} {item.unit} available
            </p>
          ))}
        </div>
      </div>
    </>
  )
}

function InventoryTable({ inventory }: { inventory: InventoryRecord[] }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('All locations')
  const [category, setCategory] = useState('All categories')
  const [batch, setBatch] = useState('All batches')
  const locations = [...new Set(inventory.map((i) => i.location))]
  const categories = [...new Set(inventory.map((i) => i.category))]
  const batches = [...new Set(inventory.map((i) => i.batch))]

  const filtered = inventory.filter(
    (i) =>
      `${i.item}${i.sku}${i.location}${i.category}${i.batch}`.toLowerCase().includes(query.toLowerCase()) &&
      (location === 'All locations' || i.location === location) &&
      (category === 'All categories' || i.category === category) &&
      (batch === 'All batches' || i.batch === batch)
  )

  const reset = () => {
    setQuery('')
    setLocation('All locations')
    setCategory('All categories')
    setBatch('All batches')
  }

  return (
    <div className="table-card">
      <div className="table-head">
        <div>
          <h3>All inventory</h3>
          <p>Quantity values are returned by the inventory API.</p>
        </div>
        <div className="inventory-toolbar">
          <label className="search">
            <Search className="size-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inventory"
              aria-label="Search inventory"
            />
          </label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Filter by location">
            <option>All locations</option>
            {locations.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option>All categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter by batch">
            <option>All batches</option>
            {batches.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button className="text-button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Location</th>
              <th>Batch</th>
              <th>Physical quantity</th>
              <th>Reserved quantity</th>
              <th>Available quantity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="strong">
                  {item.item}
                  <small>{item.sku}</small>
                </td>
                <td>{item.location}</td>
                <td>{item.batch && item.batch !== 'N/A' ? item.batch : '—'}</td>
                <td>
                  {item.physical} {item.unit}
                </td>
                <td>
                  {item.reserved} {item.unit}
                </td>
                <td className="available-cell">
                  {availableQuantity(item)} {item.unit}
                </td>
                <td>
                  <button className="icon-button" aria-label={`View ${item.item}`}>
                    <ChevronDown className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddInventory({ run, inventory, mutation }: any) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(inventory[0]?.id)
  const [qty, setQty] = useState('')

  useEffect(() => {
    if (!id && inventory.length > 0) {
      setId(inventory[0].id)
    }
  }, [inventory, id])

  const isLoading = mutation?.state === 'loading'

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Add inventory
      </Button>
      {open && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-inventory-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Stock control</p>
                <h3 id="add-inventory-title">Add inventory</h3>
              </div>
              <button onClick={() => setOpen(false)} className="icon-button" aria-label="Close add inventory">
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                Item
                <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Inventory item">
                  {inventory.map((i: InventoryRecord) => (
                    <option key={i.id} value={i.id}>
                      {i.item} · {i.sku} ({i.location})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter positive quantity"
                  aria-label="Quantity"
                />
              </label>
            </div>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                disabled={!qty || Number(qty) <= 0 || isLoading}
                onClick={async () => {
                  await run(() => apiAddInventory({ inventoryId: id, quantity: Number(qty) }), 'Inventory adjustment submitted.')
                  setOpen(false)
                  setQty('')
                }}
              >
                {isLoading ? 'Adding…' : 'Add inventory'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function CreateWorkOrder({ run, mutation }: any) {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState('Servo Motor Assembly')
  const [location, setLocation] = useState('Austin Hub')
  const [assignedUser, setAssignedUser] = useState('Jordan Lee')
  const [qty, setQty] = useState('')

  const isLoading = mutation?.state === 'loading'

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Create work order
      </Button>
      {open && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-work-order-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Production flow</p>
                <h3 id="create-work-order-title">Create work order</h3>
              </div>
              <button onClick={() => setOpen(false)} className="icon-button" aria-label="Close create work order">
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                Item
                <input value={item} onChange={(e) => setItem(e.target.value)} />
              </label>
              <label>
                Location
                <select value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option>Austin Hub</option>
                  <option>Reno Depot</option>
                </select>
              </label>
              <label>
                Required quantity
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter quantity"
                />
              </label>
              <label>
                Assigned user
                <input value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)} />
              </label>
            </div>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                disabled={!item || !qty || Number(qty) <= 0 || isLoading}
                onClick={async () => {
                  await run(
                    () =>
                      apiCreateWorkOrder({
                        item,
                        required: Number(qty),
                        location,
                        assignedUser,
                      }),
                    'Work order created.'
                  )
                  setOpen(false)
                  setQty('')
                }}
              >
                {isLoading ? 'Creating…' : 'Create work order'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function StockCheck({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  const [checkResult, setCheckResult] = useState<{
    required: number
    available: number
    shortage: number
    hasShortage: boolean
  } | null>(null)

  useEffect(() => {
    apiStockCheck(order.id)
      .then((res) => setCheckResult(res))
      .catch(() => {
        const avail = order.available ?? 0
        const req = order.required ?? 0
        const shortage = shortageQuantity(req, avail)
        setCheckResult({
          required: req,
          available: avail,
          shortage,
          hasShortage: shortage > 0,
        })
      })
  }, [order.id, order.available, order.required])

  const required = checkResult ? checkResult.required : order.required
  const available = checkResult ? checkResult.available : order.available
  const shortage = checkResult ? checkResult.shortage : shortageQuantity(order.required, order.available)

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="stock-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Work order detail</p>
            <h3 id="stock-title">{order.id}</h3>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close stock check">
            ×
          </button>
        </div>
        <div className="detail-grid">
          <div>
            <span>Location</span>
            <b>{order.location}</b>
          </div>
          <div>
            <span>Item</span>
            <b>{order.item}</b>
          </div>
          <div>
            <span>Required quantity</span>
            <b>{required}</b>
          </div>
          <div>
            <span>Assigned user</span>
            <b>{order.assignedUser}</b>
          </div>
          <div>
            <span>Status</span>
            <Status>{order.status}</Status>
          </div>
        </div>
        <div className={`stock-check ${shortage > 0 ? 'has-shortage' : ''}`}>
          <div>
            <span>Authoritative Stock Check</span>
            <h4>{shortage > 0 ? 'Material shortage detected' : 'Material available'}</h4>
          </div>
          <div className="stock-numbers">
            <div>
              <span>Required</span>
              <b>{required}</b>
            </div>
            <div>
              <span>Available</span>
              <b>{available}</b>
            </div>
            <div>
              <span>Shortage</span>
              <b>{shortage}</b>
            </div>
          </div>
        </div>
        {shortage > 0 && (
          <div className="modal-actions">
            <Button variant="outline" onClick={onClose}>
              <Warehouse data-icon="inline-start" />
              Find available stock
            </Button>
            <Button
              onClick={() => {
                onClose()
                window.location.href = '/dashboard/transfers'
              }}
            >
              <Truck data-icon="inline-start" />
              View transfers
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function TransferView({
  transfers,
  run,
  mutation,
  role,
}: {
  transfers: Transfer[]
  run: any
  mutation: { state: string; message: string }
  role?: Role
}) {
  const [confirm, setConfirm] = useState<{ id: string; action: 'dispatch' | 'receive' } | null>(null)
  const canOperate = role === 'ADMIN' || role === 'OPERATIONS_USER'

  return (
    <>
      <PageIntro
        eyebrow="Movement control"
        title="Internal Transfers"
        description="Move material between locations with an explicit three-step lifecycle."
      />
      <Feedback state={mutation.state} message={mutation.message} />
      <div className="table-card">
        <div className="table-head">
          <div>
            <h3>Transfer queue</h3>
            <p>Every transition is confirmed before the API is called.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transfer</th>
                <th>Item</th>
                <th>Route</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="strong">
                    {t.id}
                    <small>{t.workOrderId ?? 'Internal request'}</small>
                  </td>
                  <td>{t.item}</td>
                  <td>
                    {t.from} <ArrowRight className="route-icon" /> {t.to}
                  </td>
                  <td>{t.quantity}</td>
                  <td>
                    <Status>{t.status}</Status>
                  </td>
                  <td>
                    {canOperate && t.status === 'REQUESTED' ? (
                      <Button size="sm" variant="outline" onClick={() => setConfirm({ id: t.id, action: 'dispatch' })}>
                        Dispatch
                      </Button>
                    ) : canOperate && t.status === 'DISPATCHED' ? (
                      <Button size="sm" onClick={() => setConfirm({ id: t.id, action: 'receive' })}>
                        Receive
                      </Button>
                    ) : (
                      <span className="muted-label">{t.status === 'RECEIVED' ? 'Complete' : t.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`${confirm.action === 'dispatch' ? 'Dispatch' : 'Receive'} transfer`}
          description={
            confirm.action === 'dispatch'
              ? 'Source inventory will decrease. Destination inventory will not increase until receipt.'
              : 'Destination inventory will increase after this transfer is received.'
          }
          loading={mutation.state === 'loading'}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const fn = confirm.action === 'dispatch' ? apiDispatchTransfer : apiReceiveTransfer
            await run(() => fn(confirm.id), `${confirm.action === 'dispatch' ? 'Transfer dispatched.' : 'Transfer received.'}`)
            setConfirm(null)
          }}
        />
      )}
    </>
  )
}

function OrdersView({
  orders,
  inventory,
  run,
  mutation,
  role,
}: {
  orders: CustomerOrder[]
  inventory: InventoryRecord[]
  run: any
  mutation: { state: string; message: string }
  role?: Role
}) {
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState('')
  const [item, setItem] = useState(inventory[0]?.item ?? 'Motion Controller')
  const [qty, setQty] = useState('')
  const [confirm, setConfirm] = useState<CustomerOrder | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<CustomerOrder | null>(null)
  const canOperate = role === 'ADMIN' || role === 'SALES_USER'

  const selected = inventory.find((i) => i.item === item)

  return (
    <>
      <PageIntro
        eyebrow="Sales operations"
        title="Customer Orders"
        description="Create orders and reserve stock only after backend confirmation."
        action={
          canOperate ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Create order
            </Button>
          ) : null
        }
      />
      <Feedback state={mutation.state} message={mutation.message} />
      {open && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-order-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Sales operations</p>
                <h3 id="create-order-title">Create customer order</h3>
              </div>
              <button onClick={() => setOpen(false)} className="icon-button" aria-label="Close create order">
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                Customer
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
              </label>
              <label>
                Item
                <select value={item} onChange={(e) => setItem(e.target.value)}>
                  {inventory.map((i) => (
                    <option key={i.id}>{i.item}</option>
                  ))}
                </select>
              </label>
              <label>
                Requested quantity
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter quantity"
                />
              </label>
            </div>
            {selected && (
              <div className="reservation-card modal-reservation">
                <div>
                  <p className="eyebrow">Reservation availability</p>
                  <h3>Read-only inventory snapshot</h3>
                </div>
                <div className="stock-numbers">
                  <div>
                    <span>Physical</span>
                    <b>{selected.physical}</b>
                  </div>
                  <div>
                    <span>Reserved</span>
                    <b>{selected.reserved}</b>
                  </div>
                  <div>
                    <span>Available</span>
                    <b>{availableQuantity(selected)}</b>
                  </div>
                  <div>
                    <span>Requested</span>
                    <b>{qty || '—'}</b>
                  </div>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.state === 'loading'}>
                Cancel
              </Button>
              <Button
                disabled={!customer || !qty || Number(qty) <= 0 || mutation.state === 'loading'}
                onClick={async () => {
                  await run(() => apiCreateOrder({ customer, item, requested: Number(qty) }), 'Customer order created.')
                  setOpen(false)
                  setQty('')
                }}
              >
                {mutation.state === 'loading' ? 'Creating…' : 'Create order'}
              </Button>
            </div>
          </section>
        </div>
      )}
      <div className="reservation-card">
        <div>
          <p className="eyebrow">Reservation preflight</p>
          <h3>Check availability before committing</h3>
          <p>Values below are a read-only snapshot from the inventory API.</p>
        </div>
        {selected && (
          <div className="stock-numbers">
            <div>
              <span>Physical</span>
              <b>{selected.physical}</b>
            </div>
            <div>
              <span>Reserved</span>
              <b>{selected.reserved}</b>
            </div>
            <div>
              <span>Available</span>
              <b>{availableQuantity(selected)}</b>
            </div>
            <div>
              <span>Requested</span>
              <b>{qty || '—'}</b>
            </div>
          </div>
        )}
      </div>
      <div className="table-card">
        <div className="table-head">
          <div>
            <h3>Recent customer orders</h3>
            <p>Reserve stock is a backend-confirmed action.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="strong">{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.item}</td>
                  <td>{o.requested}</td>
                  <td>
                    <Status>{o.status}</Status>
                  </td>
                  <td className="flex items-center gap-2">
                    {canOperate && o.status === 'PENDING' && (
                      <Button size="sm" onClick={() => setConfirm(o)}>
                        Reserve stock
                      </Button>
                    )}
                    {canOperate && o.status === 'RESERVED' && (
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(o)}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Reserve stock"
          description="The API will confirm available stock before showing this order as reserved."
          loading={mutation.state === 'loading'}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await run(
              () => apiReserveStock({ orderId: confirm.id, quantity: confirm.requested }),
              'Stock reservation confirmed by backend.'
            )
            setConfirm(null)
          }}
        />
      )}
      {cancelConfirm && (
        <ConfirmDialog
          title="Cancel order"
          description="Cancelling this order will release its reserved inventory stock."
          loading={mutation.state === 'loading'}
          onCancel={() => setCancelConfirm(null)}
          onConfirm={async () => {
            await run(() => apiCancelOrder(cancelConfirm.id), 'Order cancelled and reserved stock released.')
            setCancelConfirm(null)
          }}
        />
      )}
    </>
  )
}

function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
  loading,
}: {
  title: string
  description: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Confirm action</p>
        <h3 id="confirm-title">{title}</h3>
        <p>{description}</p>
        <div className="modal-actions">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : 'Confirm'}
          </Button>
        </div>
      </section>
    </div>
  )
}

