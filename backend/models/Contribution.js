import mongoose from 'mongoose'

const contributionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  memberName: String,
  memberEmail: String,
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['regular', 'special', 'emergency', 'voluntary'],
    default: 'regular'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'cash', 'payroll_deduction'],
    default: 'bank_transfer'
  },
  transactionReference: String,
  description: String,
  month: {
    type: String,
    required: true // Format: YYYY-MM
  },
  contributionDate: {
    type: Date,
    default: Date.now
  },
  processedDate: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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
contributionSchema.index({ memberId: 1 })
contributionSchema.index({ status: 1 })
contributionSchema.index({ month: 1 })
contributionSchema.index({ createdAt: -1 })

export default mongoose.model('Contribution', contributionSchema)
