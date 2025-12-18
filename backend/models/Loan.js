import mongoose from 'mongoose'

const loanSchema = new mongoose.Schema({
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
  principalAmount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    default: 5 // 5% default interest
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'repaying', 'completed', 'defaulted'],
    default: 'pending'
  },
  purpose: String,
  applicationDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  disbursementDate: Date,
  dueDate: Date,
  repaymentSchedule: {
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'monthly'
    },
    installments: Number,
    installmentAmount: Number
  },
  repayments: [{
    amount: Number,
    date: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'pending'
    }
  }],
  totalRepaid: {
    type: Number,
    default: 0
  },
  outstandingBalance: Number,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  collateral: String,
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
loanSchema.index({ memberId: 1 })
loanSchema.index({ status: 1 })
loanSchema.index({ createdAt: -1 })

export default mongoose.model('Loan', loanSchema)
