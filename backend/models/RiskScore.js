import mongoose from 'mongoose'

const riskScoreSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  tier: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  components: {
    repaymentBehavior: {
      score: { type: Number, default: 0 },
      weight: { type: Number, default: 0.30 },
      details: {
        onTimePayments: { type: Number, default: 0 },
        latePayments: { type: Number, default: 0 },
        missedPayments: { type: Number, default: 0 },
        averageDaysLate: { type: Number, default: 0 },
        repaymentRate: { type: Number, default: 0 }
      }
    },
    contributionConsistency: {
      score: { type: Number, default: 0 },
      weight: { type: Number, default: 0.25 },
      details: {
        monthsActive: { type: Number, default: 0 },
        totalContributions: { type: Number, default: 0 },
        averageMonthlyContribution: { type: Number, default: 0 },
        contributionFrequency: { type: String, enum: ['regular', 'irregular', 'poor'], default: 'regular' },
        lastContributionDate: Date
      }
    },
    loanHistory: {
      score: { type: Number, default: 0 },
      weight: { type: Number, default: 0.20 },
      details: {
        totalLoans: { type: Number, default: 0 },
        completedLoans: { type: Number, default: 0 },
        defaultedLoans: { type: Number, default: 0 },
        currentOutstanding: { type: Number, default: 0 },
        loanUtilizationRate: { type: Number, default: 0 }
      }
    },
    fraudFlags: {
      score: { type: Number, default: 0 },
      weight: { type: Number, default: 0.15 },
      details: {
        fraudCases: { type: Number, default: 0 },
        referralAbuse: { type: Number, default: 0 },
        suspiciousActivity: { type: Number, default: 0 },
        complianceIssues: { type: Number, default: 0 }
      }
    },
    accountStanding: {
      score: { type: Number, default: 0 },
      weight: { type: Number, default: 0.10 },
      details: {
        kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        accountAge: { type: Number, default: 0 }, // in months
        status: { type: String, default: 'pending' },
        suspensionCount: { type: Number, default: 0 }
      }
    }
  },
  riskIndicators: [{
    type: {
      type: String,
      enum: ['late_payment', 'missed_payment', 'high_debt_ratio', 'fraud_suspicion', 'kyc_issue', 'irregular_activity']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    description: String,
    detectedAt: Date
  }],
  recommendations: [{
    action: String,
    reason: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  previousScore: Number,
  scoreChange: Number,
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  nextCalculationAt: Date,
  calculatedBy: {
    type: String,
    enum: ['system', 'admin'],
    default: 'system'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

// Indexes
riskScoreSchema.index({ memberId: 1 })
riskScoreSchema.index({ tier: 1 })
riskScoreSchema.index({ score: 1 })
riskScoreSchema.index({ calculatedAt: -1 })

// Pre-save middleware to calculate tier
riskScoreSchema.pre('save', function(next) {
  // Calculate tier based on score
  if (this.score >= 0 && this.score < 40) {
    this.tier = 'high'
  } else if (this.score >= 40 && this.score < 70) {
    this.tier = 'medium'
  } else {
    this.tier = 'low'
  }
  
  // Calculate score change
  if (this.previousScore !== undefined) {
    this.scoreChange = this.score - this.previousScore
  }
  
  next()
})

// Static methods
riskScoreSchema.statics.getByMember = async function(memberId) {
  return this.findOne({ memberId }).sort({ calculatedAt: -1 })
}

riskScoreSchema.statics.getByTier = async function(tier) {
  return this.find({ tier }).sort({ score: 1 })
}

riskScoreSchema.statics.getHighRiskMembers = async function(limit = 100) {
  return this.find({ tier: 'high' })
    .sort({ score: 1 })
    .limit(limit)
    .populate('memberId', 'firstName lastName email phone status')
}

riskScoreSchema.statics.getAverageScoreByTier = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: '$tier',
        averageScore: { $avg: '$score' },
        count: { $sum: 1 }
      }
    }
  ])
  
  return result
}

const RiskScore = mongoose.model('RiskScore', riskScoreSchema)

export default RiskScore
