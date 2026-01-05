import express from 'express'
import { body, param, validationResult } from 'express-validator'
import Admin from '../models/Admin.js'
import SheetDefinition from '../models/SheetDefinition.js'
import SheetAssignment from '../models/SheetAssignment.js'
import SheetRow from '../models/SheetRow.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/auth.js'
import { requireAssignmentPermission } from '../middleware/permissionValidator.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Get all assignments for a sheet
router.get('/sheet/:sheetId', authenticate, async (req, res) => {
  try {
    const { sheetId } = req.params
    
    // Check if user has access to this sheet
    if (req.admin.role !== 'super_admin') {
      const assignment = await SheetAssignment.findOne({
        adminId: req.adminId,
        sheetId,
        status: 'active'
      })
      
      if (!assignment) {
        return res.status(403).json({ error: 'No access to this sheet' })
      }
    }
    
    const assignments = await SheetAssignment.find({ sheetId, status: 'active' })
      .populate('adminId', 'name email role status')
      .populate('assignedBy', 'name email')
    
    res.json({ assignments })
  } catch (error) {
    console.error('Get sheet assignments error:', error)
    res.status(500).json({ error: 'Failed to fetch assignments' })
  }
})

// Get all assignments for a user
router.get('/user/:adminId', authenticate, async (req, res) => {
  try {
    const { adminId } = req.params
    
    // Only allow users to see their own assignments, or admins to see anyone's
    if (req.admin.role !== 'super_admin' && req.adminId.toString() !== adminId) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    
    const assignments = await SheetAssignment.find({
      adminId,
      status: 'active'
    })
      .populate('sheetId', 'name description category')
    
    res.json({ assignments })
  } catch (error) {
    console.error('Get user assignments error:', error)
    res.status(500).json({ error: 'Failed to fetch assignments' })
  }
})

// Assign staff to sheet
router.post('/assign',
  authenticate,
  requireSuperAdmin,
  [
    body('adminId').notEmpty().withMessage('Admin ID is required'),
    body('sheetId').notEmpty().withMessage('Sheet ID is required'),
    body('permissions').isObject().withMessage('Permissions object is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { adminId, sheetId, permissions, scope, restrictedColumns, expiresAt, notes } = req.body
      
      // Verify admin exists
      const admin = await Admin.findById(adminId)
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' })
      }
      
      // Verify sheet exists
      const sheet = await SheetDefinition.findOne({ sheetId })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' })
      }
      
      // Check for existing assignment
      const existing = await SheetAssignment.findOne({ adminId, sheetId })
      if (existing) {
        return res.status(400).json({ error: 'Staff already assigned to this sheet. Update the existing assignment.' })
      }
      
      // Create assignment
      const assignment = await SheetAssignment.create({
        adminId,
        sheetId,
        permissions,
        scope: scope || 'all',
        restrictedColumns: restrictedColumns || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        assignedBy: req.adminId,
        notes
      })
      
      // Log audit
      await SheetAuditLog.log({
        action: 'assign',
        sheetId,
        sheetName: sheet.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [{
          field: 'assignment',
          newValue: `Assigned ${admin.name} to ${sheet.name}`
        }],
        context: {
          notes: `Staff ${admin.name} (${admin.email}) assigned to sheet`
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.status(201).json({
        assignment,
        message: 'Staff assigned to sheet successfully'
      })
    } catch (error) {
      console.error('Assign staff error:', error)
      res.status(500).json({ error: 'Failed to assign staff' })
    }
  }
)

// Update assignment permissions
router.put('/:assignmentId',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { assignmentId } = req.params
      const { permissions, scope, restrictedColumns, expiresAt, status } = req.body
      
      const assignment = await SheetAssignment.findById(assignmentId)
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      
      const oldPermissions = { ...assignment.permissions }
      
      // Track changes
      const changes = []
      if (permissions) {
        for (const [key, value] of Object.entries(permissions)) {
          if (oldPermissions[key] !== value) {
            changes.push({ field: `permissions.${key}`, oldValue: oldPermissions[key], newValue: value })
          }
        }
        assignment.permissions = { ...assignment.permissions, ...permissions }
      }
      if (scope) assignment.scope = scope
      if (restrictedColumns) assignment.restrictedColumns = restrictedColumns
      if (expiresAt) assignment.expiresAt = new Date(expiresAt)
      if (status) assignment.status = status
      
      await assignment.save()
      
      const sheet = await SheetDefinition.findOne({ sheetId: assignment.sheetId })
      
      // Log audit
      await SheetAuditLog.log({
        action: 'permission_change',
        sheetId: assignment.sheetId,
        sheetName: sheet?.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes,
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        notes: 'Assignment permissions updated'
      })
      
      res.json({
        assignment,
        message: 'Assignment updated successfully'
      })
    } catch (error) {
      console.error('Update assignment error:', error)
      res.status(500).json({ error: 'Failed to update assignment' })
    }
  }
)

