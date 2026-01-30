import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'contribution',           // Member savings/contributions
      'loan_disbursement',      // Loan money given to member
      'loan_repayment',         // Member repaying loan
      'investment',             // Investment deposits
      'investment_return',      // Investment profits/returns
      'withdrawal',             // Member withdrawals
      'fee',                    // Administrative fees
      'penalty',                // Late payment penalties
      'refund',                 // Refunds
      'rollover',               // Loan rollover transactions
      'transfer_in',            // Internal transfers in
      'transfer_out'            // Internal transfers out
    ],
    required: true
  },
  direction: {
    type: String,
    enum: ['inflow', 'outflow'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  baseCurrencyAmount: {
    type: Number,
    default: 0
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'reversed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'cash', 'payroll_deduction', 'internal_transfer', 'card'],
    default: 'bank_transfer'
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  externalReference: String,
  description: String,
  notes: String,
  metadata: {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment'
    },
    contributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contribution'
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    bankReference: String,
    channel: String,
    deviceId: String,
    ipAddress: String
  },
  reversalReason: String,
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reversedAt: Date,
  processedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

// Indexes for fast queries
transactionSchema.index({ transactionId: 1 })
transactionSchema.index({ walletId: 1, createdAt: -1 })
transactionSchema.index({ type: 1, category: 1 })
transactionSchema.index({ status: 1 })
transactionSchema.index({ reference: 1 })
transactionSchema.index({ 'metadata.memberId': 1 })
transactionSchema.index({ 'metadata.loanId': 1 })
transactionSchema.index({ createdAt: -1 })

// Generate unique transaction ID
transactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()
  }
  
  // Set base currency amount if not set
  if (!this.baseCurrencyAmount) {
    this.baseCurrencyAmount = this.amount * this.exchangeRate
  }
  
  next()
})

// Static methods
transactionSchema.statics.findByReference = async function(reference) {
  return this.findOne({ reference })
}

transactionSchema.statics.getWalletTransactions = async function(walletId, options = {}) {
  const { page = 1, limit = 20, type, category, status, startDate, endDate } = options
  
  let query = { walletId }
  
  if (type) query.type = type
  if (category) query.category = category
  if (status) query.status = status
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }
  
  const skip = (page - 1) * limit
  const transactions = await this.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
  
  const total = await this.countDocuments(query)
  
  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  }
}

transactionSchema.statics.reconcile = async function(walletId) {
  const transactions = await this.find({ 
    walletId, 
    status: 'success' 
  }).sort({ createdAt: 1 })
  
  let runningBalance = 0
  const discrepancies = []
  
  for (const tx of transactions) {
    const expectedBalance = tx.type === 'credit' 
      ? runningBalance + tx.amount 
      : runningBalance - tx.amount
    
    if (tx.balanceAfter !== expectedBalance) {
      discrepancies.push({
        transactionId: tx.transactionId,
        expectedBalance,
        actualBalance: tx.balanceAfter,
        difference: expectedBalance - tx.balanceAfter
      })
    }
    
    runningBalance = tx.balanceAfter
  }
  
  return {
    calculatedBalance: runningBalance,
    discrepancyCount: discrepancies.length,
    discrepancies
  }
}

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction
