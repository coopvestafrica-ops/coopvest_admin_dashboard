import mongoose from 'mongoose'

const walletSchema = new mongoose.Schema({
  walletId: {
    type: String,
    required: true,
    unique: true
  },
  ownerType: {
    type: String,
    enum: ['member', 'platform'],
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'ownerType',
    required: true
  },
  type: {
    type: String,
    enum: ['contribution', 'loan_disbursement', 'repayment', 'investment', 'withdrawal', 'fee', 'refund', 'rollover'],
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  balance: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  lockedBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended', 'closed'],
    default: 'active'
  },
  lastTransactionAt: Date,
  metadata: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    bankCode: String,
    bvn: String
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

// Compound index for owner lookup
walletSchema.index({ ownerType: 1, ownerId: 1 })
walletSchema.index({ walletId: 1 })
walletSchema.index({ status: 1 })

// Generate unique wallet ID
walletSchema.pre('save', function(next) {
  if (!this.walletId) {
    this.walletId = 'WAL' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
  }
  next()
})

// Methods
walletSchema.methods.credit = async function(amount, description = '') {
  const Transaction = mongoose.model('Transaction')
  
  this.balance += amount
  this.availableBalance += amount
  this.lastTransactionAt = new Date()
  await this.save()
  
  // Create transaction record
  const transaction = new Transaction({
    walletId: this._id,
    type: 'credit',
    category: this.type,
    amount,
    balanceAfter: this.balance,
    description,
    status: 'success'
  })
  await transaction.save()
  
  return transaction
}

walletSchema.methods.debit = async function(amount, description = '') {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient available balance')
  }
  
  const Transaction = mongoose.model('Transaction')
  
  this.balance -= amount
  this.availableBalance -= amount
  this.lastTransactionAt = new Date()
  await this.save()
  
  // Create transaction record
  const transaction = new Transaction({
    walletId: this._id,
    type: 'debit',
    category: this.type,
    amount,
    balanceAfter: this.balance,
    description,
    status: 'success'
  })
  await transaction.save()
  
  return transaction
}

walletSchema.methods.freeze = async function(amount) {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient available balance to freeze')
  }
  
  this.availableBalance -= amount
  this.lockedBalance += amount
  await this.save()
  
  return this
}

walletSchema.methods.unfreeze = async function(amount) {
  if (this.lockedBalance < amount) {
    throw new Error('Insufficient locked balance to unfreeze')
  }
  
  this.lockedBalance -= amount
  this.availableBalance += amount
  await this.save()
  
  return this
}

const Wallet = mongoose.model('Wallet', walletSchema)

export default Wallet
