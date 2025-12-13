import AuditLog from '../models/AuditLog.js'

export const logAudit = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send
  
  res.send = async function(data) {
    // Only log if there's an admin in the request
    if (req.admin && req.auditData) {
      try {
        const auditLog = new AuditLog({
          admin: req.admin._id,
          adminEmail: req.admin.email,
          action: req.auditData.action,
          resourceType: req.auditData.resourceType,
          resourceId: req.auditData.resourceId,
          resourceName: req.auditData.resourceName,
          changes: req.auditData.changes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage: res.statusCode >= 400 ? data : undefined,
          metadata: req.auditData.metadata
        })
        
        await auditLog.save()
      } catch (error) {
        console.error('Audit logging error:', error)
      }
    }
    
    // Call original send
    res.send = originalSend
    return res.send(data)
  }
  
  next()
}

export const createAuditEntry = (action, resourceType, resourceId = null, resourceName = null, changes = null, metadata = null) => {
  return (req, res, next) => {
    req.auditData = {
      action,
      resourceType,
      resourceId,
      resourceName,
      changes,
      metadata
    }
    next()
  }
}
