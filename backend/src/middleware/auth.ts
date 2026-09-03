import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import { UnauthorizedError, ForbiddenError } from '../utils/errors'
import { config } from '../config/env'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token is missing or invalid', 'MISSING_TOKEN')
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    }
    next()
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token', 'INVALID_TOKEN')
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'UNAUTHORIZED')
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `User with role ${req.user.role} does not have permission to perform this action`,
        'FORBIDDEN'
      )
    }

    next()
  }
}
