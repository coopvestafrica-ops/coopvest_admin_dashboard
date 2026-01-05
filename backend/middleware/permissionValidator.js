import SheetAssignment from '../models/SheetAssignment.js'
import SheetAuditLog from '../models/SheetAuditLog.js'

/**
 * Permission levels
 */
const PERMISSION_LEVELS = {
  view: ['canView'],
  edit: ['canView', 'canEdit'],
  submit: ['canView', 'canEdit', 'canCreate', 'canSubmit'],
  approve: ['canView', 'canEdit', 'canCreate', 'canSubmit', 'canApprove', 'canDelete'],
  admin: ['canView', 'canEdit', 'canCreate', 'canDelete', 'canSubmit', 'canApprove', 'canAssignRows', 'canReassign', 'canExport', 'canViewAudit']
}

/**
 * Middleware to validate specific permissions
 */
export const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      // Super admins have all permissions
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      // Check if user has any of the required permissions
      const assignment = req.sheetAccess?.assignment
      if (!assignment) {
        return res.status(403).json({ error: 'No sheet assignment found' })
      }
      
      const hasPermission = permissions.some(
        perm => assignment.permissions[perm]
      )
      
      if (!hasPermission) {
        // Log unauthorized attempt
        await SheetAuditLog.log({
          action: 'permission_change',
          sheetId: req.params.sheetId,
          userId: req.adminId,
          userName: req.admin.name,
          userEmail: req.admin.email,
          userRole: req.admin.role,
          result: 'failure',
          errorMessage: `Missing required permissions: ${permissions.join(', ')}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          current: Object.entries(assignment.permissions)
            .filter(([_, value]) => value)
            .map(([key]) => key)
        })
      }
      
      next()
    } catch (error) {
      console.error('Permission validation error:', error)
      res.status(500).json({ error: 'Failed to validate permissions' })
    }
  }
}

/**
 * Middleware to require minimum permission level
 */
export const requirePermissionLevel = (minimumLevel) => {
  return async (req, res, next) => {
    try {
      // Super admins have all levels
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      const requiredPermissions = PERMISSION_LEVELS[minimumLevel]
      if (!requiredPermissions) {
        return res.status(500).json({ error: 'Invalid permission level' })
      }
      
      const assignment = req.sheetAccess?.assignment
      if (!assignment) {
        return res.status(403).json({ error: 'No sheet assignment found' })
      }
      
      // Check if user has all required permissions for this level
      const hasAllPermissions = requiredPermissions.every(
        perm => assignment.permissions[perm]
      )
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          error: `This action requires ${minimumLevel} permission level`,
          requiredLevel: minimumLevel,
          currentLevel: getUserPermissionLevel(assignment.permissions)
        })
      }
      
      next()
    } catch (error) {
      console.error('Permission level check error:', error)
      res.status(500).json({ error: 'Failed to check permission level' })
    }
  }
}

/**
 * Middleware to require approval permission for approval actions
 */
export const requireApprovalPermission = () => {
  return async (req, res, next) => {
    try {
      const { sheetId, rowId } = req.params
      
      // Super admins can approve
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      const assignment = req.sheetAccess?.assignment
      if (!assignment?.permissions?.canApprove) {
        return res.status(403).json({
          error: 'You do not have approval permission for this sheet'
        })
      }
      
      // Prevent users from approving their own submissions
      const SheetRow = (await import('../models/SheetRow.js')).default
      const row = await SheetRow.findById(rowId)
      
      if (row && row.submittedBy && row.submittedBy.toString() === req.adminId.toString()) {
        return res.status(403).json({
          error: 'You cannot approve your own submissions'
        })
      }
      
      next()
    } catch (error) {
      console.error('Approval permission check error:', error)
      res.status(500).json({ error: 'Failed to verify approval permission' })
    }
  }
}

/**
 * Middleware to require row assignment permission
 */
export const requireAssignmentPermission = () => {
  return async (req, res, next) => {
    try {
      // Super admins can assign
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      const assignment = req.sheetAccess?.assignment
      if (!assignment?.permissions?.canAssignRows && !assignment?.permissions?.canReassign) {
        return res.status(403).json({
          error: 'You do not have permission to assign rows'
        })
      }
      
      next()
    } catch (error) {
      console.error('Assignment permission check error:', error)
      res.status(500).json({ error: 'Failed to verify assignment permission' })
    }
  }
}

/**
 * Helper function to determine user's permission level
 */
function getUserPermissionLevel(permissions) {
  if (PERMISSION_LEVELS.admin.every(p => permissions[p])) return 'admin'
  if (PERMISSION_LEVELS.approve.every(p => permissions[p])) return 'approve'
  if (PERMISSION_LEVELS.submit.every(p => permissions[p])) return 'submit'
  if (permissions.canEdit) return 'edit'
  if (permissions.canView) return 'view'
  return 'none'
}

/**
 * Middleware to check column-level permissions
 */
export const checkColumnPermission = (columnKey, action = 'edit') => {
  return async (req, res, next) => {
    try {
      const { sheetId } = req.params
      
      // Super admins can access all columns
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      // Check if column is restricted
      const restrictedColumns = req.sheetAccess?.assignment?.restrictedColumns || []
      if (restrictedColumns.includes(columnKey)) {
        return res.status(403).json({
          error: `You do not have access to column: ${columnKey}`
        })
      }
      
      // Check if column is read-only
      const sheet = req.sheetDefinition
      const column = sheet?.columns?.find(c => c.key === columnKey)
      
      if (column) {
        if (action === 'edit' && (column.readOnly || !column.allowEdit)) {
          return res.status(403).json({
            error: `Column ${columnKey} is read-only`
          })
        }
      }
      
      next()
    } catch (error) {
      console.error('Column permission check error:', error)
      res.status(500).json({ error: 'Failed to check column permissions' })
    }
  }
}

export default {
  requirePermission,
  requirePermissionLevel,
  requireApprovalPermission,
  requireAssignmentPermission,
  checkColumnPermission
}
