import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Reservation Concurrency Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('prevents overselling when two requests concurrently attempt to reserve stock exceeding availability', async () => {
    // 1. Setup isolated test data:
    // Create an item and an inventory record with physical = 100, reserved = 0 (available = 100)
    const category = await prisma.category.findFirst()
    const testItem = await prisma.item.create({
      data: {
        id: `item-concurrency-${Date.now()}`,
        name: 'High Precision Sensor',
        sku: `HPS-${Date.now()}`,
        categoryId: category!.id,
      },
    })

    const location = await prisma.location.findFirst()
    const testInventory = await prisma.inventory.create({
      data: {
        id: `INV-CONCUR-${Date.now()}`,
        itemId: testItem.id,
        locationId: location!.id,
        physicalQuantity: 100,
        reservedQuantity: 0,
      },
    })

    // 2. Create Order A (requires 80 units)
    const orderARes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokens.salesToken}`)
      .send({
        customer: 'Concurrent Client Alpha',
        itemId: testItem.id,
        requested: 80,
      })
    expect(orderARes.status).toBe(201)
    const orderAId = orderARes.body.data.id

    // Create Order B (requires 50 units)
    const orderBRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokens.salesToken}`)
      .send({
        customer: 'Concurrent Client Beta',
        itemId: testItem.id,
        requested: 50,
      })
    expect(orderBRes.status).toBe(201)
    const orderBId = orderBRes.body.data.id

    // 3. Fire both reservation requests CONCURRENTLY
    // Total demand = 80 + 50 = 130 > 100 (available)
    const [resultA, resultB] = await Promise.all([
      request(app)
        .post(`/api/orders/${orderAId}/reserve`)
        .set('Authorization', `Bearer ${tokens.salesToken}`)
        .send({ inventoryId: testInventory.id, quantity: 80 }),
      request(app)
        .post(`/api/orders/${orderBId}/reserve`)
        .set('Authorization', `Bearer ${tokens.salesToken}`)
        .send({ inventoryId: testInventory.id, quantity: 50 }),
    ])

    const statuses = [resultA.status, resultB.status]

    // Expect exactly one 200 (Success) and one 409 (Conflict)
    expect(statuses).toContain(200)
    expect(statuses).toContain(409)

    const failedResult = resultA.status === 409 ? resultA : resultB
    expect(failedResult.body.success).toBe(false)
    expect(failedResult.body.error.code).toBe('INSUFFICIENT_AVAILABLE_STOCK')

    // 4. Verify in the database:
    // Final reserved quantity must NEVER exceed 100!
    const finalInventory = await prisma.inventory.findUnique({
      where: { id: testInventory.id },
    })

    expect(finalInventory).not.toBeNull()
    expect(finalInventory!.reservedQuantity).toBeLessThanOrEqual(100)
    expect([50, 80]).toContain(finalInventory!.reservedQuantity)

    const finalAvailable =
      finalInventory!.physicalQuantity - finalInventory!.reservedQuantity
    expect(finalAvailable).toBeGreaterThanOrEqual(0)
  })
})
