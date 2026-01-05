import mongoose from 'mongoose'

/**
 * SheetAssignment Model
 * Manages staff assignments to sheets with granular permissions
 */
const sheetAssignmentSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  
  // Granular permissions for this assignment
  permissions: {
    canView: {
      type: Boolean,
      default: false
    },
    canEdit: {
      type: Boolean,
      default: false
    },
    canCreate: {
      type: Boolean,
      default: false
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    canSubmit: {
      type: Boolean,
      default: false
    },
    canApprove: {
      type: Boolean,
      default: false
    },
    canAssignRows: {
      type: Boolean,
      default: false
    },
    canReassign: {
      type: Boolean,
      default: false
    },
    canExport: {
      type: Boolean,
      default: true
    },
    canViewAudit: {
      type: Boolean,
      default: false
    }
  },
  
  // Assignment scope
  scope: {
    type: String,
    enum: ['all', 'assigned_rows', 'own_rows'],
    default: 'all'
  },
  
  // Column-level restrictions (if specific columns are restricted)
  restrictedColumns: [{
    type: String
  }],
  
  // Assignment status
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },
  
  // Assignment metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  revokedAt: Date,
  revocationReason: String,
  
  // Override reason (for admin approvals)
  overrideReason: String,
  
  notes: String
}, {
  timestamps: true
})

// Compound unique index to prevent duplicate assignments
sheetAssignmentSchema.index({ adminId: 1, sheetId: 1 }, { unique: true })

// Index for efficient queries
sheetAssignmentSchema.index({ sheetId: 1, status: 1 })
sheetAssignmentSchema.index({ adminId: 1, status: 1 })

// Method to check if user has specific permission
sheetAssignmentSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true
}

// Method to check if assignment is valid
sheetAssignmentSchema.methods.isValid = function() {
  if (this.status !== 'active') return false
  if (this.expiresAt && this.expiresAt < new Date()) return false
  return true
}

// Static method to get all assignments for a user
sheetAssignmentSchema.statics.getUserAssignments = async function(adminId) {
  return this.find({
    adminId,
    status: 'active'
  }).populate('sheetId')
}

// Static method to check if user has access to a sheet
sheetAssignmentSchema.statics.hasSheetAccess = async function(adminId, sheetId, requiredPermission = 'canView') {
  const assignment = await this.findOne({
    adminId,
    sheetId,
    status: 'active'
  })
  
  if (!assignment) return false
  if (!assignment.isValid()) return false
  if (!assignment.permissions[requiredPermission]) return false
  
  return true
}

// Static method to get user's allowed sheet IDs
sheetAssignmentSchema.statics.getAllowedSheetIds = async function(adminId) {
  const assignments = await this.find({
    adminId,
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).select('sheetId')
  
  return assignments.map(a => a.sheetId)
}

export default mongoose.model('SheetAssignment', sheetAssignmentSchema)
