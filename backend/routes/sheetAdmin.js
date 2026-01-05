import express from 'express'
import { body, param, validationResult } from 'express-validator'
import SheetDefinition from '../models/SheetDefinition.js'
import SheetAssignment from '../models/SheetAssignment.js'
import SheetRow from '../models/SheetRow.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import Admin from '../models/Admin.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

/**
 * GET /api/sheet-admin/dashboard
 * Get admin dashboard data
 */
router.get('/dashboard', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalSheets,
      activeSheets,
      totalAssignments,
      recentActivity,
      sheetStats
    ] = await Promise.all([
      SheetDefinition.countDocuments(),
      SheetDefinition.countDocuments({ status: 'active' }),
      SheetAssignment.countDocuments({ status: 'active' }),
      SheetAuditLog.find().sort({ timestamp: -1 }).limit(10),
      SheetDefinition.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ])
    
    // Get activity by action
    const activityByAction = await SheetAuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
    
    res.json({
      overview: {
        totalSheets,
        activeSheets,
        totalAssignments,
        activeAdmins: await Admin.countDocuments({ status: 'active' })
      },
      sheetStats,
      activityByAction,
      recentActivity
    })
  } catch (error) {
    console.error('Get admin dashboard error:', error)
    res.status(500).json({ error: 'Failed to retrieve dashboard data' })
  }
})

/**
 * POST /api/sheet-admin/sheets
 * Create a new sheet definition
 */
router.post('/sheets',
  authenticate,
  requireSuperAdmin,
  [
    body('sheetId').isString().trim().notEmpty().isLowercase(),
    body('name').isString().trim().notEmpty(),
    body('columns').isArray({ min: 1 })
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId, name, description, category, columns, workflow, ui, rowAssignment } = req.body
      
      // Check if sheetId exists
      const existing = await SheetDefinition.findOne({ sheetId })
      if (existing) {
        return res.status(400).json({ error: 'Sheet ID already exists' })
      }
      
      const sheet = await SheetDefinition.create({
        sheetId,
        name,
        description,
        category: category || 'operations',
        columns,
        workflow,
        ui,
        rowAssignment,
        createdBy: req.adminId
      })
      
      res.status(201).json({ sheet })
    } catch (error) {
      console.error('Create sheet error:', error)
      res.status(500).json({ error: 'Failed to create sheet' })
    }
  }
)

/**
 * PUT /api/sheet-admin/sheets/:sheetId
 * Update a sheet definition
 */
router.put('/sheets/:sheetId',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const updates = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      updates.version = sheet.version + 1
      updates.updatedBy = req.adminId
      
      const updated = await SheetDefinition.findOneAndUpdate(
        { sheetId },
        updates,
        { new: true }
      )
      
      res.json({ sheet: updated })
    } catch (error) {
      console.error('Update sheet error:', error)
      res.status(500).json({ error: 'Failed to update sheet' })
    }
  }
)

/**
 * GET /api/sheet-admin/sheets/:sheetId/stats
 * Get statistics for a sheet
 */
router.get('/sheets/:sheetId/stats',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      
      const [stats, statusCounts, recentRows] = await Promise.all([
        SheetRow.aggregate([
          { $match: { sheetId, isDeleted: false } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              avgVersion: { $avg: '$version' }
            }
          }
        ]),
        SheetRow.aggregate([
          { $match: { sheetId, isDeleted: false } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        SheetRow.find({ sheetId, isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('status createdAt')
      ])
      
      res.json({
        totalRows: stats[0]?.total || 0,
        avgVersion: stats[0]?.avgVersion || 1,
        statusBreakdown: statusCounts,
        recentActivity: recentRows
      })
    } catch (error) {
      console.error('Get sheet stats error:', error)
      res.status(500).json({ error: 'Failed to retrieve sheet statistics' })
    }
  }
)

/**
 * POST /api/sheet-admin/sheets/:sheetId/seed
 * Seed a sheet with initial data (for testing)
 */
router.post('/sheets/:sheetId/seed',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const { count = 10, sampleData } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const rows = []
      for (let i = 0; i < count; i++) {
        const data = {}
        for (const col of sheet.columns) {
          if (col.defaultValue !== undefined) {
            data[col.key] = col.defaultValue
          } else if (col.type === 'text') {
            data[col.key] = `${col.label} ${i + 1}`
          } else if (col.type === 'number') {
            data[col.key] = Math.floor(Math.random() * 1000)
          } else if (col.type === 'enum' && col.validation?.enumValues) {
            data[col.key] = col.validation.enumValues[0]
          }
        }
        
        rows.push({
          sheetId,
          data,
          status: 'draft',
          createdBy: req.adminId,
          primaryAssignee: req.adminId
        })
      }
      
      const created = await SheetRow.insertMany(rows)
      
      res.json({
        message: `${created.length} rows created`,
        rows: created.length
      })
    } catch (error) {
      console.error('Seed sheet error:', error)
      res.status(500).json({ error: 'Failed to seed sheet' })
    }
  }
)

