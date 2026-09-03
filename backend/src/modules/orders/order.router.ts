import { Router } from 'express'
import { Role } from '@prisma/client'
import { orderController } from './order.controller'
import { authenticate, authorize } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { createOrderSchema, reserveOrderSchema } from './order.schema'

const router = Router()

router.use(authenticate)
// Orders are restricted to ADMIN and SALES_USER
router.use(authorize(Role.ADMIN, Role.SALES_USER))

router.get('/', (req, res, next) => orderController.getAll(req, res, next))
router.get('/:id', (req, res, next) => orderController.getById(req, res, next))
router.post('/', validate(createOrderSchema), (req, res, next) =>
  orderController.create(req, res, next)
)
router.post('/:id/reserve', validate(reserveOrderSchema), (req, res, next) =>
  orderController.reserve(req, res, next)
)
router.post('/:id/cancel', (req, res, next) => orderController.cancel(req, res, next))

export const orderRouter = router
