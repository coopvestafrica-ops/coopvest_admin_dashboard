import SheetAssignment from '../models/SheetAssignment.js'
import SheetDefinition from '../models/SheetDefinition.js'

/**
 * Middleware to check if user has access to a specific sheet
 */
export const checkSheetAccess = (requiredPermission = 'canView') => {
  return async (req, res, next) => {
    try {
      const { sheetId } = req.params
      
      if (!sheetId) {
        return res.status(400).json({ error: 'Sheet ID is required' })
      }
      
      // Super admins have full access
      if (req.admin.role === 'super_admin') {
        req.sheetAccess = {
          hasAccess: true,
          permission: 'admin',
          isSuperAdmin: true
        }
        return next()
      }
      
      // Check if sheet exists
      const sheet = await SheetDefinition.findOne({ sheetId, status: 'active' })
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found or inactive' })
      }
      
      req.sheetDefinition = sheet
      
      // Check assignment
      const assignment = await SheetAssignment.findOne({
        adminId: req.adminId,
        sheetId,
        status: 'active'
      })
      
      if (!assignment) {
        return res.status(403).json({ 
          error: 'You do not have access to this sheet',
          sheetId
        })
      }
      
      // Check if assignment is valid (not expired)
      if (assignment.expiresAt && assignment.expiresAt < new Date()) {
        return res.status(403).json({ 
          error: 'Your access to this sheet has expired',
          sheetId
        })
      }
      
      // Check permission
      if (!assignment.permissions[requiredPermission]) {
        return res.status(403).json({ 
          error: `You do not have ${requiredPermission} permission for this sheet`,
          required: requiredPermission,
          current: Object.entries(assignment.permissions).filter(([_, v]) => v)
        })
      }
      
      // Attach assignment info to request
      req.sheetAccess = {
        hasAccess: true,
        permission: requiredPermission,
        isSuperAdmin: false,
        assignment,
        scope: assignment.scope
      }
      
      next()
    } catch (error) {
      console.error('Sheet access check error:', error)
      res.status(500).json({ error: 'Failed to check sheet access' })
    }
  }
}

/**
 * Middleware to load user sheet assignments
 */
export const loadUserSheets = async (req, res, next) => {
  try {
    // Super admins see all sheets
    if (req.admin.role === 'super_admin') {
      const allSheets = await SheetDefinition.find({ status: 'active' })
      req.userSheets = {
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
          isAdmin: true
        }))
      }
      return next()
    }
    
    // Get user assignments
    const assignments = await SheetAssignment.find({
      adminId: req.adminId,
      status: 'active',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    
    if (!assignments.length) {
      req.userSheets = { allowedSheets: [] }
      return next()
    }
    
    // Get sheet details
    const sheetIds = assignments.map(a => a.sheetId)
    const sheets = await SheetDefinition.find({
      sheetId: { $in: sheetIds },
      status: 'active'
    })
    
    // Combine assignment with sheet details
    req.userSheets = {
      allowedSheets: sheets.map(sheet => {
        const assignment = assignments.find(a => a.sheetId === sheet.sheetId)
        return {
          sheetId: sheet.sheetId,
          name: sheet.name,
          description: sheet.description,
          category: sheet.category,
          permissions: assignment.permissions,
          scope: assignment.scope,
          restrictedColumns: assignment.restrictedColumns,
          expiresAt: assignment.expiresAt
        }
      })
    }
    
    next()
  } catch (error) {
    console.error('Load user sheets error:', error)
    res.status(500).json({ error: 'Failed to load user sheets' })
  }
}

/**
 * Middleware to verify user can access their assigned sheets only
 */
export const enforceAssignedSheets = async (req, res, next) => {
  try {
    const { sheetId } = req.params
    
    // Super admins can access any sheet
    if (req.admin.role === 'super_admin') {
      return next()
    }
    
    // Check if sheet is in user's allowed list
    const userSheetIds = req.userSheets?.allowedSheets?.map(s => s.sheetId) || []
    
    if (!userSheetIds.includes(sheetId)) {
      return res.status(403).json({
        error: 'You do not have access to this sheet',
        yourSheets: userSheetIds
      })
    }
    
    next()
  } catch (error) {
    console.error('Enforce assigned sheets error:', error)
    res.status(500).json({ error: 'Failed to verify sheet access' })
  }
}

export default {
  checkSheetAccess,
  loadUserSheets,
  enforceAssignedSheets
}
