import mongoose from 'mongoose'

// Referral Tier Schema - defines tier levels and bonuses
const referralTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum']
  },
  minReferrals: {
    type: Number,
    required: true,
    default: 0
  },
  discountPercent: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  bonusMultiplier: {
    type: Number,
    default: 1.0
  },
  color: {
    type: String,
    default: '#666666'
  },
  description: String,
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index
referralTierSchema.index({ order: 1 })
referralTierSchema.index({ minReferrals: 1 })

export default mongoose.model('ReferralTier', referralTierSchema)
