export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: unknown) {
    super(400, code, message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: unknown) {
    super(401, code, message, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: unknown) {
    super(403, code, message, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details?: unknown) {
    super(404, code, message, details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT', details?: unknown) {
    super(409, code, message, details)
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(500, code, message, details)
  }
}
