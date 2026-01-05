import express from 'express'
import { body, param, validationResult } from 'express-validator'
import SheetRow from '../models/SheetRow.js'
import SheetDefinition from '../models/SheetDefinition.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import RowLock from '../models/RowLock.js'
import { authenticate } from '../middleware/auth.js'
import { checkSheetAccess } from '../middleware/sheetAccess.js'
import { checkRowOwnership } from '../middleware/rowLevelSecurity.js'
import { requireApprovalPermission } from '../middleware/permissionValidator.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Submit row for review
router.post('/:sheetId/rows/:rowId/submit',
  authenticate,
  checkSheetAccess('canSubmit'),
  checkRowOwnership('update'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { notes } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = req.targetRow
      
      if (row.status !== 'draft' && row.status !== 'returned') {
        return res.status(400).json({
          error: 'Only draft or returned rows can be submitted for review',
          currentStatus: row.status
        })
      }
      
      // Update status
      const oldStatus = row.status
      row.status = 'pending_review'
      row.submittedBy = req.adminId
      row.submittedAt = new Date()
      row.updatedBy = req.adminId
      row.reviewNotes = '' // Clear previous review notes
      
      // Release any lock
      await RowLock.releaseLock(sheetId, row._id, req.adminId)
      
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'submit',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          previousStatus: oldStatus,
          newStatus: 'pending_review',
          notes
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Row submitted for review'
      })
    } catch (error) {
      console.error('Submit row error:', error)
      res.status(500).json({ error: 'Failed to submit row' })
    }
  }
)

// Approve row
router.post('/:sheetId/rows/:rowId/approve',
  authenticate,
  checkSheetAccess('canApprove'),
  requireApprovalPermission(),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { notes } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      if (row.status !== 'pending_review') {
        return res.status(400).json({
          error: 'Only pending_review rows can be approved',
          currentStatus: row.status
        })
      }
      
      // Check if user is trying to approve their own submission
      if (row.submittedBy && row.submittedBy.toString() === req.adminId.toString()) {
        return res.status(403).json({
          error: 'You cannot approve your own submissions'
        })
      }
      
      const oldStatus = row.status
      
      // Approve
      row.status = 'approved'
      row.reviewedBy = req.adminId
      row.reviewedAt = new Date()
      row.reviewNotes = notes || ''
      row.updatedBy = req.adminId
      row.lockedBy = null // Release any lock
      
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'approve',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          previousStatus: oldStatus,
          newStatus: 'approved',
          notes
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Row approved successfully'
      })
    } catch (error) {
      console.error('Approve row error:', error)
      res.status(500).json({ error: 'Failed to approve row' })
    }
  }
)

// Reject row
router.post('/:sheetId/rows/:rowId/reject',
  authenticate,
  checkSheetAccess('canApprove'),
  requireApprovalPermission(),
  [
    body('reason').trim().notEmpty().withMessage('Rejection reason is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { reason } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      if (row.status !== 'pending_review') {
        return res.status(400).json({
          error: 'Only pending_review rows can be rejected',
          currentStatus: row.status
        })
      }
      
      const oldStatus = row.status
      
      // Reject
      row.status = 'rejected'
      row.reviewedBy = req.adminId
      row.reviewedAt = new Date()
      row.reviewNotes = reason
      row.updatedBy = req.adminId
      
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'reject',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          previousStatus: oldStatus,
          newStatus: 'rejected',
          notes: reason
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Row rejected'
      })
    } catch (error) {
      console.error('Reject row error:', error)
      res.status(500).json({ error: 'Failed to reject row' })
    }
  }
)

// Return row for revision
router.post('/:sheetId/rows/:rowId/return',
  authenticate,
  checkSheetAccess('canApprove'),
  requireApprovalPermission(),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      const { notes } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      if (row.status !== 'pending_review') {
        return res.status(400).json({
          error: 'Only pending_review rows can be returned',
          currentStatus: row.status
        })
      }
      
      const oldStatus = row.status
      
      // Return for revision
      row.status = 'returned'
      row.reviewedBy = req.adminId
      row.reviewedAt = new Date()
      row.reviewNotes = notes || ''
      row.updatedBy = req.adminId
      
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'return',
        sheetId,
        sheetName: sheet.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          previousStatus: oldStatus,
          newStatus: 'returned',
          notes
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Row returned for revision'
      })
    } catch (error) {
      console.error('Return row error:', error)
      res.status(500).json({ error: 'Failed to return row' })
    }
  }
)

