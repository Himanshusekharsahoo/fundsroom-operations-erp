import request from 'supertest'
import { app } from '../src/app'

export async function getAuthTokens() {
  const adminRes = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123!',
  })

  const opsRes = await request(app).post('/api/auth/login').send({
    email: 'operations@example.com',
    password: 'Password123!',
  })

  const salesRes = await request(app).post('/api/auth/login').send({
    email: 'sales@example.com',
    password: 'Password123!',
  })

  return {
    adminToken: adminRes.body.data.token as string,
    opsToken: opsRes.body.data.token as string,
    salesToken: salesRes.body.data.token as string,
  }
}
