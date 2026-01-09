import mongoose from 'mongoose'

/**
 * SupportTicket Model
 * Manages support tickets with full lifecycle management
 * Supports assignment, status tracking, and audit logging
 */
const supportTicketSchema = new mongoose.Schema({
  // Ticket identification
  ticketNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // Ticket type
  type: {
    type: String,
    enum: ['bug', 'feature_request', 'general_inquiry', 'complaint', 'urgent'],
    default: 'general_inquiry',
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Status lifecycle
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'on_hold', 'resolved', 'closed', 'reopened'],
    default: 'open',
    index: true
  },
  
  // Ticket content
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  // Category
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'general', 'other'],
    default: 'general'
  },
  
  // Reporter information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  
  reporterEmail: String,
  reporterPhone: String,
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    index: true
  },
  
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Related resources
  relatedSheet: String,
  relatedRowId: mongoose.Schema.Types.ObjectId,
  relatedMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  
  // Ticket details
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date
  }],
  
  tags: [String],
  
  // Resolution tracking
  resolutionNotes: String,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Customer satisfaction
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  satisfactionComment: String,
  
  // SLA tracking
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  dueDate: Date,
  
  firstResponseAt: Date,
  lastResponseAt: Date,
  
  // Activity tracking
  responseCount: {
    type: Number,
    default: 0
  },
  
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Compound indexes
supportTicketSchema.index({ status: 1, createdAt: -1 })
supportTicketSchema.index({ assignedTo: 1, status: 1 })
supportTicketSchema.index({ reportedBy: 1, createdAt: -1 })
supportTicketSchema.index({ priority: 1, status: 1 })

// Generate ticket number
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments()
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    this.ticketNumber = `TKT-${year}${month}-${String(count + 1).padStart(5, '0')}`
  }
  next()
})

// Method to assign ticket
supportTicketSchema.methods.assign = function(adminId, assignedBy) {
  this.assignedTo = adminId
  this.assignedAt = new Date()
  this.assignedBy = assignedBy
  this.status = 'in_progress'
}

// Method to update status
supportTicketSchema.methods.updateStatus = function(newStatus, updatedBy) {
  const validTransitions = {
    'open': ['in_progress', 'on_hold', 'closed'],
    'in_progress': ['waiting_customer', 'on_hold', 'resolved', 'closed'],
    'waiting_customer': ['in_progress', 'on_hold', 'closed'],
    'on_hold': ['in_progress', 'waiting_customer', 'closed'],
    'resolved': ['closed', 'reopened'],
    'closed': ['reopened'],
    'reopened': ['in_progress', 'on_hold', 'closed']
  }
  
  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`)
  }
  
  this.status = newStatus
  this.updatedBy = updatedBy
  this.lastUpdatedAt = new Date()
  
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date()
    this.resolvedBy = updatedBy
  }
}

// Method to resolve ticket
supportTicketSchema.methods.resolve = function(notes, resolvedBy) {
  this.status = 'resolved'
  this.resolutionNotes = notes
  this.resolvedAt = new Date()
  this.resolvedBy = resolvedBy
  this.updatedBy = resolvedBy
  this.lastUpdatedAt = new Date()
}

// Method to close ticket
supportTicketSchema.methods.close = function(updatedBy) {
  this.status = 'closed'
  this.updatedBy = updatedBy
  this.lastUpdatedAt = new Date()
}

// Method to reopen ticket
supportTicketSchema.methods.reopen = function(updatedBy) {
  this.status = 'reopened'
  this.updatedBy = updatedBy
  this.lastUpdatedAt = new Date()
}

// Method to add response
supportTicketSchema.methods.recordResponse = function(respondedBy) {
  this.responseCount += 1
  this.lastResponseAt = new Date()
  
  if (!this.firstResponseAt) {
    this.firstResponseAt = new Date()
  }
  
  this.updatedBy = respondedBy
  this.lastUpdatedAt = new Date()
}

// Method to set satisfaction rating
supportTicketSchema.methods.setSatisfactionRating = function(rating, comment) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }
  
  this.satisfactionRating = rating
  this.satisfactionComment = comment
}

// Static method to get open tickets
supportTicketSchema.statics.getOpenTickets = async function(limit = 50) {
  return this.find({
    status: { $in: ['open', 'in_progress', 'waiting_customer'] }
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('reportedBy', 'firstName lastName email')
    .populate('assignedTo', 'name email')
    .lean()
}

// Static method to get tickets for staff member
supportTicketSchema.statics.getStaffTickets = async function(adminId, status = null) {
  const query = { assignedTo: adminId }
  
  if (status) {
    query.status = status
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('reportedBy', 'firstName lastName email')
    .lean()
}

// Static method to get overdue tickets
supportTicketSchema.statics.getOverdueTickets = async function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['resolved', 'closed'] }
  })
    .sort({ dueDate: 1 })
    .populate('assignedTo', 'name email')
    .lean()
}

// Static method to get tickets by priority
supportTicketSchema.statics.getTicketsByPriority = async function(priority) {
  return this.find({
    priority,
    status: { $nin: ['resolved', 'closed'] }
  })
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'firstName lastName email')
    .populate('assignedTo', 'name email')
    .lean()
}

// Static method to get SLA metrics
supportTicketSchema.statics.getSLAMetrics = async function(days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const tickets = await this.find({
    createdAt: { $gte: startDate }
  }).lean()
  
  const metrics = {
    total: tickets.length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    avgSatisfactionRating: 0
  }
  
  // Calculate averages
  const withFirstResponse = tickets.filter(t => t.firstResponseAt)
  if (withFirstResponse.length > 0) {
    const totalResponseTime = withFirstResponse.reduce((sum, t) => {
      return sum + (t.firstResponseAt - t.createdAt)
    }, 0)
    metrics.avgResponseTime = Math.round(totalResponseTime / withFirstResponse.length / 1000 / 60) // minutes
  }
  
  const resolved = tickets.filter(t => t.resolvedAt)
  if (resolved.length > 0) {
    const totalResolutionTime = resolved.reduce((sum, t) => {
      return sum + (t.resolvedAt - t.createdAt)
    }, 0)
    metrics.avgResolutionTime = Math.round(totalResolutionTime / resolved.length / 1000 / 60 / 60) // hours
  }
  
  const rated = tickets.filter(t => t.satisfactionRating)
  if (rated.length > 0) {
    const totalRating = rated.reduce((sum, t) => sum + t.satisfactionRating, 0)
    metrics.avgSatisfactionRating = (totalRating / rated.length).toFixed(2)
  }
  
  return metrics
}

export default mongoose.model('SupportTicket', supportTicketSchema)
