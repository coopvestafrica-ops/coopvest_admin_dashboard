/**
 * Health Check Endpoints for Rollover Services
 * Provides monitoring and health status for rollover-related services
 */

import mongoose from 'mongoose'
import Rollover from '../models/Rollover.js'

/**
 * Basic health check endpoint
 */
export const healthCheck = async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  }

  // Check MongoDB connection
  checks.checks.database = {
    status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
    type: 'mongodb'
  }

  // Check rollover collection
  try {
    const rolloverCount = await Rollover.countDocuments()
    checks.checks.rolloverCollection = {
      status: 'healthy',
      documentCount: rolloverCount
    }
  } catch (error) {
    checks.checks.rolloverCollection = {
      status: 'unhealthy',
      error: error.message
    }
    checks.status = 'degraded'
  }

  // Calculate overall status
  const allHealthy = Object.values(checks.checks).every(c => c.status === 'healthy')
  if (!allHealthy) {
    checks.status = 'degraded'
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(checks)
}

/**
 * Detailed health check with metrics
 */
export const detailedHealthCheck = async (req, res) => {
  try {
    const [
      rolloverStats,
      pendingCount,
      recentErrors
    ] = await Promise.all([
      // Rollover statistics
      Rollover.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            avgNewPrincipal: { $avg: '$newTotalRepayment' }
          }
        }
      ]),
      
      // Count pending rollovers
      Rollover.countDocuments({ status: 'pending' }),
      
      // Recent errors (rejected rollovers in last 24h)
      Rollover.countDocuments({
        status: 'rejected',
        rejectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ])

    const stats = rolloverStats[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      avgNewPrincipal: 0
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'rollover-management',
      version: '1.0.0',
      metrics: {
        totalRollovers: stats.total,
        pendingRollovers: stats.pending,
        approvedRollovers: stats.approved,
        rejectedRollovers: stats.rejected,
        recentRejections: recentErrors,
        averageNewPrincipal: Math.round(stats.avgNewPrincipal || 0),
        approvalRate: stats.total > 0 
          ? Math.round((stats.approved / stats.total) * 100) 
          : 0
      },
      dependencies: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          type: 'mongodb'
        }
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
}

/**
 * Readiness check - is the service ready to accept traffic?
 */
export const readinessCheck = async (req, res) => {
  const checks = {
    database: mongoose.connection.readyState === 1,
    rolloverCollection: false
  }

  try {
    await Rollover.findOne()
    checks.rolloverCollection = true
  } catch (error) {
    checks.rolloverCollection = false
  }

  const isReady = Object.values(checks).every(v => v)

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks
  })
}

/**
 * Liveness check - is the service alive?
 */
export const livenessCheck = (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  })
}

/**
 * Get system status for monitoring dashboard
 */
export const getSystemStatus = async (req, res) => {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)

    // Activity in last hour
    const hourlyActivity = await Rollover.countDocuments({
      createdAt: { $gte: oneHourAgo }
    })

    // Activity in last 24 hours
    const dailyActivity = await Rollover.countDocuments({
      createdAt: { $gte: oneDayAgo }
    })

    // Pending queue depth
    const queueDepth = await Rollover.countDocuments({
      status: { $in: ['pending', 'awaiting_admin_approval'] }
    })

    res.json({
      system: {
        status: 'operational',
        lastChecked: now.toISOString()
      },
      rolloverService: {
        status: 'operational',
        hourlyActivity,
        dailyActivity,
        queueDepth,
        averageWaitTime: '2-4 hours'
      },
      recommendations: queueDepth > 20 
        ? 'High queue depth - consider allocating more admin resources'
        : queueDepth > 10 
        ? 'Moderate queue depth - monitoring recommended'
        : 'Queue is healthy'
    })
  } catch (error) {
    res.status(500).json({
      system: { status: 'degraded' },
      error: error.message
    })
  }
}
