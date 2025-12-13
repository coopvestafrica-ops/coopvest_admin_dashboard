import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminEmail: String,
  action: {
    type: String,
    enum: [
      'admin_created',
      'admin_updated',
      'admin_deleted',
      'role_assigned',
      'role_revoked',
      'permission_granted',
      'permission_revoked',
      'member_approved',
      'member_suspended',
      'member_flagged',
      'loan_approved',
      'loan_rejected',
      'contribution_recorded',
      'document_generated',
      'system_setting_changed',
      'mfa_enabled',
      'mfa_disabled',
      'login_attempt',
      'failed_login',
      'account_locked',
      'account_unlocked'
    ],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['admin', 'member', 'loan', 'contribution', 'document', 'system'],
    required: true
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  resourceName: String,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false })

// Index for faster queries
auditLogSchema.index({ admin: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1 })
auditLogSchema.index({ createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
