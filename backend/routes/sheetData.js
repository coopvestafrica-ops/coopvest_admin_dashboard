import express from 'express'
import { body, param, query, validationResult } from 'express-validator'
import SheetRow from '../models/SheetRow.js'
import RowLock from '../models/RowLock.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import SheetDefinition from '../models/SheetDefinition.js'
import { authenticate } from '../middleware/auth.js'
import { checkSheetAccess } from '../middleware/sheetAccess.js'
import { enforceRowLevelSecurity, checkRowOwnership, attachRowFilter } from '../middleware/rowLevelSecurity.js'
import { requirePermission } from '../middleware/permissionValidator.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Get rows with filtering, sorting, pagination
router.get('/:sheetId/rows',
  authenticate,
  checkSheetAccess('canView'),
  enforceRowLevelSecurity(),
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        search,
        assignedTo,
        priority,
        startDate,
        endDate
      } = req.query
      
      // Build query
      const queryFilter = { sheetId, isDeleted: false }
      
      // Apply row-level security filter
      if (req.rowFilter) {
        Object.assign(queryFilter, req.rowFilter)
      }
      
      // Apply filters
      if (status) queryFilter.status = status
      if (priority) queryFilter.priority = priority
      if (assignedTo) queryFilter.primaryAssignee = assignedTo
      
      // Date range filter
      if (startDate || endDate) {
        queryFilter.createdAt = {}
        if (startDate) queryFilter.createdAt.$gte = new Date(startDate)
        if (endDate) queryFilter.createdAt.$lte = new Date(endDate)
      }
      
      // Search filter (searches across all data fields)
      if (search) {
        queryFilter.$or = queryFilter.$or || []
        queryFilter.$or.push({
          'data': { $regex: search, $options: 'i' }
        })
      }
      
      // Get sheet for column info
      const sheet = await SheetDefinition.findOne({ sheetId })
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      // Get total count
      const total = await SheetRow.countDocuments(queryFilter)
      
      // Get rows
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      
      const rows = await SheetRow.find(queryFilter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('primaryAssignee', 'name email')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean()
      
      // Get active locks for these rows
      const rowIds = rows.map(r => r._id)
      const activeLocks = await RowLock.find({
        sheetId,
        rowId: { $in: rowIds },
        expiresAt: { $gt: new Date() }
      }).lean()
      
      // Map locks to rows
      const lockedRows = new Set(activeLocks.map(l => l.rowId.toString()))
      
      res.json({
        rows: rows.map(row => ({
          ...row,
          isLocked: lockedRows.has(row._id.toString())
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        columns: sheet?.columns || []
      })
    } catch (error) {
      console.error('Get rows error:', error)
      res.status(500).json({ error: 'Failed to fetch rows' })
    }
  }
)

// Get single row
router.get('/:sheetId/rows/:rowId',
  authenticate,
  checkSheetAccess('canView'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
        .populate('primaryAssignee', 'name email')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('submittedBy', 'name email')
        .populate('reviewedBy', 'name email')
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      // Check row-level security
      if (req.admin.role !== 'super_admin' && req.sheetAccess?.scope !== 'all') {
        const adminId = req.adminId.toString()
        const canAccess = 
          row.primaryAssignee?._id?.toString() === adminId ||
          row.assignedTo?.some(a => a._id.toString() === adminId) ||
          (req.sheetAccess?.scope === 'own_rows' && row.createdBy._id.toString() === adminId)
        
        if (!canAccess) {
          return res.status(403).json({ error: 'You do not have access to this row' })
        }
      }
      
      // Get lock info
      const lock = await RowLock.findOne({
        sheetId,
        rowId: row._id,
        expiresAt: { $gt: new Date() }
      }).populate('lockedBy', 'name email')
      
      res.json({ row, lock })
    } catch (error) {
      console.error('Get row error:', error)
      res.status(500).json({ error: 'Failed to fetch row' })
    }
  }
)

// Create new row
router.post('/:sheetId/rows',
  authenticate,
  checkSheetAccess('canCreate'),
  [
    body('data').isObject().withMessage('Data object is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const { data, assignedTo, priority, tags, metadata } = req.body
      
      // Get sheet for validation
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      // Validate required columns
      const missingRequired = []
      for (const col of sheet.columns) {
        if (col.required && (data[col.key] === undefined || data[col.key] === null || data[col.key] === '')) {
          missingRequired.push(col.label)
        }
      }
      
      if (missingRequired.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields: missingRequired
        })
      }
      
      // Create row
      const rowData = {
        sheetId,
        data,
        status: sheet.workflow?.defaultStatus || 'draft',
        priority: priority || 'medium',
        tags: tags || [],
        metadata: metadata || {},
        createdBy: req.adminId
      }
      
      // Auto-assign if configured
      if (sheet.rowAssignment?.autoAssignOnCreate) {
        rowData.primaryAssignee = req.adminId
        rowData.assignedTo = [req.adminId]
      } else if (assignedTo) {
        rowData.primaryAssignee = assignedTo
        rowData.assignedTo = [assignedTo]
      }
      
      const row = await SheetRow.create(rowData)
      
      // Log audit
      await SheetAuditLog.log({
        action: 'create',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: Object.entries(data).map(([key, value]) => ({
          field: key,
          newValue: value
        })),
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.status(201).json({ row, message: 'Row created successfully' })
    } catch (error) {
      console.error('Create row error:', error)
      res.status(500).json({ error: 'Failed to create row' })
    }
  }
)

