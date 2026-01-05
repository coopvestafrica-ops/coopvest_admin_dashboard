import mongoose from 'mongoose'

/**
 * SheetDefinition Model
 * Defines the structure of a spreadsheet including columns, permissions, and workflow settings
 */
const columnSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'number', 'date', 'currency', 'enum', 'boolean', 'email', 'phone', 'textarea'],
    default: 'text'
  },
  required: {
    type: Boolean,
    default: false
  },
  unique: {
    type: Boolean,
    default: false
  },
  defaultValue: mongoose.Schema.Types.Mixed,
  placeholder: String,
  helpText: String,
  validation: {
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String, // Regex pattern for validation
    enumValues: [String] // For enum type
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 150 // pixels
  },
  hidden: {
    type: Boolean,
    default: false
  },
  frozen: {
    type: Boolean,
    default: false // Can be frozen at left side
  },
  // Column-level permission overrides
  readOnly: {
    type: Boolean,
    default: false
  },
  allowEdit: {
    type: Boolean,
    default: true
  }
}, { _id: false })

const sheetDefinitionSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['loans', ' repayments', 'compliance', 'referrals', 'members', 'investments', 'operations', 'other'],
    default: 'operations'
  },
  columns: [columnSchema],
  
  // Workflow settings
  workflow: {
    enableApproval: {
      type: Boolean,
      default: true
    },
    requireApprovalForEdit: {
      type: Boolean,
      default: false
    },
    autoSubmitOnEdit: {
      type: Boolean,
      default: false
    },
    allowedStatuses: [{
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'returned', 'locked']
    }],
    defaultStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'returned', 'locked'],
      default: 'draft'
    }
  },
  
  // Default permissions for new assignments
  defaultPermissions: {
    canView: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: false },
    canSubmit: { type: Boolean, default: false },
    canApprove: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canAssignRows: { type: Boolean, default: false }
  },
  
  // Row assignment settings
  rowAssignment: {
    enabled: { type: Boolean, default: true },
    allowMultipleAssignees: { type: Boolean, default: false },
    autoAssignOnCreate: { type: Boolean, default: false }
  },
  
  // Concurrency settings
  concurrency: {
    enableLocking: { type: Boolean, default: true },
    lockTimeoutMinutes: { type: Number, default: 15 }
  },
  
  // UI settings
  ui: {
    pageSize: { type: Number, default: 50 },
    enableSorting: { type: Boolean, default: true },
    enableFiltering: { type: Boolean, default: true },
    enableGrouping: { type: Boolean, default: false },
    enableExport: { type: Boolean, default: true },
    enableImport: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  
  // Metadata
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
sheetDefinitionSchema.index({ sheetId: 1 })
sheetDefinitionSchema.index({ category: 1 })
sheetDefinitionSchema.index({ status: 1 })
sheetDefinitionSchema.index({ createdBy: 1 })

export default mongoose.model('SheetDefinition', sheetDefinitionSchema)
