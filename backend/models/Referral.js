import mongoose from 'mongoose'

// Referral Schema - tracks member referrals
const referralSchema = new mongoose.Schema({
  referralCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  tier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  bonusStatus: {
    type: String,
    enum: ['pending', 'locked', 'disbursed', 'reversed', 'expired'],
    default: 'pending'
  },
  tierBonusPercent: {
    type: Number,
    default: 0
  },
  kycVerified: {
    type: Boolean,
    default: false
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  bonusConsumed: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedReason: String,
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  flaggedAt: Date,
  lockInEndDate: Date,
  confirmedAt: Date,
  rejectedAt: Date,
  rejectedReason: String,
  notes: String
}, { timestamps: true })

// Indexes
referralSchema.index({ referralCode: 1 })
referralSchema.index({ referrer: 1 })
referralSchema.index({ referred: 1 })
referralSchema.index({ status: 1 })
referralSchema.index({ tier: 1 })
referralSchema.index({ isFlagged: 1 })
referralSchema.index({ createdAt: -1 })

export default mongoose.model('Referral', referralSchema)
