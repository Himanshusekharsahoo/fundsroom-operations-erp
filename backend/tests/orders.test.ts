import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Customer Orders & Reservation Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('allows SALES_USER to create a customer order in PENDING status', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokens.salesToken}`)
      .send({
        customer: 'Acme Robotics',
        item: 'Motion Controller',
        requested: 5,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.customer).toBe('Acme Robotics')
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.requested).toBe(5)
  })

  // Mandatory Test 1: Cannot reserve more than available inventory
  it('cannot reserve more than available inventory and returns 409 Conflict', async () => {
    // Create order for a huge quantity exceeding available stock
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokens.salesToken}`)
      .send({
        customer: 'Overdemand Corp',
        item: 'Motion Controller',
        requested: 99999,
      })

    expect(createRes.status).toBe(201)
    const orderId = createRes.body.data.id

    // Attempt to reserve stock
    const reserveRes = await request(app)
      .post(`/api/orders/${orderId}/reserve`)
      .set('Authorization', `Bearer ${tokens.salesToken}`)

    expect(reserveRes.status).toBe(409)
    expect(reserveRes.body.success).toBe(false)
    expect(reserveRes.body.error.code).toBe('INSUFFICIENT_AVAILABLE_STOCK')
  })

  // Mandatory Test 10: Cancelled order releases reserved stock
  it('transactionally releases reserved stock when a reserved order is cancelled', async () => {
    // Step 1: Create a normal order
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokens.salesToken}`)
      .send({
        customer: 'Precision Dynamics',
        item: 'Motion Controller',
        requested: 4,
      })

    const orderId = createRes.body.data.id
    const orderItem = await prisma.orderItem.findFirst({
      where: { customerOrderId: orderId },
    })
    const invId = orderItem!.inventoryId!

    // Check reserved quantity before reservation
    const invBefore = await prisma.inventory.findUnique({ where: { id: invId } })
    const reservedBefore = invBefore!.reservedQuantity

    // Step 2: Reserve the order
    const reserveRes = await request(app)
      .post(`/api/orders/${orderId}/reserve`)
      .set('Authorization', `Bearer ${tokens.salesToken}`)

    expect(reserveRes.status).toBe(200)
    expect(reserveRes.body.data.status).toBe('RESERVED')

    const invAfterReserve = await prisma.inventory.findUnique({ where: { id: invId } })
    expect(invAfterReserve!.reservedQuantity).toBe(reservedBefore + 4)

    // Step 3: Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokens.salesToken}`)

    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.data.status).toBe('CANCELLED')

    // Step 4: Verify reserved stock was released transactionally
    const invAfterCancel = await prisma.inventory.findUnique({ where: { id: invId } })
    expect(invAfterCancel!.reservedQuantity).toBe(reservedBefore)

    // Step 5: Cannot cancel twice
    const doubleCancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokens.salesToken}`)

    expect(doubleCancelRes.status).toBe(409)
  })
})
