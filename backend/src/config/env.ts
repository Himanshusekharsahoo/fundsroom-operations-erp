import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fundsroom_operations_erp?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-mini-operations-erp-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
}
