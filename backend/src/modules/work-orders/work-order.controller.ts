import { Request, Response, NextFunction } from 'express'
import { workOrderService } from './work-order.service'
import { UnauthorizedError } from '../../utils/errors'

export class WorkOrderController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await workOrderService.getAllWorkOrders()
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
      const order = await workOrderService.getWorkOrderById(req.params.id)
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
      const order = await workOrderService.createWorkOrder(req.body, req.user.id)
      res.status(201).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await workOrderService.updateStatus(req.params.id, req.body.status)
      res.status(200).json({
        success: true,
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  async stockCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrderService.stockCheck(req.params.id)
      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const workOrderController = new WorkOrderController()
