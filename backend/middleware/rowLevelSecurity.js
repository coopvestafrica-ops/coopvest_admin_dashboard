import SheetRow from '../models/SheetRow.js'
import SheetAuditLog from '../models/SheetAuditLog.js'

/**
 * Middleware to enforce row-level security
 * Ensures users can only see and modify rows assigned to them
 */
export const enforceRowLevelSecurity = (options = {}) => {
  const {
    allowSuperAdminAll = true,
    scopeField = 'scope',
    assigneeField = 'primaryAssignee',
    assigneesArrayField = 'assignedTo'
  } = options
  
  return async (req, res, next) => {
    try {
      const { sheetId } = req.params
      
      // Super admins see all rows in their sheets
      if (allowSuperAdminAll && req.admin.role === 'super_admin') {
        req.rowLevelSecurity = {
          enforced: false,
          reason: 'super_admin'
        }
        return next()
      }
      
      // Get user's scope from assignment
      const userScope = req.sheetAccess?.scope || 'all'
      const adminId = req.adminId
      
      // Build row filter based on user scope
      let rowFilter = {
        sheetId,
        isDeleted: false
      }
      
      switch (userScope) {
        case 'assigned_rows':
          // User sees rows assigned to them
          rowFilter.$or = [
            { [assigneeField]: adminId },
            { [assigneesArrayField]: adminId }
          ]
          break
          
        case 'own_rows':
          // User only sees rows they created
          rowFilter.createdBy = adminId
          break
          
        case 'all':
        default:
          // User can see all rows (default behavior)
          // Add explicit check to ensure some scope is applied
          if (!req.sheetAccess?.isSuperAdmin) {
            rowFilter.$or = [
              { [assigneeField]: adminId },
              { [assigneesArrayField]: adminId }
            ]
          }
          break
      }
      
      // Store the filter for use in controllers
      req.rowLevelSecurity = {
        enforced: true,
        filter: rowFilter,
        scope: userScope
      }
      
      // Modify query options to include the filter
      if (!req.query.includeAll) {
        req.rowFilter = rowFilter
      }
      
      next()
    } catch (error) {
      console.error('Row level security error:', error)
      res.status(500).json({ error: 'Failed to enforce row-level security' })
    }
  }
}

/**
 * Middleware to check row ownership before update/delete
 */
export const checkRowOwnership = (action = 'update') => {
  return async (req, res, next) => {
    try {
      const { sheetId, rowId } = req.params
      
      // Super admins can perform any action
      if (req.admin.role === 'super_admin') {
        return next()
      }
      
      // Get user scope
      const userScope = req.sheetAccess?.scope || 'all'
      const adminId = req.adminId
      
      // Find the row
      const row = await SheetRow.findOne({
        _id: rowId,
        sheetId,
        isDeleted: false
      })
      
      if (!row) {
        return res.status(404).json({ error: 'Row not found' })
      }
      
      // Check ownership based on scope
      let hasAccess = false
      
      switch (userScope) {
        case 'assigned_rows':
        case 'all':
          hasAccess = 
            row.primaryAssignee?.toString() === adminId.toString() ||
            row.assignedTo.some(a => a.toString() === adminId.toString())
          break
        case 'own_rows':
          hasAccess = row.createdBy.toString() === adminId.toString()
          break
        default:
          hasAccess = true
      }
      
      // Also check assignment permissions
      if (action === 'delete') {
        hasAccess = hasAccess && req.sheetAccess?.assignment?.permissions?.canDelete
      } else if (action === 'update') {
        hasAccess = hasAccess && req.sheetAccess?.assignment?.permissions?.canEdit
      }
      
      if (!hasAccess) {
        // Log unauthorized attempt
        await SheetAuditLog.log({
          action: 'read',
          sheetId,
          rowId,
          userId: adminId,
          userName: req.admin.name,
          userEmail: req.admin.email,
          userRole: req.admin.role,
          result: 'failure',
          errorMessage: `Unauthorized ${action} attempt on row not assigned to user`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        
        return res.status(403).json({
          error: 'You do not have permission to modify this row',
          reason: 'Row not assigned to you'
        })
      }
      
      // Check if row is locked
      if (row.isLocked() && row.lockedBy.toString() !== adminId.toString()) {
        return res.status(423).json({
          error: 'This row is being edited by another user',
          lockedBy: row.lockedBy,
          lockedAt: row.lockedAt
        })
      }
      
      // Check row status for approval workflow
      if (row.status === 'approved' && !req.sheetAccess?.assignment?.permissions?.canApprove) {
        return res.status(403).json({
          error: 'Cannot modify approved rows',
          status: row.status
        })
      }
      
      req.targetRow = row
      
      next()
    } catch (error) {
      console.error('Check row ownership error:', error)
      res.status(500).json({ error: 'Failed to verify row ownership' })
    }
  }
}

/**
 * Middleware to attach row filter to query
 */
export const attachRowFilter = () => {
  return async (req, res, next) => {
    try {
      if (req.rowLevelSecurity?.enforced) {
        req.query = {
          ...req.query,
          rowFilter: JSON.stringify(req.rowLevelSecurity.filter)
        }
      }
      next()
    } catch (error) {
      console.error('Attach row filter error:', error)
      next()
    }
  }
}

export default {
  enforceRowLevelSecurity,
  checkRowOwnership,
  attachRowFilter
}
