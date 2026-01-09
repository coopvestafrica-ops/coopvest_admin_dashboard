import mongoose from 'mongoose'

/**
 * ReferralAbuseDetection Model
 * Tracks AI-detected fraud and abuse patterns in referral system
 * Supports automated abuse detection and prevention
 */
const referralAbuseDetectionSchema = new mongoose.Schema({
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    required: true,
    index: true
  },
  
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  
  referredMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  
  // Abuse type
  abuseType: {
    type: String,
    enum: ['duplicate_referral', 'fake_member', 'collusion', 'reward_manipulation', 'suspicious_pattern'],
    index: true
  },
  
  // Risk level
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  
  // Abuse score (0-100)
  abuseScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  
  // Detection factors
  detectionFactors: [{
    factor: String,
    weight: Number,
    description: String,
    evidence: mongoose.Schema.Types.Mixed
  }],
  
  // AI model information
  aiModel: {
    name: String,
    version: String,
    confidence: Number
  },
  
  // Recommendation
  recommendation: {
    type: String,
    enum: ['allow', 'review', 'block', 'investigate'],
    default: 'review'
  },
  
  recommendationReason: String,
  
  // Action taken
  actionTaken: {
    type: String,
    enum: ['flagged', 'allowed', 'blocked', 'escalated', 'pending_review'],
    default: 'flagged'
  },
  
  actionTakenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  actionTakenAt: Date,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'resolved', 'dismissed', 'escalated'],
    default: 'active',
    index: true
  },
  
  // Resolution
  resolutionNotes: String,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Related cases
  relatedCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralAbuseDetection'
  }],
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Indexes
referralAbuseDetectionSchema.index({ referralId: 1, status: 1 })
referralAbuseDetectionSchema.index({ referrerId: 1, abuseScore: -1 })
referralAbuseDetectionSchema.index({ abuseType: 1, status: 1 })
referralAbuseDetectionSchema.index({ abuseScore: -1, createdAt: -1 })

// Static method to get high-risk referrals
referralAbuseDetectionSchema.statics.getHighRiskReferrals = async function(limit = 50) {
  return this.find({
    riskLevel: { $in: ['high', 'critical'] },
    status: 'active'
  })
    .sort({ abuseScore: -1 })
    .limit(limit)
    .populate('referrerId', 'firstName lastName email')
    .populate('referredMemberId', 'firstName lastName email')
    .lean()
}

// Static method to get referrer's abuse history
referralAbuseDetectionSchema.statics.getReferrerAbuseHistory = async function(referrerId) {
  return this.find({
    referrerId
  })
    .sort({ createdAt: -1 })
    .populate('referralId', 'status rewardAmount')
    .lean()
}

// Static method to detect collusion patterns
referralAbuseDetectionSchema.statics.detectCollusionPatterns = async function(limit = 100) {
  return this.find({
    abuseType: 'collusion',
    status: 'active'
  })
    .sort({ abuseScore: -1 })
    .limit(limit)
    .populate('referrerId', 'firstName lastName')
    .populate('referredMemberId', 'firstName lastName')
    .lean()
}

export default mongoose.model('ReferralAbuseDetection', referralAbuseDetectionSchema)
