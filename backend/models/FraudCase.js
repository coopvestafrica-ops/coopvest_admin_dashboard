import mongoose from 'mongoose'

// Fraud Detection Schema - tracks suspicious activities
const fraudCaseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['same_device', 'fake_phone', 'rapid_referrals', 'duplicate_identity', 'suspicious_pattern', 'manual_flag'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'dismissed', 'banned'],
    default: 'open'
  },
  involvedMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    name: String,
    phone: String,
    role: {
      type: String,
      enum: ['referrer', 'referred', 'both']
    }
  }],
  involvedReferrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  }],
  detectionMethod: {
    type: String,
    enum: ['automatic', 'manual', 'admin_report', 'user_report']
  },
  evidence: {
    deviceFingerprints: [String],
    ipAddresses: [String],
    phoneNumbers: [String],
    timestamps: [Date],
    descriptions: [String]
  },
  automatedDetection: {
    deviceMatch: Boolean,
    ipMatch: Boolean,
    phoneMatch: Boolean,
    timeWindow: Number, // in hours
    patternType: String
  },
  investigationNotes: [{
    timestamp: Date,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    note: String,
    action: String
  }],
  resolution: {
    action: {
      type: String,
      enum: ['none', 'warning', 'bonus_reversed', 'member_suspended', 'member_banned', 'referrals_cancelled']
    },
    reason: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolvedAt: Date
  },
  notifications: {
    adminNotified: Boolean,
    adminNotifiedAt: Date,
    memberNotified: Boolean,
    memberNotifiedAt: Date
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
}, { timestamps: true })

// Indexes
fraudCaseSchema.index({ caseId: 1 })
fraudCaseSchema.index({ type: 1 })
fraudCaseSchema.index({ severity: 1 })
fraudCaseSchema.index({ status: 1 })
fraudCaseSchema.index({ detectedAt: -1 })

// Generate unique case ID
fraudCaseSchema.pre('save', function(next) {
  if (!this.caseId) {
    this.caseId = 'FR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase()
  }
  next()
})

export default mongoose.model('FraudCase', fraudCaseSchema)
