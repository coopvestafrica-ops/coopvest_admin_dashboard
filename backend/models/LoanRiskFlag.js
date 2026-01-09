import mongoose from 'mongoose'

/**
 * LoanRiskFlag Model
 * Tracks AI-generated risk assessments for loans
 * Supports automated risk detection and flagging
 */
const loanRiskFlagSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true,
    index: true
  },
  
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  
  // Risk level
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  
  // Risk score (0-100)
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  
  // Risk factors
  riskFactors: [{
    factor: String,
    weight: Number,
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
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
    enum: ['approve', 'review', 'reject', 'conditional_approval'],
    default: 'review'
  },
  
  recommendationReason: String,
  
  // Action taken
  actionTaken: {
    type: String,
    enum: ['flagged', 'approved', 'rejected', 'escalated', 'pending_review'],
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
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Indexes
loanRiskFlagSchema.index({ loanId: 1, status: 1 })
loanRiskFlagSchema.index({ memberId: 1, riskLevel: 1 })
loanRiskFlagSchema.index({ riskScore: -1, createdAt: -1 })

// Static method to get high-risk loans
loanRiskFlagSchema.statics.getHighRiskLoans = async function(limit = 50) {
  return this.find({
    riskLevel: { $in: ['high', 'critical'] },
    status: 'active'
  })
    .sort({ riskScore: -1 })
    .limit(limit)
    .populate('loanId', 'loanAmount status')
    .populate('memberId', 'firstName lastName email')
    .lean()
}

export default mongoose.model('LoanRiskFlag', loanRiskFlagSchema)
