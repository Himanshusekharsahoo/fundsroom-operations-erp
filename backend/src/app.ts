import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { config } from './config/env'
import { authRouter } from './modules/auth/auth.router'
import { inventoryRouter } from './modules/inventory/inventory.router'
import { inventoryController } from './modules/inventory/inventory.controller'
import { workOrderRouter } from './modules/work-orders/work-order.router'
import { transferRouter } from './modules/transfers/transfer.router'
import { orderRouter } from './modules/orders/order.router'
import { errorHandler } from './middleware/error'
import { authenticate } from './middleware/auth'
import { swaggerSpec } from './docs/swagger'

export const app = express()

// Basic Middlewares
app.use(
  cors({
    origin: config.corsOrigin || '*',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Authentication Routes
app.use('/api/auth', authRouter)

// Inventory Routes
app.use('/api/inventory', inventoryRouter)

// Direct root-level resources for requirement 6
app.get('/api/items', authenticate, (req, res, next) =>
  inventoryController.getItems(req, res, next)
)
app.get('/api/locations', authenticate, (req, res, next) =>
  inventoryController.getLocations(req, res, next)
)
app.get('/api/categories', authenticate, (req, res, next) =>
  inventoryController.getCategories(req, res, next)
)
app.get('/api/batches', authenticate, (req, res, next) =>
  inventoryController.getBatches(req, res, next)
)

// Work Orders Routes
app.use('/api/work-orders', workOrderRouter)

// Transfers Routes
app.use('/api/transfers', transferRouter)

// Customer Orders Routes
app.use('/api/orders', orderRouter)

// Centralized Error Handling Middleware
app.use(errorHandler)
