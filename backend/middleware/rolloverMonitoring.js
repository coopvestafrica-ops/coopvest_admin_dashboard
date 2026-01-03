/**
 * Rollover Monitoring Middleware
 * Tracks all rollover-related operations for audit and metrics
 */

import Rollover from '../models/Rollover.js'
import AuditLog from '../models/AuditLog.js'

/**
 * Track rollover view events
 */
export const trackRolloverView = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res)
  
  // Override json to track after response
  res.json = function(data) {
    // Log rollover view if endpoint was successful
    if (req.method === 'GET' && req.path.includes('/rollovers') && res.statusCode < 400) {
      const adminId = req.admin?._id
      if (adminId) {
        logRolloverView(req, data, adminId).catch(console.error)
      }
    }
    return originalJson(data)
  }
  
  next()
}

/**
 * Log rollover view to audit trail
 */
async function logRolloverView(req, data, adminId) {
  try {
    await AuditLog.create({
      adminId,
      action: 'rollover_view',
      resourceType: 'rollover',
      resourceId: req.params.id || null,
      details: {
        endpoint: req.path,
        query: req.query,
        resultCount: Array.isArray(data?.rollovers) ? data.rollovers.length : 1
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')
    })
  } catch (error) {
    console.error('Error logging rollover view:', error)
  }
}

/**
 * Track rollover approval/rejection events
 */
export const trackRolloverAction = async (req, res, next) => {
  const originalJson = res.json.bind(res)
  
  res.json = function(data) {
    if ((req.path.includes('/approve') || req.path.includes('/reject')) && res.statusCode < 400) {
      const adminId = req.admin?._id
      const action = req.path.includes('/approve') ? 'rollover_approved' : 'rollover_rejected'
      
      if (adminId && data?.rollover) {
        logRolloverAction(req, data, adminId, action).catch(console.error)
      }
    }
    return originalJson(data)
  }
  
  next()
}

async function logRolloverAction(req, data, adminId, action) {
  try {
    await AuditLog.create({
      adminId,
      action,
      resourceType: 'rollover',
      resourceId: data.rollover._id || data.rollover.id,
      resourceName: `Rollover for ${data.rollover.memberName}`,
      details: {
        originalLoanId: data.rollover.originalLoanId,
        newTerms: {
          tenure: data.rollover.newTenure,
          interestRate: data.rollover.newInterestRate,
          monthlyRepayment: data.rollover.newMonthlyRepayment
        },
        reason: req.body?.reason || null,
        notes: req.body?.notes || null
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')
    })
  } catch (error) {
    console.error('Error logging rollover action:', error)
  }
}

/**
 * Get rollover metrics for dashboard
 */
export const getRolloverMetrics = async (req, res) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.setHours(0, 0, 0, 0))
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Aggregate metrics
    const [
      todayStats,
      weekStats,
      monthStats,
      statusDistribution,
      averageProcessingTime
    ] = await Promise.all([
      // Today's activity
      Rollover.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      
      // This week's activity
      Rollover.aggregate([
        { $match: { createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      
      // This month's activity
      Rollover.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      
      // Status distribution
      Rollover.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Average processing time for approved rollovers
      Rollover.aggregate([
        { 
          $match: { 
            status: 'approved',
            approvedAt: { $exists: true },
            requestedAt: { $exists: true }
          } 
        },
        {
          $project: {
            processingTimeDays: {
              $divide: [
                { $subtract: ['$approvedAt', '$requestedAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averageDays: { $avg: '$processingTimeDays' }
          }
        }
      ])
    ])

    res.json({
      metrics: {
        todayRequests: todayStats[0]?.count || 0,
        weekRequests: weekStats[0]?.count || 0,
        monthRequests: monthStats[0]?.count || 0,
        averageProcessingDays: Math.round((averageProcessingTime[0]?.averageDays || 0) * 10) / 10
      },
      statusDistribution: statusDistribution.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get recent rollover activity for dashboard
 */
export const getRecentRolloverActivity = async (req, res) => {
  try {
    const recentRollovers = await Rollover.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('memberName originalPrincipal newTotalRepayment status updatedAt')
      .lean()

    res.json({ activity: recentRollovers })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * Rollover rate limiting configuration
 */
export const rolloverRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max requests per window
  message: 'Too many rollover requests, please try again later'
}
