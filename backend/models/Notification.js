import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  recipientType: {
    type: String,
    enum: ['member', 'admin', 'system'],
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientType',
    required: true
  },
  type: {
    type: String,
    enum: [
      'loan_approval',           // Loan approved
      'loan_rejection',          // Loan rejected
      'loan_disbursement',       // Loan funds disbursed
      'loan_repayment_due',      // Upcoming repayment
      'loan_repayment_overdue',  // Missed payment
      'loan_completed',          // Loan fully repaid
      'contribution_received',   // Contribution confirmed
      'contribution_reminder',   // Monthly contribution reminder
      'account_suspended',       // Account suspended
      'account_activated',       // Account reactivated
      'kyc_approved',            // KYC verification passed
      'kyc_rejected',            // KYC verification failed
      'investment_update',       // Investment status change
      'investment_return',       // Investment profit received
      'rollover_request',        // Rollover request
      'rollover_approved',       // Rollover approved
      'rollover_rejected',       // Rollover rejected
      'document_ready',          // Generated document ready
      'system_maintenance',      // System maintenance notice
      'policy_update',           // Policy change notice
      'general'                  // General notification
    ],
    required: true
  },
  channel: {
    type: String,
    enum: ['in_app', 'email', 'sms', 'push'],
    default: 'in_app'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    actionUrl: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  sent: {
    type: Boolean,
    default: false
  },
  sentAt: Date,
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending'
  },
  smsStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

// Indexes
notificationSchema.index({ notificationId: 1 })
notificationSchema.index({ recipientType: 1, recipientId: 1 })
notificationSchema.index({ type: 1 })
notificationSchema.index({ read: 1, createdAt: -1 })
notificationSchema.index({ priority: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 })

// Generate unique notification ID
notificationSchema.pre('save', function(next) {
  if (!this.notificationId) {
    this.notificationId = 'NOTIF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
  }
  next()
})

// Methods
notificationSchema.methods.markAsRead = async function() {
  this.read = true
  this.readAt = new Date()
  await this.save()
  return this
}

notificationSchema.methods.markAsSent = async function() {
  this.sent = true
  this.sentAt = new Date()
  await this.save()
  return this
}

// Static methods
notificationSchema.statics.getUnreadCount = async function(recipientType, recipientId) {
  return this.countDocuments({
    recipientType,
    recipientId,
    read: false
  })
}

notificationSchema.statics.getByRecipient = async function(recipientType, recipientId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options
  
  let query = { recipientType, recipientId }
  if (unreadOnly) query.read = false
  
  const skip = (page - 1) * limit
  const notifications = await this.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
  
  const total = await this.countDocuments(query)
  
  return {
    notifications,
    unreadCount: await this.getUnreadCount(recipientType, recipientId),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  }
}

notificationSchema.statics.markAllAsRead = async function(recipientType, recipientId) {
  return this.updateMany(
    { recipientType, recipientId, read: false },
    { $set: { read: true, readAt: new Date() } }
  )
}

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
