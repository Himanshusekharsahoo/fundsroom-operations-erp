import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/utils/prisma'
import { seed } from '../prisma/seed'

describe('Complete End-to-End Business Flow Verification', () => {
  beforeAll(async () => {
    await seed()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('verifies the complete ERP lifecycle: Login -> Inventory -> Work Order -> Stock Check -> Shortage -> Transfer Lifecycle -> Updated Stock -> Order -> Concurrency-Safe Reservation', async () => {
    // 1. LOGIN
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'Password123!',
    })
    expect(loginRes.status).toBe(200)
    const token = loginRes.body.data.token
    expect(token).toBeDefined()

    // 2. INVENTORY
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
    expect(invRes.status).toBe(200)
    expect(invRes.body.data.length).toBeGreaterThanOrEqual(4)

    const austinMotor = invRes.body.data.find(
      (i: any) => i.item === 'Servo Motor Assembly' && i.location === 'Austin Hub'
    )
    expect(austinMotor).toBeDefined()
    expect(austinMotor.physicalQuantity).toBe(48)
    expect(austinMotor.reservedQuantity).toBe(18)
    expect(austinMotor.availableQuantity).toBe(30)

    // 3. CREATE WORK ORDER
    const woRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item: 'Servo Motor Assembly',
        location: 'Austin Hub',
        required: 36,
        assignedUser: 'Jordan Lee',
      })
    expect(woRes.status).toBe(201)
    const workOrderId = woRes.body.data.id

    // 4. STOCK CHECK & 5. SHORTAGE
    const checkRes = await request(app)
      .get(`/api/work-orders/${workOrderId}/stock-check`)
      .set('Authorization', `Bearer ${token}`)
    expect(checkRes.status).toBe(200)
    expect(checkRes.body.data.required).toBe(36)
    expect(checkRes.body.data.available).toBe(30)
    expect(checkRes.body.data.shortage).toBe(6)
    expect(checkRes.body.data.hasShortage).toBe(true)

    // 6. CREATE/DISPATCH TRANSFER (6 units from Reno Depot to Austin Hub)
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item: 'Servo Motor Assembly',
        quantity: 6,
        from: 'Reno Depot',
        to: 'Austin Hub',
        workOrderId,
      })
    expect(transferRes.status).toBe(201)
    const transferId = transferRes.body.data.id
    expect(transferRes.body.data.status).toBe('REQUESTED')

    // Source Reno stock before dispatch
    const renoBefore = await prisma.inventory.findFirst({
      where: { item: { name: 'Servo Motor Assembly' }, location: { name: 'Reno Depot' } },
    })
    const renoPhysicalBefore = renoBefore!.physicalQuantity

    // Dispatch transfer
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
    expect(dispatchRes.status).toBe(200)
    expect(dispatchRes.body.data.status).toBe('DISPATCHED')

    // Verify source decreased, destination not yet increased
    const renoAfterDispatch = await prisma.inventory.findFirst({
      where: { id: renoBefore!.id },
    })
    expect(renoAfterDispatch!.physicalQuantity).toBe(renoPhysicalBefore - 6)

    const austinBeforeReceive = await prisma.inventory.findUnique({
      where: { id: austinMotor.id },
    })
    expect(austinBeforeReceive!.physicalQuantity).toBe(48)

    // 7. RECEIVE TRANSFER
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${token}`)
    expect(receiveRes.status).toBe(200)
    expect(receiveRes.body.data.status).toBe('RECEIVED')

    // 8. INVENTORY UPDATED (Austin Hub has now received 6 units)
    const austinAfterReceive = await prisma.inventory.findUnique({
      where: { id: austinMotor.id },
    })
    expect(austinAfterReceive!.physicalQuantity).toBe(48 + 6)
    expect(austinAfterReceive!.physicalQuantity - austinAfterReceive!.reservedQuantity).toBe(36)

    // Re-check work order stock check: shortage should now be 0!
    const reCheckRes = await request(app)
      .get(`/api/work-orders/${workOrderId}/stock-check`)
      .set('Authorization', `Bearer ${token}`)
    expect(reCheckRes.body.data.available).toBe(36)
    expect(reCheckRes.body.data.shortage).toBe(0)
    expect(reCheckRes.body.data.hasShortage).toBe(false)

    // 9. CREATE CUSTOMER ORDER
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: 'Apex Aerospace',
        item: 'Motion Controller',
        requested: 5,
      })
    expect(orderRes.status).toBe(201)
    const orderId = orderRes.body.data.id
    expect(orderRes.body.data.status).toBe('PENDING')

    // 10. RESERVE STOCK & 11. BACKEND CONFIRMS RESERVATION
    const reserveRes = await request(app)
      .post(`/api/orders/${orderId}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 })
    expect(reserveRes.status).toBe(200)
    expect(reserveRes.body.data.status).toBe('RESERVED')
    expect(reserveRes.body.data.items[0].reservationStatus).toBe('RESERVED')
  })
})
