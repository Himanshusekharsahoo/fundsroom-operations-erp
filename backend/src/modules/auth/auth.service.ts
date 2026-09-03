import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../utils/prisma'
import { config } from '../../config/env'
import { UnauthorizedError, NotFoundError } from '../../utils/errors'
import { LoginInput } from './auth.schema'

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    })

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS')
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash)
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS')
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND')
    }

    return { user }
  }
}

export const authService = new AuthService()