// Revoke assignment
router.put('/:assignmentId/revoke',
  authenticate,
  requireSuperAdmin,
  [
    body('reason').trim().notEmpty().withMessage('Revocation reason is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { assignmentId } = req.params
      const { reason } = req.body
      
      const assignment = await SheetAssignment.findById(assignmentId)
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      
      assignment.status = 'revoked'
      assignment.revokedBy = req.adminId
      assignment.revokedAt = new Date()
      assignment.revocationReason = reason
      await assignment.save()
      
      const sheet = await SheetDefinition.findOne({ sheetId: assignment.sheetId })
      const admin = await Admin.findById(assignment.adminId)
      
      // Log audit
      await SheetAuditLog.log({
        action: 'permission_change',
        sheetId: assignment.sheetId,
        sheetName: sheet?.name,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          notes: `Revoked access for ${admin?.name}: ${reason}`
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({ message: 'Assignment revoked successfully' })
    } catch (error) {
      console.error('Revoke assignment error:', error)
      res.status(500).json({ error: 'Failed to revoke assignment' })
    }
  }
)

// Assign row to staff
router.post('/rows/:rowId/assign',
  authenticate,
  requireAssignmentPermission(),
  async (req, res) => {
    try {
      const { rowId } = req.params
      const { assignTo, notes } = req.body
      
      const row = await SheetRow.findById(rowId)
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      const admin = await Admin.findById(assignTo)
      if (!admin) {
        return res.status(404).json({ error: 'Staff member not found' })
      }
      
      const oldAssignee = row.primaryAssignee
      const wasAssigned = oldAssignee?.toString() === assignTo
      
      // Check if already assigned
      const isAlreadyAssigned = row.assignedTo.some(
        a => a.toString() === assignTo
      )
      
      if (!isAlreadyAssigned) {
        row.assignedTo.push(assignTo)
      }
      
      // Update primary assignee
      if (!wasAssigned && !isAlreadyAssigned) {
        row.primaryAssignee = assignTo
      }
      
      await row.save()
      
      const sheet = await SheetDefinition.findOne({ sheetId: row.sheetId })
      
      // Log audit
      await SheetAuditLog.log({
        action: isAlreadyAssigned ? 'assign' : 'reassign',
        sheetId: row.sheetId,
        sheetName: sheet?.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [{
          field: 'primaryAssignee',
          oldValue: oldAssignee?.toString(),
          newValue: assignTo
        }],
        context: {
          notes: notes || `Assigned to ${admin.name}`
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: isAlreadyAssigned ? 'Staff already assigned to row' : 'Row assigned successfully'
      })
    } catch (error) {
      console.error('Assign row error:', error)
      res.status(500).json({ error: 'Failed to assign row' })
    }
  }
)

// Unassign staff from row
router.post('/rows/:rowId/unassign',
  authenticate,
  requireAssignmentPermission(),
  async (req, res) => {
    try {
      const { rowId } = req.params
      const { unassignFrom, notes } = req.body
      
      const row = await SheetRow.findById(rowId)
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      // Remove from assignedTo
      row.assignedTo = row.assignedTo.filter(
        a => a.toString() !== unassignFrom
      )
      
      // If removing primary assignee, assign to first available
      if (row.primaryAssignee?.toString() === unassignFrom) {
        row.primaryAssignee = row.assignedTo.length > 0 ? row.assignedTo[0] : null
      }
      
      await row.save()
      
      const sheet = await SheetDefinition.findOne({ sheetId: row.sheetId })
      const admin = await Admin.findById(unassignFrom)
      
      // Log audit
      await SheetAuditLog.log({
        action: 'unassign',
        sheetId: row.sheetId,
        sheetName: sheet?.name,
        rowId: row._id,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          notes: notes || `Unassigned ${admin?.name}`
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        row,
        message: 'Staff unassigned from row'
      })
    } catch (error) {
      console.error('Unassign row error:', error)
      res.status(500).json({ error: 'Failed to unassign staff' })
    }
  }
)

// Bulk assign rows
router.post('/rows/bulk-assign',
  authenticate,
  requireAssignmentPermission(),
  async (req, res) => {
    try {
      const { rowIds, assignTo } = req.body
      
      if (!Array.isArray(rowIds) || rowIds.length === 0) {
        return res.status(400).json({ error: 'Row IDs array is required' })
      }
      
      const admin = await Admin.findById(assignTo)
      if (!admin) {
        return res.status(404).json({ error: 'Staff member not found' })
      }
      
      const result = await SheetRow.updateMany(
        { _id: { $in: rowIds } },
        {
          $addToSet: { assignedTo: assignTo },
          $set: { primaryAssignee: assignTo }
        }
      )
      
      // Log audit
      await SheetAuditLog.log({
        action: 'bulk_update',
        sheetId: 'bulk',
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        context: {
          notes: `Bulk assigned ${result.modifiedCount} rows to ${admin.name}`
        },
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        assigned: result.modifiedCount,
        message: `Assigned ${result.modifiedCount} rows to ${admin.name}`
      })
    } catch (error) {
      console.error('Bulk assign error:', error)
      res.status(500).json({ error: 'Failed to assign rows' })
    }
  }
)

export default router
