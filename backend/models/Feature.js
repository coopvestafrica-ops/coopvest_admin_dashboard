import mongoose from 'mongoose'

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['payment', 'lending', 'investment', 'savings', 'admin', 'security', 'communication', 'other'],
    required: true
  },
  platforms: [{
    type: String,
    enum: ['web', 'mobile', 'admin_dashboard'],
    required: true
  }],
  enabled: {
    type: Boolean,
    default: false
  },
  rolloutPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  targetAudience: {
    type: String,
    enum: ['all', 'beta_users', 'premium_members', 'specific_regions'],
    default: 'all'
  },
  targetRegions: [String], // For region-specific rollout
  targetUserIds: [String], // For specific user rollout
  startDate: Date,
  endDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['planning', 'development', 'testing', 'active', 'paused', 'deprecated'],
    default: 'planning'
  },
  dependencies: [String], // Other features this depends on
  metrics: {
    enabledCount: { type: Number, default: 0 },
    disabledCount: { type: Number, default: 0 },
    lastToggled: Date,
    toggleCount: { type: Number, default: 0 }
  },
  config: mongoose.Schema.Types.Mixed, // Feature-specific configuration
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  changelog: [{
    timestamp: Date,
    action: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    changes: mongoose.Schema.Types.Mixed
  }],
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
featureSchema.index({ name: 1 })
featureSchema.index({ category: 1 })
featureSchema.index({ enabled: 1 })
featureSchema.index({ platforms: 1 })
featureSchema.index({ status: 1 })

export default mongoose.model('Feature', featureSchema)
