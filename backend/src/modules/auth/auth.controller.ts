import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { UnauthorizedError } from '../../utils/errors'

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body)
      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated', 'UNAUTHORIZED')
      }
      const result = await authService.getMe(req.user.id)
      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
