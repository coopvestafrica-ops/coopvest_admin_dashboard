import mongoose from 'mongoose'

/**
 * RowLock Model
 * Manages row-level locks for concurrency control
 */
const rowLockSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  rowId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lockedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lockType: {
    type: String,
    enum: ['edit', 'view'],
    default: 'edit'
  },
  sessionId: {
    type: String
  },
  clientInfo: {
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
})

// Compound index for efficient lock lookups
rowLockSchema.index({ sheetId: 1, rowId: 1 })
rowLockSchema.index({ lockedBy: 1 })
rowLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index

// Static method to acquire a lock
rowLockSchema.statics.acquireLock = async function(sheetId, rowId, adminId, timeoutMinutes = 15, lockType = 'edit') => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000)
  
  // Check if already locked by someone else
  const existingLock = await this.findOne({
    sheetId,
    rowId,
    expiresAt: { $gt: now }
  })
  
  if (existingLock) {
    // Check if it's locked by the same user (refresh lock)
    if (existingLock.lockedBy.toString() === adminId.toString()) {
      existingLock.expiresAt = expiresAt
      await existingLock.save()
      return { success: true, lock: existingLock, isExisting: true }
    }
    
    // Locked by another user
    return {
      success: false,
      lock: existingLock,
      isExisting: true,
      error: 'Row is locked by another user'
    }
  }
  
  // Create new lock
  const newLock = await this.create({
    sheetId,
    rowId,
    lockedBy: adminId,
    expiresAt,
    lockType
  })
  
  return { success: true, lock: newLock, isExisting: false }
}

// Static method to release a lock
rowLockSchema.statics.releaseLock = async function(sheetId, rowId, adminId) => {
  const result = await this.deleteOne({
    sheetId,
    rowId,
    lockedBy: adminId
  })
  
  return result.deletedCount > 0
}

// Static method to release all locks for a user
rowLockSchema.statics.releaseAllLocks = async function(adminId) {
  const result = await this.deleteMany({
    lockedBy: adminId
  })
  
  return result.deletedCount
}

// Static method to check if a row is locked
rowLockSchema.statics.isLocked = async function(sheetId, rowId) {
  const lock = await this.findOne({
    sheetId,
    rowId,
    expiresAt: { $gt: new Date() }
  })
  
  return !!lock
}

// Static method to get lock info
rowLockSchema.statics.getLockInfo = async function(sheetId, rowId) {
  return this.findOne({
    sheetId,
    rowId,
    expiresAt: { $gt: new Date() }
  }).populate('lockedBy', 'name email')
}

// Static method to clean expired locks
rowLockSchema.statics.cleanExpiredLocks = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lte: new Date() }
  })
  
  return result.deletedCount
}

export default mongoose.model('RowLock', rowLockSchema)
