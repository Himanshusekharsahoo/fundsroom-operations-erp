import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors'
import { config } from '../config/env'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issues.map((i) => `${i.field}: ${i.message}`).join(', ') || 'Validation error',
        details: issues,
      },
    })
    return
  }

  console.error('Unhandled Server Error:', err)

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    },
  })
}
