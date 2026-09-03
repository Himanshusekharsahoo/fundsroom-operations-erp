import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Auth & RBAC Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@example.com',
        password: 'Password123!',
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.user.email).toBe('admin@example.com')
      expect(res.body.data.user.role).toBe('ADMIN')
    })

    it('should reject invalid password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@example.com',
        password: 'WrongPassword!',
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should reject non-existent email with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should return current user information on /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe('admin@example.com')
      expect(res.body.data.user.role).toBe('ADMIN')
    })
  })

  describe('RBAC & Route Protection', () => {
    // Mandatory Test 7: Unauthenticated request returns 401
    it('returns 401 when unauthenticated request attempts access to protected endpoint', async () => {
      const res = await request(app).get('/api/inventory')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('MISSING_TOKEN')
    })

    it('returns 401 when request provides invalid Bearer token', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer invalid.token.here')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INVALID_TOKEN')
    })

    // Mandatory Test 8: Unauthorized role returns 403
    it('returns 403 when SALES_USER tries to access Transfers', async () => {
      const res = await request(app)
        .get('/api/transfers')
        .set('Authorization', `Bearer ${tokens.salesToken}`)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('returns 403 when OPERATIONS_USER tries to access Customer Orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokens.opsToken}`)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    // Mandatory Test 6: Unauthorized user cannot perform restricted operation
    it('returns 403 when OPERATIONS_USER tries to create a Work Order (ADMIN only)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${tokens.opsToken}`)
        .send({
          item: 'Servo Motor Assembly',
          required: 10,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('allows ADMIN to access all modules without 403', async () => {
      const inv = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
      expect(inv.status).toBe(200)

      const wo = await request(app)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
      expect(wo.status).toBe(200)

      const tr = await request(app)
        .get('/api/transfers')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
      expect(tr.status).toBe(200)

      const ord = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
      expect(ord.status).toBe(200)
    })
  })
})
