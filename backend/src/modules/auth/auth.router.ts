import { Router } from 'express'
import { authController } from './auth.controller'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/auth'
import { loginSchema } from './auth.schema'

const router = Router()

router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next))
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next))

export const authRouter = router
