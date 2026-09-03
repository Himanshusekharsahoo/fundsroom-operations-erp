import { Router } from 'express'
import { Role } from '@prisma/client'
import { workOrderController } from './work-order.controller'
import { authenticate, authorize } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { createWorkOrderSchema, updateWorkOrderStatusSchema } from './work-order.schema'

const router = Router()

router.use(authenticate)

// List work orders (ADMIN and OPERATIONS_USER)
router.get(
  '/',
  authorize(Role.ADMIN, Role.OPERATIONS_USER),
  (req, res, next) => workOrderController.getAll(req, res, next)
)

// Stock check on work order (ADMIN and OPERATIONS_USER)
router.get(
  '/:id/stock-check',
  authorize(Role.ADMIN, Role.OPERATIONS_USER),
  (req, res, next) => workOrderController.stockCheck(req, res, next)
)

// Get single work order (ADMIN and OPERATIONS_USER)
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.OPERATIONS_USER),
  (req, res, next) => workOrderController.getById(req, res, next)
)

// Create work order: ADMIN ONLY
router.post(
  '/',
  authorize(Role.ADMIN),
  validate(createWorkOrderSchema),
  (req, res, next) => workOrderController.create(req, res, next)
)

// Update status (ADMIN and OPERATIONS_USER)
router.patch(
  '/:id/status',
  authorize(Role.ADMIN, Role.OPERATIONS_USER),
  validate(updateWorkOrderStatusSchema),
  (req, res, next) => workOrderController.updateStatus(req, res, next)
)

export const workOrderRouter = router
