import mongoose from 'mongoose'

/**
 * SheetAuditLog Model
 * Immutable audit log for tracking all changes to sheet data
 */
const sheetAuditLogSchema = new mongoose.Schema({
  // Action performed
  action: {
    type: String,
    enum: [
      'create',      // Row created
      'read',        // Row viewed
      'update',      // Row updated
      'delete',      // Row deleted (soft delete)
      'restore',     // Row restored
      'submit',      // Submitted for review
      'approve',     // Approved
      'reject',      // Rejected
      'return',      // Returned for revision
      'lock',        // Row locked
      'unlock',      // Row unlocked
      'assign',      // Row assigned to staff
      'reassign',    // Row reassigned
      'unassign',    // Row unassigned
      'bulk_update', // Bulk update operation
      'bulk_delete', // Bulk delete operation
      'export',      // Data exported
      'import',      // Data imported
      'configure',   // Sheet configuration changed
      'permission_change' // Permission changed
    ],
    required: true,
    index: true
  },
  
  // Sheet information
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  sheetName: String,
  
  // Row information
  rowId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  userName: String,
  userEmail: String,
  userRole: String,
  
  // Change details
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  
  // Request metadata
  requestMeta: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String
  },
  
  // Result of the action
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  errorMessage: String,
  
  // Additional context
  context: {
    reason: String,
    notes: String,
    previousStatus: String,
    newStatus: String,
    bulkOperationId: String,
    exportedFormat: String,
    importSource: String
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We use our own timestamp field
})

// Compound indexes for efficient queries
sheetAuditLogSchema.index({ sheetId: 1, timestamp: -1 })
sheetAuditLogSchema.index({ userId: 1, timestamp: -1 })
sheetAuditLogSchema.index({ rowId: 1, timestamp: -1 })
sheetAuditLogSchema.index({ action: 1, timestamp: -1 })

// Prevent modifications to audit logs (make them immutable)
sheetAuditLogSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    const error = new Error('Audit logs are immutable and cannot be modified')
    return next(error)
  }
  next()
})

sheetAuditLogSchema.pre('findOneAndUpdate', function(next) {
  const error = new Error('Audit logs are immutable and cannot be modified')
  next(error)
})

sheetAuditLogSchema.pre('deleteMany', function(next) {
  const error = new Error('Audit logs cannot be deleted')
  next(error)
})

sheetAuditLogSchema.pre('remove', function(next) {
  const error = new Error('Audit logs cannot be removed')
  next(error)
})

// Static method to create an audit log entry
sheetAuditLogSchema.statics.log = async function({
  action,
  sheetId,
  sheetName,
  rowId,
  userId,
  userName,
  userEmail,
  userRole,
  changes = [],
  ipAddress,
  userAgent,
  sessionId,
  requestId,
  result = 'success',
  errorMessage,
  reason,
  notes,
  previousStatus,
  newStatus
}) {
  // Prevent audit logging if it would create an infinite loop
  if (action === 'read') {
    // Optionally skip read logs for performance, or limit them
    return null
  }
  
  try {
    return await this.create({
      action,
      sheetId,
      sheetName,
      rowId,
      userId,
      userName,
      userEmail,
      userRole,
      changes,
      requestMeta: { ipAddress, userAgent, sessionId, requestId },
      result,
      errorMessage,
      context: { reason, notes, previousStatus, newStatus },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break main operations
    return null
  }
}

// Static method to get audit history for a row
sheetAuditLogSchema.statics.getRowHistory = async function(sheetId, rowId, limit = 100) {
  return this.find({ sheetId, rowId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email')
}

// Static method to get user activity
sheetAuditLogSchema.statics.getUserActivity = async function(userId, startDate, endDate, limit = 100) {
  const query = { userId }
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = startDate
    if (endDate) query.timestamp.$lte = endDate
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
}

// Static method to get sheet activity
sheetAuditLogSchema.statics.getSheetActivity = async function(sheetId, startDate, endDate, action, limit = 100) {
  const query = { sheetId }
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = startDate
    if (endDate) query.timestamp.$lte = endDate
  }
  if (action) query.action = action
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email')
}

// Static method for admin audit reports
sheetAuditLogSchema.statics.getAuditReport = async function(startDate, endDate, groupBy = 'action') {
  const match = {}
  if (startDate || endDate) {
    match.timestamp = {}
    if (startDate) match.timestamp.$gte = startDate
    if (endDate) match.timestamp.$lte = endDate
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${groupBy}`,
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ])
}

export default mongoose.model('SheetAuditLog', sheetAuditLogSchema)