// Update row
router.put('/:sheetId/rows/:rowId',
  authenticate,
  checkSheetAccess('canEdit'),
  checkRowOwnership('update'),
  [
    body('data').isObject().withMessage('Data object is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { data, acquireLock = true } = req.body
      
      // Get sheet for validation
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = req.targetRow
      
      // Check if approved (unless user can approve)
      if (row.status === 'approved' && !req.sheetAccess?.assignment?.permissions?.canApprove) {
        return res.status(403).json({ error: 'Cannot modify approved rows' })
      }
      
      // Acquire lock if needed
      if (acquireLock && sheet.concurrency?.enableLocking) {
        const lockResult = await RowLock.acquireLock(
          sheetId,
          row._id,
          req.adminId,
          sheet.concurrency?.lockTimeoutMinutes || 15
        )
        
        if (!lockResult.success && lockResult.isExisting) {
          return res.status(423).json({
            error: 'Row is locked by another user',
            lockedBy: lockResult.lock?.lockedBy,
            lockedAt: lockResult.lock?.lockedAt
          })
        }
        
        row.lockedBy = req.adminId
        row.lockedAt = new Date()
      }
      
      // Track changes for audit
      const changes = []
      for (const [key, newValue] of Object.entries(data)) {
        const oldValue = row.data?.get(key)
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            field: key,
            oldValue,
            newValue
          })
        }
        row.data.set(key, newValue)
      }
      
      row.version += 1
      row.updatedBy = req.adminId
      
      // Reset status if workflow requires resubmission
      if (sheet.workflow?.requireApprovalForEdit && row.status === 'approved') {
        row.status = 'draft'
      }
      
      await row.save()
      
      // Release lock
      if (sheet.concurrency?.enableLocking) {
        await RowLock.releaseLock(sheetId, row._id, req.adminId)
      }
      
      // Log audit
      if (changes.length > 0) {
        await SheetAuditLog.log({
          action: 'update',
          sheetId,
          sheetName: sheet.name,
          rowId: row._id,
          userId: req.adminId,
          userName: req.admin.name,
          userEmail: req.admin.email,
          userRole: req.admin.role,
          changes,
          result: 'success',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
      }
      
      res.json({
        row,
        changes,
        message: 'Row updated successfully'
      })
    } catch (error) {
      console.error('Update row error:', error)
      res.status(500).json({ error: 'Failed to update row' })
    }
  }
)

// Partial update row (single field)
router.patch('/:sheetId/rows/:rowId',
  authenticate,
  checkSheetAccess('canEdit'),
  checkRowOwnership('update'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { field, value } = req.body
      
      if (!field) {
        return res.status(400).json({ error: 'Field name is required' })
      }
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = req.targetRow
      
      // Check column permissions
      const column = sheet.columns.find(c => c.key === field)
      if (column?.readOnly) {
        return res.status(403).json({ error: `Column ${field} is read-only` })
      }
      
      const oldValue = row.data?.get(field)
      
      // Update field
      row.data.set(field, value)
      row.version += 1
      row.updatedBy = req.adminId
      
      // Release lock if held
      await RowLock.releaseLock(sheetId, row._id, req.adminId)
      
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'update',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [{
          field,
          oldValue,
          newValue: value
        }],
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Field updated successfully'
      })
    } catch (error) {
      console.error('Patch row error:', error)
      res.status(500).json({ error: 'Failed to update field' })
    }
  }
)

// Delete row (soft delete)
router.delete('/:sheetId/rows/:rowId',
  authenticate,
  checkSheetAccess('canDelete'),
  checkRowOwnership('delete'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = req.targetRow
      
      // Soft delete
      row.isDeleted = true
      row.deletedBy = req.adminId
      row.deletedAt = new Date()
      await row.save()
      
      // Release any lock
      await RowLock.releaseLock(sheetId, row._id, req.adminId)
      
      // Log audit
      await SheetAuditLog.log({
        action: 'delete',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({ message: 'Row deleted successfully' })
    } catch (error) {
      console.error('Delete row error:', error)
      res.status(500).json({ error: 'Failed to delete row' })
    }
  }
)

// Bulk create rows
router.post('/:sheetId/rows/bulk',
  authenticate,
  checkSheetAccess('canCreate'),
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const { rows } = req.body
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Rows array is required' })
      }
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const createdRows = []
      const errors = []
      
      for (let i = 0; i < rows.length; i++) {
        try {
          const rowData = {
            sheetId,
            data: rows[i],
            status: sheet.workflow?.defaultStatus || 'draft',
            createdBy: req.adminId,
            primaryAssignee: req.adminId,
            assignedTo: [req.adminId]
          }
          
          const row = await SheetRow.create(rowData)
          createdRows.push(row)
        } catch (err) {
          errors.push({ index: i, error: err.message })
        }
      }
      
      // Log audit
      await SheetAuditLog.log({
        action: 'bulk_update',
        sheetId,
        sheetName: sheet.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        result: errors.length === 0 ? 'success' : 'partial',
        context: {
          notes: `Bulk created ${createdRows.length} rows`
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.status(201).json({
        created: createdRows.length,
        failed: errors.length,
        errors,
        message: `Created ${createdRows.length} rows`
      })
    } catch (error) {
      console.error('Bulk create error:', error)
      res.status(500).json({ error: 'Failed to create rows' })
    }
  }
)

export default router
