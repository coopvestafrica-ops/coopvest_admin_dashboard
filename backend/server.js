import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import memberRoutes from './routes/members.js'
import contributionRoutes from './routes/contributions.js'
import loanRoutes from './routes/loans.js'
import investmentRoutes from './routes/investments.js'
import documentRoutes from './routes/documents.js'
import auditRoutes from './routes/audit.js'
import statisticsRoutes from './routes/statistics.js'
import featureRoutes from './routes/features.js'
import roleRoutes from './routes/roles.js'
import rolloverRoutes from './routes/rollovers.js'
import healthRoutes from './routes/health.js'
import referralRoutes from './routes/referrals.js'
import qrCodeRoutes from './routes/qrcodes.js'

// Sheet routes
import sheetsRoutes from './routes/sheets.js'
import sheetDataRoutes from './routes/sheetData.js'
import sheetApprovalsRoutes from './routes/sheetApprovals.js'
import sheetAssignmentsRoutes from './routes/sheetAssignments.js'
import sheetAdminRoutes from './routes/sheetAdmin.js'
import sheetAuditRoutes from './routes/sheetAudit.js'

// Initialize Express app
const app = express()

// Security Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parser middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coopvest_admin')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB connection error:', err))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/contributions', contributionRoutes)
app.use('/api/loans', loanRoutes)
app.use('/api/investments', investmentRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/features', featureRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/rollovers', rolloverRoutes)
app.use('/api/referrals', referralRoutes)
app.use('/api/qr-codes', qrCodeRoutes)

// Sheet API Routes
app.use('/api/sheets', sheetsRoutes)
app.use('/api/sheets', sheetDataRoutes)
app.use('/api/sheets', sheetApprovalsRoutes)
app.use('/api/sheet-assignments', sheetAssignmentsRoutes)
app.use('/api/sheet-admin', sheetAdminRoutes)
app.use('/api/sheet-audit', sheetAuditRoutes)

// Health check and monitoring routes
app.use('/api/health', healthRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global Error handling middleware
import globalErrorHandler from './middleware/errorMiddleware.js'
app.use(globalErrorHandler)

// Initialize Scheduler
import { initScheduler } from './services/schedulerService.js'
initScheduler()

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`)
  console.log(`✓ Environment: ${process.env.NODE_ENV}`)
})

export default app