// Bulk approve rows
router.post('/:sheetId/approve-bulk',
  authenticate,
  checkSheetAccess('canApprove'),
  requireApprovalPermission(),
  [
    body('rowIds').isArray({ min: 1 }).withMessage('Row IDs array is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { sheetId } = req.params
      const { rowIds, notes } = req.body
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      // Find rows that can be approved
      const rows = await SheetRow.find({
        _id: { $in: rowIds },
        sheetId,
        isDeleted: false,
        status: 'pending_review'
      })
      
      const approved = []
      const skipped = []
      const errors = []
      
      for (const row of rows) {
        try {
          // Check if user is trying to approve their own submission
          if (row.submittedBy && row.submittedBy.toString() === req.adminId.toString()) {
            skipped.push({ rowId: row._id, reason: 'Cannot approve own submission' })
            continue
          }
          
          const oldStatus = row.status
          row.status = 'approved'
          row.reviewedBy = req.adminId
          row.reviewedAt = new Date()
          row.reviewNotes = notes || ''
          row.updatedBy = req.adminId
          row.lockedBy = null
          
          await row.save()
          approved.push(row._id)
        } catch (err) {
          errors.push({ rowId: row._id, error: err.message })
        }
      }
      
      // Log audit
      await SheetAuditLog.log({
        action: 'approve',
        sheetId,
        sheetName: sheet.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          notes: `Bulk approved ${approved.length} rows`,
          bulkOperationId: Date.now().toString()
        },
        result: errors.length === 0 ? 'success' : 'partial',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        approved: approved.length,
        skipped: skipped.length,
        errors: errors.length,
        skippedDetails: skipped,
        errorDetails: errors,
        message: `Approved ${approved.length} rows`
      })
    } catch (error) {
      console.error('Bulk approve error:', error)
      res.status(500).json({ error: 'Failed to approve rows' })
    }
  }
)

// Get pending approvals for user
router.get('/:sheetId/pending-approvals',
  authenticate,
  checkSheetAccess('canApprove'),
  async (req, res) => {
    try {
      const { sheetId } = req.params
      
      const query = {
        sheetId,
        isDeleted: false,
        status: 'pending_review',
        submittedBy: { $ne: req.adminId } // Exclude own submissions
      }
      
      // For non-super-admins, only show rows from their scope
      if (req.admin.role !== 'super_admin') {
        const userScope = req.sheetAccess?.scope || 'all'
        if (userScope !== 'all') {
          query.$or = [
            { primaryAssignee: req.adminId },
            { assignedTo: req.adminId }
          ]
        }
      }
      
      const rows = await SheetRow.find(query)
        .populate('primaryAssignee', 'name email')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('submittedBy', 'name email')
        .sort({ submittedAt: 1 })
      
      const total = await SheetRow.countDocuments(query)
      
      res.json({
        rows,
        count: rows.length,
        total
      })
    } catch (error) {
      console.error('Get pending approvals error:', error)
      res.status(500).json({ error: 'Failed to fetch pending approvals' })
    }
  }
)

// Lock row for editing
router.post('/:sheetId/rows/:rowId/lock',
  authenticate,
  checkSheetAccess('canEdit'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet || !sheet.concurrency?.enableLocking) {
        return res.status(400).json({ error: 'Locking is not enabled for this sheet' })
      }
      
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      const lockResult = await RowLock.acquireLock(
        sheetId,
        row._id,
        req.adminId,
        sheet.concurrency.lockTimeoutMinutes || 15
      )
      
      if (!lockResult.success) {
        return res.status(423).json({
          error: 'Row is locked by another user',
          lockedBy: lockResult.lock?.lockedBy,
          lockedAt: lockResult.lock?.lockedAt
        })
      }
      
      // Update row lock info
      row.lockedBy = req.adminId
      row.lockedAt = new Date()
      await row.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'lock',
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
      
      res.json({
        lock: lockResult.lock,
        message: 'Row locked successfully'
      })
    } catch (error) {
      console.error('Lock row error:', error)
      res.status(500).json({ error: 'Failed to lock row' })
    }
  }
)

// Unlock row
router.post('/:sheetId/rows/:rowId/unlock',
  authenticate,
  checkSheetAccess('canEdit'),
  async (req, res) => {
    try {
      const { sheetId, rowId } = req.params
      
      const released = await RowLock.releaseLock(sheetId, rowId, req.adminId)
      
      if (released) {
        // Update row
        await SheetRow.findOneAndUpdate(
          { _id: rowId, sheetId },
          { $set: { lockedBy: null, lockedAt: null } }
        )
        
        const sheet = await SheetDefinition.findOne({ sheetId })
        
        // Log audit
        await SheetAuditLog.log({
          action: 'unlock',
          sheetId,
          sheetName: sheet?.name,
          rowId,
          userId: req.adminId,
          userName: req.admin.name,
          userEmail: req.admin.email,
          userRole: req.admin.role,
          result: 'success',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
      }
      
      res.json({
        released,
        message: released ? 'Row unlocked' : 'No lock found'
      })
    } catch (error) {
      console.error('Unlock row error:', error)
      res.status(500).json({ error: 'Failed to unlock row' })
    }
  }
)

export default router
