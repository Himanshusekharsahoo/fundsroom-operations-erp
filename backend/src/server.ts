import { app } from './app'
import { config } from './config/env'

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, () => {
    console.log(`🚀 Mini Operations ERP Server running on port ${config.port}`)
    console.log(`📖 Swagger API Docs available at: http://localhost:${config.port}/api/docs`)
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
    })
  })
}

