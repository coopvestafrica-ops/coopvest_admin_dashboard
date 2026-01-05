import express from 'express'
import { query, param, validationResult } from 'express-validator'
import SheetAuditLog from '../models/SheetAuditLog.js'
import SheetDefinition from '../models/SheetDefinition.js'
import SheetRow from '../models/SheetRow.js'
import Admin from '../models/Admin.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

// Get audit logs for a sheet
router.get('/sheet/:sheetId',
  authenticate,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const {
        page = 1,
        limit = 50,
        action,
        startDate,
        endDate,
        userId
      } = req.query
      
      // Check access
      if (req.admin.role !== 'super_admin') {
        const hasAccess = await checkSheetAuditAccess(req.adminId, sheetId)
        if (!hasAccess) {
          return res.status(403).json({ error: 'No audit access to this sheet' })
        }
      }
      
      const filter = { sheetId }
      
      if (action) filter.action = action
      if (userId) filter.userId = userId
      
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      const [logs, total] = await Promise.all([
        SheetAuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'name email'),
        SheetAuditLog.countDocuments(filter)
      ])
      
      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get sheet audit logs error:', error)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }
)

// Get audit logs for a specific row
router.get('/sheet/:sheetId/row/:rowId',
  authenticate,
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { limit = 50 } = req.query
      
      // Check access
      if (req.admin.role !== 'super_admin') {
        const hasAccess = await checkSheetAuditAccess(req.adminId, sheetId)
        if (!hasAccess) {
          return res.status(403).json({ error: 'No audit access to this sheet' })
        }
      }
      
      const logs = await SheetAuditLog.find({ sheetId, rowId })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .populate('userId', 'name email')
      
      res.json({ logs })
    } catch (error) {
      console.error('Get row audit logs error:', error)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }
)

// Get user's activity logs
router.get('/user/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params
      const { page = 1, limit = 50, startDate, endDate } = req.query
      
      // Only allow users to see their own activity, or admins to see anyone's
      if (req.admin.role !== 'super_admin' && req.adminId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized' })
      }
      
      const filter = { userId }
      
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      const [logs, total] = await Promise.all([
        SheetAuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('sheetId', 'name'),
        SheetAuditLog.countDocuments(filter)
      ])
      
      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get user audit logs error:', error)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }
)

// Get admin audit report
router.get('/report',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'action' } = req.query
      
      const match = {}
      
      if (startDate || endDate) {
        match.timestamp = {}
        if (startDate) match.timestamp.$gte = new Date(startDate)
        if (endDate) match.timestamp.$lte = new Date(endDate)
      }
      
      const report = await SheetAuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: `$${groupBy}`,
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ])
      
      // Get activity by user
      const userActivity = await SheetAuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            userName: { $first: '$userName' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
      
      res.json({
        report,
        userActivity
      })
    } catch (error) {
      console.error('Get audit report error:', error)
      res.status(500).json({ error: 'Failed to generate report' })
    }
  }
)

// Get all audit logs (super admin only)
router.get('/all',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        sheetId,
        action,
        userId,
        result,
        startDate,
        endDate
      } = req.query
      
      const filter = {}
      
      if (sheetId) filter.sheetId = sheetId
      if (action) filter.action = action
      if (userId) filter.userId = userId
      if (result) filter.result = result
      
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      const [logs, total] = await Promise.all([
        SheetAuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'name email'),
        SheetAuditLog.countDocuments(filter)
      ])
      
      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get all audit logs error:', error)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }
)

// Helper function to check sheet audit access
async function checkSheetAuditAccess(adminId, sheetId) {
  const assignment = await (await import('../models/SheetAssignment.js')).default.findOne({
    adminId,
    sheetId,
    status: 'active'
  })
  
  return assignment?.permissions?.canViewAudit || false
}

export default router
