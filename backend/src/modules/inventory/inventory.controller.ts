import { Request, Response, NextFunction } from 'express'
import { inventoryService } from './inventory.service'

export class InventoryController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await inventoryService.getAllInventory(req.query as any)
      res.status(200).json({
        success: true,
        data: records,
      })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await inventoryService.getInventoryById(req.params.id)
      res.status(200).json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  }

  async addInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await inventoryService.addInventory(req.body)
      res.status(200).json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  }

  async getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await inventoryService.getItems()
      res.status(200).json({
        success: true,
        data: items,
      })
    } catch (error) {
      next(error)
    }
  }

  async getLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locations = await inventoryService.getLocations()
      res.status(200).json({
        success: true,
        data: locations,
      })
    } catch (error) {
      next(error)
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await inventoryService.getCategories()
      res.status(200).json({
        success: true,
        data: categories,
      })
    } catch (error) {
      next(error)
    }
  }

  async getBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batches = await inventoryService.getBatches()
      res.status(200).json({
        success: true,
        data: batches,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const inventoryController = new InventoryController()
