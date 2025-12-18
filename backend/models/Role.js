import mongoose from 'mongoose'

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['super_admin', 'finance', 'operations', 'compliance', 'member_support', 'investment', 'technology']
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  permissions: [{
    type: String,
    enum: [
      'read',
      'write',
      'approve',
      'manage_admins',
      'manage_members',
      'manage_loans',
      'manage_investments',
      'manage_compliance',
      'manage_features',
      'view_analytics',
      'export_data',
      'manage_roles',
      'manage_permissions',
      'view_audit_logs',
      'manage_communications',
      'manage_documents'
    ]
  }],
  features: [{
    featureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature'
    },
    canEnable: Boolean,
    canDisable: Boolean,
    canConfigure: Boolean
  }],
  scope: {
    type: String,
    enum: ['global', 'regional', 'departmental'],
    default: 'global'
  },
  regions: [String], // For regional scope
  departments: [String], // For departmental scope
  maxAdminsAllowed: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  currentAdminCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

// Index for faster queries
roleSchema.index({ name: 1 })
roleSchema.index({ isActive: 1 })

export default mongoose.model('Role', roleSchema)
