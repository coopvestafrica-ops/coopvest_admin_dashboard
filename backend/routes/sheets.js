import express from 'express'
import { body, param, query, validationResult } from 'express-validator'
import SheetDefinition from '../models/SheetDefinition.js'
import SheetAssignment from '../models/SheetAssignment.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/auth.js'
import { checkSheetAccess } from '../middleware/sheetAccess.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Get all sheet definitions (admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { status = 'active', category, search } = req.query
    
    const filter = {}
    if (status !== 'all') filter.status = status
    if (category) filter.category = category
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sheetId: { $regex: search, $options: 'i' } }
      ]
    }
    
    const sheets = await SheetDefinition.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
    
    res.json({ sheets })
  } catch (error) {
    console.error('Get sheets error:', error)
    res.status(500).json({ error: 'Failed to fetch sheets' })
  }
})

// Get user's allowed sheets
router.get('/my-sheets', authenticate, async (req, res) => {
  try {
    if (req.admin.role === 'super_admin') {
      const allSheets = await SheetDefinition.find({ status: 'active' })
      return res.json({
        allowedSheets: allSheets.map(s => ({
          sheetId: s.sheetId,
          name: s.name,
          description: s.description,
          category: s.category,
          permissions: {
            canView: true,
            canEdit: true,
            canCreate: true,
            canDelete: true,
            canSubmit: true,
            canApprove: true,
            canAssignRows: true,
            canReassign: true,
            canExport: true,
            canViewAudit: true,
            canManage: true
          },
          workflow: s.workflow,
          ui: s.ui
        }))
      })
    }
    
    const assignments = await SheetAssignment.find({
      adminId: req.adminId,
      status: 'active',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    
    if (!assignments.length) {
      return res.json({ allowedSheets: [] })
    }
    
    const sheetIds = assignments.map(a => a.sheetId)
    const sheets = await SheetDefinition.find({
      sheetId: { $in: sheetIds },
      status: 'active'
    })
    
    res.json({
      allowedSheets: sheets.map(sheet => {
        const assignment = assignments.find(a => a.sheetId === sheet.sheetId)
        return {
          sheetId: sheet.sheetId,
          name: sheet.name,
          description: sheet.description,
          category: sheet.category,
          permissions: assignment.permissions,
          scope: assignment.scope,
          workflow: sheet.workflow,
          ui: sheet.ui
        }
      })
    })
  } catch (error) {
    console.error('Get user sheets error:', error)
    res.status(500).json({ error: 'Failed to fetch user sheets' })
  }
})

// Get single sheet definition
router.get('/:sheetId', authenticate, checkSheetAccess('canView'), async (req, res) => {
  try {
    const sheet = req.sheetDefinition
    res.json({ sheet })
  } catch (error) {
    console.error('Get sheet error:', error)
    res.status(500).json({ error: 'Failed to fetch sheet' })
  }
})

// Create new sheet definition (admin only)
router.post('/',
  authenticate,
  requireSuperAdmin,
  [
    body('sheetId').trim().notEmpty().withMessage('Sheet ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('columns').isArray({ min: 1 }).withMessage('At least one column is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId, name, description, category, columns, workflow, ui, rowAssignment, concurrency } = req.body
      
      // Check if sheetId already exists
      const existing = await SheetDefinition.findOne({ sheetId })
      if (existing) {
        return res.status(400).json({ error: 'Sheet ID already exists' })
      }
      
      const sheet = await SheetDefinition.create({
        sheetId,
        name,
        description,
        category,
        columns,
        workflow,
        ui,
        rowAssignment,
        concurrency,
        createdBy: req.adminId
      })
      
      // Log audit
      await SheetAuditLog.log({
        action: 'configure',
        sheetId,
        sheetName: name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        notes: 'Sheet definition created'
      })
      
      res.status(201).json({ sheet, message: 'Sheet created successfully' })
    } catch (error) {
      console.error('Create sheet error:', error)
      res.status(500).json({ error: 'Failed to create sheet' })
    }
  }
)

// Update sheet definition (admin only)
router.put('/:sheetId',
  authenticate,
  requireSuperAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('columns').optional().isArray()
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const updates = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      // Track what changed
      const changes = []
      if (updates.columns && JSON.stringify(updates.columns) !== JSON.stringify(sheet.columns)) {
        changes.push({ field: 'columns', oldValue: 'existing columns', newValue: 'updated columns' })
      }
      
      // Apply updates
      Object.assign(sheet, updates)
      sheet.version += 1
      sheet.updatedBy = req.adminId
      await sheet.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'configure',
        sheetId,
        sheetName: sheet.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes,
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        notes: 'Sheet definition updated'
      })
      
      res.json({ sheet, message: 'Sheet updated successfully' })
    } catch (error) {
      console.error('Update sheet error:', error)
      res.status(500).json({ error: 'Failed to update sheet' })
    }
  }
)

// Update sheet columns (admin only)
router.put('/:sheetId/columns', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params
    const { columns } = req.body
    
    const sheet = await SheetDefinition.findOne({ sheetId })
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' })
    }
    
    sheet.columns = columns
    sheet.version += 1
    sheet.updatedBy = req.adminId
    await sheet.save()
    
    await SheetAuditLog.log({
      action: 'configure',
      sheetId,
      sheetName: sheet.name,
      userId: req.adminId,
      userName: req.admin.name,
      userEmail: req.admin.email,
      userRole: req.admin.role,
      changes: [{ field: 'columns', oldValue: 'old', newValue: 'updated' }],
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      notes: 'Sheet columns updated'
    })
    
    res.json({ sheet, message: 'Columns updated successfully' })
  } catch (error) {
    console.error('Update columns error:', error)
    res.status(500).json({ error: 'Failed to update columns' })
  }
})

// Deactivate sheet (admin only)
router.put('/:sheetId/deactivate', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params
    
    const sheet = await SheetDefinition.findOne({ sheetId })
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' })
    }
    
    sheet.status = 'inactive'
    sheet.updatedBy = req.adminId
    await sheet.save()
    
    await SheetAuditLog.log({
      action: 'configure',
      sheetId,
      sheetName: sheet.name,
      userId: req.adminId,
      userName: req.admin.name,
      userEmail: req.admin.email,
      userRole: req.admin.role,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      notes: 'Sheet deactivated'
    })
    
    res.json({ message: 'Sheet deactivated successfully' })
  } catch (error) {
    console.error('Deactivate sheet error:', error)
    res.status(500).json({ error: 'Failed to deactivate sheet' })
  }
})

// Delete sheet (admin only)
router.delete('/:sheetId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params
    
    const sheet = await SheetDefinition.findOne({ sheetId })
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' })
    }
    
    // Check if sheet has data
    const SheetRow = (await import('../models/SheetRow.js')).default
    const rowCount = await SheetRow.countDocuments({ sheetId, isDeleted: false })
    if (rowCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete sheet with existing data. Archive it instead.',
        rowCount
      })
    }
    
    await sheet.deleteOne()
    
    await SheetAuditLog.log({
      action: 'configure',
      sheetId,
      sheetName: sheet.name,
      userId: req.adminId,
      userName: req.admin.name,
      userEmail: req.admin.email,
      userRole: req.admin.role,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      notes: 'Sheet deleted'
    })
    
    res.json({ message: 'Sheet deleted successfully' })
  } catch (error) {
    console.error('Delete sheet error:', error)
    res.status(500).json({ error: 'Failed to delete sheet' })
  }
})

export default router
