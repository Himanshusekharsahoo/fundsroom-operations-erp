import { Request, Response, NextFunction } from 'express'
import { orderService } from './order.service'
import { UnauthorizedError } from '../../utils/errors'

export class OrderController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await orderService.getAllOrders()
      res.status(200).json({
        success: true,
        data: orders,
      })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getOrderById(req.params.id)
      res.status(200).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'UNAUTHORIZED')
      }
      const order = await orderService.createOrder(req.body, req.user.id)
      res.status(201).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  async reserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.reserveStock(req.params.id, req.body)
      res.status(200).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.cancelOrder(req.params.id)
      res.status(200).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const orderController = new OrderController()
