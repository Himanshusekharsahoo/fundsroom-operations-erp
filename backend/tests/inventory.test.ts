import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Inventory Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('exposes physicalQuantity, reservedQuantity, and availableQuantity where available = physical - reserved', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)

    for (const record of res.body.data) {
      expect(record.physicalQuantity).toBeDefined()
      expect(record.reservedQuantity).toBeDefined()
      expect(record.availableQuantity).toBeDefined()
      expect(record.availableQuantity).toBe(
        Math.max(0, record.physicalQuantity - record.reservedQuantity)
      )
      // Frontend compatibility fields
      expect(record.physical).toBe(record.physicalQuantity)
      expect(record.reserved).toBe(record.reservedQuantity)
    }
  })

  it('allows adding inventory with valid positive quantity', async () => {
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    const target = invRes.body.data[0]
    const initialPhysical = target.physicalQuantity

    const addRes = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${tokens.opsToken}`)
      .send({
        inventoryId: target.id,
        quantity: 15,
      })

    expect(addRes.status).toBe(200)
    expect(addRes.body.success).toBe(true)
    expect(addRes.body.data.physicalQuantity).toBe(initialPhysical + 15)
    expect(addRes.body.data.availableQuantity).toBe(
      initialPhysical + 15 - target.reservedQuantity
    )
  })

  it('rejects adding non-positive or invalid quantity with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        inventoryId: 'INV-1001',
        quantity: -5,
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('supports metadata queries for items, locations, categories, batches', async () => {
    const itemsRes = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
    expect(itemsRes.status).toBe(200)
    expect(itemsRes.body.data.length).toBeGreaterThanOrEqual(4)

    const locsRes = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
    expect(locsRes.status).toBe(200)
    expect(locsRes.body.data.length).toBeGreaterThanOrEqual(2)

    const catsRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
    expect(catsRes.status).toBe(200)

    const batchesRes = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
    expect(batchesRes.status).toBe(200)
  })
})
