import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import gamesRouter from './routes/games'
import profilesRouter from './routes/profiles'
import matchesRouter from './routes/matches'
import courtRegistrationRouter from './routes/courtRegistration'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4001
const configuredFrontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000'
const configuredFrontendOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set([
  configuredFrontendOrigin,
  ...configuredFrontendOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
])
const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW !== 'false'
const isAllowedVercelOrigin = (origin: string) =>
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) || /^https:\/\/[a-z0-9-]+-git-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i.test(origin)

// Middleware
app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || (allowVercelPreview && isAllowedVercelOrigin(origin))) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(morgan('dev'))
app.use(express.json())

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
app.use(limiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stackit-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/games', gamesRouter)
app.use('/api/profiles', profilesRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/court-registration', courtRegistrationRouter)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🏓 StackIt API running on http://localhost:${PORT}`)
})

export default app
