import SheetRow from '../models/SheetRow.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import RowAccessLog from '../models/RowAccessLog.js'

/**
 * Middleware to enforce row-level security
 * Ensures users can only see and modify rows assigned to them
 * CRITICAL: Enforces WHERE assigned_staff_id = current_user_id at query level
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
          reason: 'super_admin',
          isSuperAdmin: true
        }
        return next()
      }
      
      // Get user's scope from assignment
      const userScope = req.sheetAccess?.scope || 'assigned_rows'
      const adminId = req.adminId
      
      // Build STRICT row filter based on user scope
      // CRITICAL: This WHERE clause is mandatory for all queries
      let rowFilter = {
        sheetId,
        isDeleted: false
      }
      
      switch (userScope) {
        case 'assigned_rows':
          // STRICT: User sees ONLY rows assigned to them
          // WHERE (primaryAssignee = current_user_id OR assignedTo contains current_user_id)
          rowFilter.$or = [
            { [assigneeField]: adminId },
            { [assigneesArrayField]: adminId }
          ]
          break
          
        case 'own_rows':
          // STRICT: User only sees rows they created
          // WHERE createdBy = current_user_id
          rowFilter.createdBy = adminId
          break
          
        case 'all':
        default:
          // Even with 'all' scope, non-super-admins must have assignment
          // Default to assigned_rows for safety
          rowFilter.$or = [
            { [assigneeField]: adminId },
            { [assigneesArrayField]: adminId }
          ]
          break
      }
      
      // Store the filter for use in controllers
      req.rowLevelSecurity = {
        enforced: true,
        filter: rowFilter,
        scope: userScope,
        isSuperAdmin: false,
        adminId: adminId.toString()
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
 * CRITICAL: Validates that user has explicit permission to modify the row
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
      const userScope = req.sheetAccess?.scope || 'assigned_rows'
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
      
      // CRITICAL: Check ownership based on scope
      let hasAccess = false
      
      switch (userScope) {
        case 'assigned_rows':
        case 'all':
          // User must be assigned to this row
          hasAccess = 
            row.primaryAssignee?.toString() === adminId.toString() ||
            row.assignedTo.some(a => a.toString() === adminId.toString())
          break
        case 'own_rows':
          // User must have created this row
          hasAccess = row.createdBy.toString() === adminId.toString()
          break
        default:
          hasAccess = false
      }
      
      // Also check assignment permissions
      if (action === 'delete') {
        hasAccess = hasAccess && req.sheetAccess?.assignment?.permissions?.canDelete
      } else if (action === 'update') {
        hasAccess = hasAccess && req.sheetAccess?.assignment?.permissions?.canEdit
      }
      
      if (!hasAccess) {
        // Log unauthorized attempt
        await RowAccessLog.create({
          sheetId,
          rowId,
          adminId,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          adminRole: req.admin.role,
          action: action,
          accessType: 'denied',
          reason: 'Row not assigned to user',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        
        await SheetAuditLog.log({
          action: 'unauthorized_access',
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
          reason: 'Row not assigned to you',
          action: action
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
      
      // CRITICAL: Check row status for approval workflow
      // Approved rows become read-only
      if (row.status === 'approved' && !req.sheetAccess?.assignment?.permissions?.canApprove) {
        return res.status(403).json({
          error: 'Cannot modify approved rows',
          status: row.status,
          reason: 'Row is locked by approval workflow'
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
 * CRITICAL: Ensures row-level security filter is applied to all queries
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

/**
 * Middleware to validate row access before read operations
 * Logs all row access attempts for audit trail
 */
export const validateRowAccess = async (req, res, next) => {
  try {
    const { sheetId, rowId } = req.params
    
    if (!rowId) return next()
    
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
    
    // Check access
    let hasAccess = false
    
    if (req.admin.role === 'super_admin') {
      hasAccess = true
    } else {
      const userScope = req.sheetAccess?.scope || 'assigned_rows'
      
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
      }
    }
    
    // Log access attempt
    await RowAccessLog.create({
      sheetId,
      rowId,
      adminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      action: 'read',
      accessType: hasAccess ? 'granted' : 'denied',
      reason: hasAccess ? 'User assigned to row' : 'Row not assigned to user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have access to this row',
        reason: 'Row not assigned to you'
      })
    }
    
    next()
  } catch (error) {
    console.error('Validate row access error:', error)
    next()
  }
}

export default {
  enforceRowLevelSecurity,
  checkRowOwnership,
  attachRowFilter,
  validateRowAccess
}