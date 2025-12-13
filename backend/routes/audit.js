import express from 'express'
import AuditLog from '../models/AuditLog.js'
import { authenticate, requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

// Get audit logs (Super Admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { action, resourceType, admin, page = 1, limit = 50, startDate, endDate } = req.query
    
    let query = {}
    if (action) query.action = action
    if (resourceType) query.resourceType = resourceType
    if (admin) query.admin = admin
    
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }
    
    const skip = (page - 1) * limit
    const logs = await AuditLog.find(query)
      .populate('admin', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
    
    const total = await AuditLog.countDocuments(query)
    
    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get audit log by ID
router.get('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('admin', 'name email')
    
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' })
    }
    
    res.json(log)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
