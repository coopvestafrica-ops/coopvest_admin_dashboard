import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'inactive'],
    default: 'pending'
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  kycDocuments: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  bvn: String,
  nin: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  employment: {
    employer: String,
    position: String,
    salary: Number,
    employmentType: String
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    bankCode: String
  },
  contributions: {
    total: {
      type: Number,
      default: 0
    },
    monthly: {
      type: Number,
      default: 0
    },
    lastContributionDate: Date,
    history: [{
      amount: Number,
      date: Date,
      reference: String
    }]
  },
  loans: {
    total: {
      type: Number,
      default: 0
    },
    outstanding: {
      type: Number,
      default: 0
    },
    history: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    }]
  },
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  flags: [{
    type: String,
    enum: ['high_risk', 'overdue_payment', 'suspicious_activity', 'compliance_issue']
  }],
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
memberSchema.index({ email: 1 })
memberSchema.index({ phone: 1 })
memberSchema.index({ status: 1 })
memberSchema.index({ kycStatus: 1 })

export default mongoose.model('Member', memberSchema)
