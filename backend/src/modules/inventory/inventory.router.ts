import { Router } from 'express'
import { Role } from '@prisma/client'
import { inventoryController } from './inventory.controller'
import { authenticate, authorize } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { addInventorySchema, inventoryFilterSchema } from './inventory.schema'

const router = Router()

// All inventory endpoints require authentication
router.use(authenticate)

// Get metadata (accessible to all authenticated roles for lookups)
router.get('/items', (req, res, next) => inventoryController.getItems(req, res, next))
router.get('/locations', (req, res, next) => inventoryController.getLocations(req, res, next))
router.get('/categories', (req, res, next) => inventoryController.getCategories(req, res, next))
router.get('/batches', (req, res, next) => inventoryController.getBatches(req, res, next))

// Inventory records list and details
router.get('/', validate(inventoryFilterSchema), (req, res, next) =>
  inventoryController.getAll(req, res, next)
)
router.get('/:id', (req, res, next) => inventoryController.getById(req, res, next))

// Add inventory stock: restricted to ADMIN and OPERATIONS_USER
router.post(
  '/',
  authorize(Role.ADMIN, Role.OPERATIONS_USER),
  validate(addInventorySchema),
  (req, res, next) => inventoryController.addInventory(req, res, next)
)

export const inventoryRouter = router
