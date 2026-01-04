import mongoose from 'mongoose'

// QR Code Schema - tracks all QR codes for referrals and loan guarantors
const qrCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['referral', 'loan_guarantor', 'loan_repayment', 'profile_share', 'payment'],
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['loan', 'referral', 'member']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'deactivated', 'used'],
    default: 'active'
  },
  scanCount: {
    type: Number,
    default: 0
  },
  uniqueScans: {
    type: Number,
    default: 0
  },
  scannedBy: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    scannedAt: Date,
    deviceInfo: String,
    location: String
  }],
  expiresAt: Date,
  maxScans: {
    type: Number,
    default: 10
  },
  metadata: {
    loanAmount: Number,
    loanId: String,
    purpose: String,
    description: String
  },
  deactivatedAt: Date,
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  deactivationReason: String
}, { timestamps: true })

// Indexes
qrCodeSchema.index({ code: 1 })
qrCodeSchema.index({ type: 1 })
qrCodeSchema.index({ owner: 1 })
qrCodeSchema.index({ status: 1 })
qrCodeSchema.index({ expiresAt: 1 })

export default mongoose.model('QRCode', qrCodeSchema)
