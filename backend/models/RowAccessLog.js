import mongoose from 'mongoose'

/**
 * RowAccessLog Model
 * Tracks all row access attempts for security audit trail
 * CRITICAL: Logs every read, write, and unauthorized access attempt
 */
const rowAccessLogSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  
  rowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SheetRow',
    required: true,
    index: true
  },
  
  // User information
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  
  adminName: String,
  adminEmail: String,
  adminRole: String,
  
  // Access details
  action: {
    type: String,
    enum: ['read', 'create', 'update', 'delete', 'approve', 'reject'],
    required: true,
    index: true
  },
  
  // Access result
  accessType: {
    type: String,
    enum: ['granted', 'denied'],
    required: true,
    index: true
  },
  
  // Reason for access decision
  reason: String,
  
  // Network information
  ipAddress: String,
  userAgent: String,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

// Compound indexes for efficient queries
rowAccessLogSchema.index({ sheetId: 1, rowId: 1, timestamp: -1 })
rowAccessLogSchema.index({ adminId: 1, timestamp: -1 })
rowAccessLogSchema.index({ accessType: 1, timestamp: -1 })
rowAccessLogSchema.index({ sheetId: 1, accessType: 1, timestamp: -1 })

// Static method to log access
rowAccessLogSchema.statics.logAccess = async function(data) {
  try {
    return await this.create({
      sheetId: data.sheetId,
      rowId: data.rowId,
      adminId: data.adminId,
      adminName: data.adminName,
      adminEmail: data.adminEmail,
      adminRole: data.adminRole,
      action: data.action,
      accessType: data.accessType,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  } catch (error) {
    console.error('Error logging row access:', error)
  }
}

// Static method to get access logs for a row
rowAccessLogSchema.statics.getRowAccessLogs = async function(sheetId, rowId, limit = 100) {
  return this.find({
    sheetId,
    rowId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('adminId', 'name email role')
    .lean()
}

// Static method to get denied access attempts
rowAccessLogSchema.statics.getDeniedAccessAttempts = async function(sheetId, limit = 50) {
  return this.find({
    sheetId,
    accessType: 'denied'
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('adminId', 'name email role')
    .populate('rowId', 'status data')
    .lean()
}

// Static method to get user's access history
rowAccessLogSchema.statics.getUserAccessHistory = async function(adminId, limit = 100) {
  return this.find({
    adminId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('rowId', 'status data')
    .lean()
}

export default mongoose.model('RowAccessLog', rowAccessLogSchema)
