import mongoose from 'mongoose'

const investmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'closed'],
    default: 'active'
  },
  type: {
    type: String,
    enum: ['real_estate', 'agriculture', 'business', 'technology', 'other'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  amountRaised: {
    type: Number,
    default: 0
  },
  targetAmount: {
    type: Number,
    required: true
  },
  expectedROI: {
    type: Number,
    default: 0 // Percentage
  },
  actualROI: {
    type: Number,
    default: 0
  },
  startDate: Date,
  endDate: Date,
  maturityDate: Date,
  members: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    amount: Number,
    shares: Number,
    joinDate: Date
  }],
  profitDistribution: [{
    date: Date,
    amount: Number,
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    }
  }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  location: String,
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  documents: [String], // URLs to investment documents
  performance: {
    currentValue: Number,
    projectedValue: Number,
    variance: Number
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

// Index for faster queries
investmentSchema.index({ status: 1 })
investmentSchema.index({ type: 1 })
investmentSchema.index({ createdAt: -1 })

export default mongoose.model('Investment', investmentSchema)
