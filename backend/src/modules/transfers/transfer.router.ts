import { Router } from 'express'
import { Role } from '@prisma/client'
import { transferController } from './transfer.controller'
import { authenticate, authorize } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { createTransferSchema } from './transfer.schema'

const router = Router()

router.use(authenticate)
// Both ADMIN and OPERATIONS_USER are authorized for Transfers
router.use(authorize(Role.ADMIN, Role.OPERATIONS_USER))

router.get('/', (req, res, next) => transferController.getAll(req, res, next))
router.get('/:id', (req, res, next) => transferController.getById(req, res, next))
router.post('/', validate(createTransferSchema), (req, res, next) =>
  transferController.create(req, res, next)
)
router.post('/:id/dispatch', (req, res, next) => transferController.dispatch(req, res, next))
router.post('/:id/receive', (req, res, next) => transferController.receive(req, res, next))

export const transferRouter = router
