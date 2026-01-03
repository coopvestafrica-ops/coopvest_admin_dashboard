import mongoose from 'mongoose'

const guarantorSchema = new mongoose.Schema({
  guarantorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  guarantorName: {
    type: String,
    required: true
  },
  guarantorPhone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'invited', 'accepted', 'declined'],
    default: 'pending'
  },
  declineReason: {
    type: String,
    default: null
  },
  committedAmount: {
    type: Number,
    default: 0
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, { _id: true })

const rolloverSchema = new mongoose.Schema({
  originalLoanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  memberPhone: {
    type: String,
    required: true
  },
  
  // Original loan details
  originalPrincipal: {
    type: Number,
    required: true
  },
  outstandingBalance: {
    type: Number,
    required: true
  },
  totalRepaid: {
    type: Number,
    default: 0
  },
  repaymentPercentage: {
    type: Number,
    required: true
  },
  
  // New loan terms (after rollover)
  newTenure: {
    type: Number,
    required: true
  },
  newInterestRate: {
    type: Number,
    required: true
  },
  newMonthlyRepayment: {
    type: Number,
    required: true
  },
  newTotalRepayment: {
    type: Number,
    required: true
  },
  
  // Guarantors for this rollover
  guarantors: [guarantorSchema],
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'awaiting_admin_approval', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Admin approval/rejection
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  adminNotes: {
    type: String,
    default: null
  },
  
  // New loan created after approval
  newLoanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    default: null
  },
  
  // Timestamps
  requestedAt: {
    type: Date,
    default: Date.now
  },
  guarantorConsentDeadline: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Indexes for better query performance
rolloverSchema.index({ memberId: 1 })
rolloverSchema.index({ originalLoanId: 1 })
rolloverSchema.index({ status: 1 })
rolloverSchema.index({ requestedAt: -1 })
rolloverSchema.index({ 'guarantors.status': 1 })

// Virtuals
rolloverSchema.virtual('allGuarantorsAccepted').get(function() {
  const guarantors = this.guarantors || []
  return guarantors.length === 3 && guarantors.every(g => g.status === 'accepted')
})

rolloverSchema.virtual('hasDeclinedGuarantor').get(function() {
  const guarantors = this.guarantors || []
  return guarantors.some(g => g.status === 'declined')
})

rolloverSchema.virtual('acceptedGuarantorCount').get(function() {
  const guarantors = this.guarantors || []
  return guarantors.filter(g => g.status === 'accepted').length
})

rolloverSchema.set('toJSON', { virtuals: true })
rolloverSchema.set('toObject', { virtuals: true })

const Rollover = mongoose.model('Rollover', rolloverSchema)

export default Rollover
