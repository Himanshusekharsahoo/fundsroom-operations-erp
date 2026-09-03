import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Work Orders Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // Mandatory Test 9: Work order stock shortage is calculated correctly
  it('calculates work order stock shortage correctly on backend stock-check endpoint', async () => {
    // WO-4821 requires 36 Servo Motors at Austin Hub.
    const res = await request(app)
      .get('/api/work-orders/WO-4821/stock-check')
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const check = res.body.data

    expect(check.required).toBe(36)
    expect(check.available).toBeDefined()
    expect(check.shortage).toBe(Math.max(0, check.required - check.available))
    expect(check.hasShortage).toBe(check.shortage > 0)
  })

  it('allows ADMIN to create a work order', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        item: 'Servo Motor Assembly',
        required: 15,
        location: 'Austin Hub',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toMatch(/^WO-/)
    expect(res.body.data.required).toBe(15)
  })

  it('allows updating work order status by operations user', async () => {
    const res = await request(app)
      .patch('/api/work-orders/WO-4818/status')
      .set('Authorization', `Bearer ${tokens.opsToken}`)
      .send({
        status: 'IN_PROGRESS',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_PROGRESS')
  })
})
