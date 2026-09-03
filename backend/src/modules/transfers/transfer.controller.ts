import { Request, Response, NextFunction } from 'express'
import { transferService } from './transfer.service'
import { UnauthorizedError } from '../../utils/errors'

export class TransferController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transfers = await transferService.getAllTransfers()
      res.status(200).json({
        success: true,
        data: transfers,
      })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transfer = await transferService.getTransferById(req.params.id)
      res.status(200).json({
        success: true,
        data: transfer,
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
      const transfer = await transferService.createTransfer(req.body, req.user.id)
      res.status(201).json({
        success: true,
        data: transfer,
      })
    } catch (error) {
      next(error)
    }
  }

  async dispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transfer = await transferService.dispatchTransfer(req.params.id)
      res.status(200).json({
        success: true,
        data: transfer,
      })
    } catch (error) {
      next(error)
    }
  }

  async receive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transfer = await transferService.receiveTransfer(req.params.id)
      res.status(200).json({
        success: true,
        data: transfer,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const transferController = new TransferController()
