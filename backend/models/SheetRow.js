import mongoose from 'mongoose'

/**
 * SheetRow Model
 * Stores dynamic data rows for spreadsheets with versioning and locking support
 */
const sheetRowSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  
  // Row status for workflow
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'returned', 'locked'],
    default: 'draft',
    index: true
  },
  
  // Row data - stores column values dynamically
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Previous versions for audit trail and conflict detection
  version: {
    type: Number,
    default: 1
  },
  
  // Assignment to staff members
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }],
  
  // Primary assignee (for single assignment mode)
  primaryAssignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    index: true
  },
  
  // Lock information for concurrency control
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lockedAt: Date,
  lockExpiresAt: Date,
  
  // Submission and approval tracking
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  submittedAt: Date,
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  // Tracking for changes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Soft delete support
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  deletedAt: Date,
  
  // Additional metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String],
  dueDate: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Compound indexes for efficient queries
sheetRowSchema.index({ sheetId: 1, status: 1 })
sheetRowSchema.index({ sheetId: 1, primaryAssignee: 1 })
sheetRowSchema.index({ sheetId: 1, createdAt: -1 })
sheetRowSchema.index({ sheetId: 1, updatedAt: -1 })
sheetRowSchema.index({ sheetId: 1, status: 1, primaryAssignee: 1 })

// Method to check if row is locked
sheetRowSchema.methods.isLocked = function() {
  if (!this.lockedBy) return false
  if (this.lockExpiresAt && this.lockExpiresAt < new Date()) return false
  return true
}

// Method to acquire lock
sheetRowSchema.methods.acquireLock = function(adminId, timeoutMinutes = 15) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000)
  
  // If not locked or lock expired, acquire it
  if (!this.isLocked()) {
    this.lockedBy = adminId
    this.lockedAt = now
    this.lockExpiresAt = expiresAt
    return true
  }
  
  return false
}

// Method to release lock
sheetRowSchema.methods.releaseLock = function(adminId) {
  if (this.lockedBy && this.lockedBy.toString() === adminId.toString()) {
    this.lockedBy = null
    this.lockedAt = null
    this.lockExpiresAt = null
    return true
  }
  return false
}

// Method to submit for review
sheetRowSchema.methods.submitForReview = function(adminId) {
  if (this.status !== 'draft' && this.status !== 'returned') {
    throw new Error('Only draft or returned rows can be submitted for review')
  }
  this.status = 'pending_review'
  this.submittedBy = adminId
  this.submittedAt = new Date()
  this.updatedBy = adminId
}

// Method to approve
sheetRowSchema.methods.approve = function(adminId, notes = '') {
  if (this.status !== 'pending_review') {
    throw new Error('Only pending_review rows can be approved')
  }
  this.status = 'approved'
  this.reviewedBy = adminId
  this.reviewedAt = new Date()
  this.reviewNotes = notes
  this.lockedBy = null // Release any lock
  this.updatedBy = adminId
}

// Method to reject
sheetRowSchema.methods.reject = function(adminId, notes = '') {
  if (this.status !== 'pending_review') {
    throw new Error('Only pending_review rows can be rejected')
  }
  this.status = 'rejected'
  this.reviewedBy = adminId
  this.reviewedAt = new Date()
  this.reviewNotes = notes
  this.updatedBy = adminId
}

// Method to return for revision
sheetRowSchema.methods.returnForRevision = function(adminId, notes = '') {
  if (this.status !== 'pending_review') {
    throw new Error('Only pending_review rows can be returned')
  }
  this.status = 'returned'
  this.reviewedBy = adminId
  this.reviewedAt = new Date()
  this.reviewNotes = notes
  this.updatedBy = adminId
}

// Static method to find rows accessible to a user
sheetRowSchema.statics.findAccessibleRows = async function(sheetId, adminId, adminRole) {
  const query = {
    sheetId,
    isDeleted: false
  }
  
  // If not super_admin, apply STRICT row-level security
  // CRITICAL: WHERE (primaryAssignee = adminId OR assignedTo contains adminId)
  if (adminRole !== 'super_admin') {
    query.$or = [
      { primaryAssignee: adminId },
      { assignedTo: adminId }
    ]
  }
  
  return this.find(query)
}

export default mongoose.model('SheetRow', sheetRowSchema)