/**
 * GET /api/sheet-admin/staff
 * Get all staff members for assignment
 */
router.get('/staff', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 50 } = req.query
    
    const filter = {}
    if (status) filter.status = status
    if (role) filter.role = role
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [staff, total] = await Promise.all([
      Admin.find(filter)
        .select('name email role status createdAt')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Admin.countDocuments(filter)
    ])
    
    // Get their current assignments
    const assignments = await SheetAssignment.find({
      adminId: { $in: staff.map(s => s._id) },
      status: 'active'
    }).select('adminId sheetId permissions')
    
    const staffWithAssignments = staff.map(s => ({
      ...s.toObject(),
      sheetAssignments: assignments.filter(a => a.adminId.toString() === s._id.toString())
    }))
    
    res.json({
      staff: staffWithAssignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get staff error:', error)
    res.status(500).json({ error: 'Failed to retrieve staff' })
  }
})

/**
 * POST /api/sheet-admin/reassign-rows
 * Bulk reassign rows between staff
 */
router.post('/reassign-rows',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId, fromStaffId, toStaffId, rowIds, reason } = req.body
      
      let query = { sheetId, isDeleted: false }
      
      if (rowIds && rowIds.length > 0) {
        query._id = { $in: rowIds }
      } else if (fromStaffId) {
        query.primaryAssignee = fromStaffId
      } else {
        return res.status(400).json({ error: 'Must specify rowIds or fromStaffId' })
      }
      
      const result = await SheetRow.updateMany(
        query,
        {
          $set: {
            primaryAssignee: toStaffId,
            assignedTo: [toStaffId],
            updatedBy: req.adminId
          }
        }
      )
      
      // Log the action
      await SheetAuditLog.log({
        action: 'reassign',
        sheetId,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        result: 'success',
        context: {
          notes: `Bulk reassigned ${result.modifiedCount} rows from staff ${fromStaffId} to ${toStaffId}`,
          previousStatus: fromStaffId,
          newStatus: toStaffId
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        message: `${result.modifiedCount} rows reassigned`,
        modifiedCount: result.modifiedCount
      })
    } catch (error) {
      console.error('Reassign rows error:', error)
      res.status(500).json({ error: 'Failed to reassign rows' })
    }
  }
)

/**
 * POST /api/sheet-admin/lock-rows
 * Lock rows (admin override)
 */
router.post('/lock-rows',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId, rowIds, reason } = req.body
      
      const result = await SheetRow.updateMany(
        { _id: { $in: rowIds }, sheetId },
        {
          $set: {
            status: 'locked',
            lockedBy: req.adminId,
            lockedAt: new Date(),
            lockExpiresAt: null, // Admin lock doesn't expire
            updatedBy: req.adminId
          }
        }
      )
      
      res.json({
        message: `${result.modifiedCount} rows locked`,
        modifiedCount: result.modifiedCount
      })
    } catch (error) {
      console.error('Lock rows error:', error)
      res.status(500).json({ error: 'Failed to lock rows' })
    }
  }
)

/**
 * POST /api/sheet-admin/unlock-rows
 * Unlock rows (admin override)
 */
router.post('/unlock-rows',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { sheetId, rowIds, reason, unlockStatus } = req.body
      
      const update = {
        $set: {
          lockedBy: null,
          lockedAt: null,
          lockExpiresAt: null,
          updatedBy: req.adminId
        }
      }
      
      if (unlockStatus) {
        update.$set.status = unlockStatus
      }
      
      const result = await SheetRow.updateMany(
        { _id: { $in: rowIds }, sheetId },
        update
      )
      
      res.json({
        message: `${result.modifiedCount} rows unlocked`,
        modifiedCount: result.modifiedCount
      })
    } catch (error) {
      console.error('Unlock rows error:', error)
      res.status(500).json({ error: 'Failed to unlock rows' })
    }
  }
)

export default router
