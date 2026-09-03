import swaggerJsdoc from 'swagger-jsdoc'
import { config } from '../config/env'

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fundsroom Mini Operations ERP API',
      version: '1.0.0',
      description: `
Production-grade REST API powering the Mini Operations ERP system.
Supports Authentication & RBAC, Inventory Management, Work Orders with Shortage Detection,
Transactional Internal Stock Transfers, and Concurrency-Safe Customer Order Stock Reservations.
      `,
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide your JWT token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INSUFFICIENT_AVAILABLE_STOCK' },
                message: { type: 'string', example: 'Insufficient available stock.' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr-admin' },
            name: { type: 'string', example: 'Alex Rivera' },
            email: { type: 'string', example: 'admin@example.com' },
            role: { type: 'string', enum: ['ADMIN', 'OPERATIONS_USER', 'SALES_USER'], example: 'ADMIN' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', example: 'Password123!' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        InventoryRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'INV-1001' },
            sku: { type: 'string', example: 'MTR-440' },
            item: { type: 'string', example: 'Servo Motor Assembly' },
            location: { type: 'string', example: 'Austin Hub' },
            category: { type: 'string', example: 'Motors' },
            batch: { type: 'string', example: 'B-2026-04' },
            physical: { type: 'integer', example: 48 },
            reserved: { type: 'integer', example: 18 },
            unit: { type: 'string', example: 'units' },
            physicalQuantity: { type: 'integer', example: 48 },
            reservedQuantity: { type: 'integer', example: 18 },
            availableQuantity: { type: 'integer', example: 30 },
          },
        },
        WorkOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'WO-4821' },
            location: { type: 'string', example: 'Austin Hub' },
            item: { type: 'string', example: 'Servo Motor Assembly' },
            sku: { type: 'string', example: 'MTR-440' },
            required: { type: 'integer', example: 36 },
            assignedUser: { type: 'string', example: 'Jordan Lee' },
            status: { type: 'string', enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'], example: 'IN_PROGRESS' },
            available: { type: 'integer', example: 30 },
            shortage: { type: 'integer', example: 6 },
            hasShortage: { type: 'boolean', example: true },
          },
        },
        Transfer: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'TR-2008' },
            item: { type: 'string', example: 'Servo Motor Assembly' },
            quantity: { type: 'integer', example: 6 },
            from: { type: 'string', example: 'Reno Depot' },
            to: { type: 'string', example: 'Austin Hub' },
            requestedBy: { type: 'string', example: 'Jordan Lee' },
            status: { type: 'string', enum: ['REQUESTED', 'DISPATCHED', 'RECEIVED'], example: 'REQUESTED' },
            workOrderId: { type: 'string', example: 'WO-4821' },
          },
        },
        CustomerOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'CO-7730' },
            customer: { type: 'string', example: 'Northstar Robotics' },
            item: { type: 'string', example: 'Motion Controller' },
            requested: { type: 'integer', example: 8 },
            status: { type: 'string', enum: ['DRAFT', 'PENDING', 'RESERVED', 'CANCELLED'], example: 'RESERVED' },
            createdAt: { type: 'string', example: 'Sep 3, 2026' },
          },
        },
      },
    },
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Authenticate user with email and password',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: { description: 'Authenticated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Get current authenticated user info',
          tags: ['Auth'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Authenticated user profile' },
            401: { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/inventory': {
        get: {
          summary: 'Get all inventory items with physical, reserved, and available quantities',
          tags: ['Inventory'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Inventory records retrieved' },
          },
        },
        post: {
          summary: 'Add physical inventory stock (ADMIN or OPERATIONS_USER)',
          tags: ['Inventory'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    inventoryId: { type: 'string', example: 'INV-1001' },
                    quantity: { type: 'integer', example: 10 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Stock updated' },
            400: { description: 'Invalid quantity' },
            403: { description: 'Forbidden' },
          },
        },
      },
      '/api/work-orders': {
        get: {
          summary: 'Get all work orders (ADMIN or OPERATIONS_USER)',
          tags: ['Work Orders'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Work orders list' } },
        },
        post: {
          summary: 'Create a new work order (ADMIN only)',
          tags: ['Work Orders'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    item: { type: 'string', example: 'Servo Motor Assembly' },
                    required: { type: 'integer', example: 36 },
                    location: { type: 'string', example: 'Austin Hub' },
                    assignedUser: { type: 'string', example: 'Jordan Lee' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Work order created' },
            403: { description: 'Forbidden (non-ADMIN)' },
          },
        },
      },
      '/api/work-orders/{id}/stock-check': {
        get: {
          summary: 'Perform backend authoritative stock check for a work order',
          tags: ['Work Orders'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Stock availability & shortage calculation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      required: { type: 'integer', example: 36 },
                      available: { type: 'integer', example: 30 },
                      shortage: { type: 'integer', example: 6 },
                      hasShortage: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/transfers': {
        get: {
          summary: 'Get all internal transfers (ADMIN or OPERATIONS_USER)',
          tags: ['Transfers'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Transfers list' } },
        },
        post: {
          summary: 'Create internal transfer request (Status: REQUESTED - no inventory mutation)',
          tags: ['Transfers'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    item: { type: 'string', example: 'Servo Motor Assembly' },
                    quantity: { type: 'integer', example: 6 },
                    from: { type: 'string', example: 'Reno Depot' },
                    to: { type: 'string', example: 'Austin Hub' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Transfer requested' } },
        },
      },
      '/api/transfers/{id}/dispatch': {
        post: {
          summary: 'Dispatch transfer: source stock decreases, destination unchanged (Transactional)',
          tags: ['Transfers'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Transfer dispatched' },
            409: { description: 'Conflict: insufficient source stock or invalid state' },
          },
        },
      },
      '/api/transfers/{id}/receive': {
        post: {
          summary: 'Receive transfer: destination stock increases (Transactional)',
          tags: ['Transfers'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Transfer received' },
            409: { description: 'Conflict: not dispatched yet or already received' },
          },
        },
      },
      '/api/orders': {
        get: {
          summary: 'Get customer orders (ADMIN or SALES_USER)',
          tags: ['Customer Orders'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Customer orders list' } },
        },
        post: {
          summary: 'Create customer order (Status: PENDING)',
          tags: ['Customer Orders'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customer: { type: 'string', example: 'Vertex Manufacturing' },
                    item: { type: 'string', example: 'Servo Motor Assembly' },
                    requested: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Order created' } },
        },
      },
      '/api/orders/{id}/reserve': {
        post: {
          summary: 'Atomically reserve inventory stock for customer order (Concurrency-Safe)',
          tags: ['Customer Orders'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Stock reserved successfully' },
            409: {
              description: 'Conflict: Insufficient available stock (conditional update affected 0 rows)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      error: {
                        type: 'object',
                        properties: {
                          code: { type: 'string', example: 'INSUFFICIENT_AVAILABLE_STOCK' },
                          message: { type: 'string', example: 'Insufficient available stock.' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/orders/{id}/cancel': {
        post: {
          summary: 'Cancel customer order and release reserved stock transactionally',
          tags: ['Customer Orders'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Order cancelled and reservation released' },
            409: { description: 'Order already cancelled' },
          },
        },
      },
    },
  },
  apis: [],
}

export const swaggerSpec = swaggerJsdoc(swaggerOptions)
