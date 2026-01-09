import express from 'express'
import { body, param, query, validationResult } from 'express-validator'
import SupportTicket from '../models/SupportTicket.js'
import Member from '../models/Member.js'
import Admin from '../models/Admin.js'
import SheetAuditLog from '../models/SheetAuditLog.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Get all tickets (with filtering)
router.get('/',
  authenticate,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        priority,
        assignedTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query
      
      // Build query
      const query = {}
      
      if (status) query.status = status
      if (priority) query.priority = priority
      if (assignedTo) query.assignedTo = assignedTo
      
      // For non-super-admins, show only their tickets
      if (req.admin.role !== 'super_admin') {
        query.$or = [
          { assignedTo: req.adminId },
          { reportedBy: req.adminId }
        ]
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      // Get total count
      const total = await SupportTicket.countDocuments(query)
      
      // Get tickets
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      
      const tickets = await SupportTicket.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reportedBy', 'firstName lastName email')
        .populate('assignedTo', 'name email')
        .lean()
      
      res.json({
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      })
    } catch (error) {
      console.error('Get tickets error:', error)
      res.status(500).json({ error: 'Failed to fetch tickets' })
    }
  }
)

// Get single ticket
router.get('/:ticketId',
  authenticate,
  async (req, res) => {
    try {
      const { ticketId } = req.params
      
      const ticket = await SupportTicket.findById(ticketId)
        .populate('reportedBy', 'firstName lastName email phone')
        .populate('assignedTo', 'name email')
        .populate('resolvedBy', 'name email')
      
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' })
      }
      
      // Check access
      if (req.admin.role !== 'super_admin' &&
          ticket.assignedTo?.toString() !== req.adminId.toString() &&
          ticket.reportedBy?.toString() !== req.adminId.toString()) {
        return res.status(403).json({ error: 'You do not have access to this ticket' })
      }
      
      res.json({ ticket })
    } catch (error) {
      console.error('Get ticket error:', error)
      res.status(500).json({ error: 'Failed to fetch ticket' })
    }
  }
)

// Create new ticket
router.post('/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type').isIn(['bug', 'feature_request', 'general_inquiry', 'complaint', 'urgent']).withMessage('Invalid ticket type'),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('category').isIn(['technical', 'billing', 'account', 'general', 'other']).withMessage('Invalid category')
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, type, priority, category, reporterEmail, reporterPhone, tags, relatedMemberId } = req.body
      
      // Get reporter info
      let reportedBy = req.adminId
      
      // If member is reporting, use their ID
      if (relatedMemberId) {
        const member = await Member.findById(relatedMemberId)
        if (member) {
          reportedBy = member._id
        }
      }
      
      // Create ticket
      const ticket = new SupportTicket({
        title,
        description,
        type,
        priority,
        category,
        reportedBy,
        reporterEmail: reporterEmail || req.admin.email,
        reporterPhone,
        tags: tags || [],
        relatedMemberId,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours SLA
      })
      
      await ticket.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'create',
        resourceType: 'support_ticket',
        resourceId: ticket._id,
        resourceName: ticket.ticketNumber,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [
          { field: 'title', newValue: title },
          { field: 'description', newValue: description },
          { field: 'priority', newValue: priority }
        ],
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.status(201).json({
        ticket,
        message: 'Ticket created successfully'
      })
    } catch (error) {
      console.error('Create ticket error:', error)
      res.status(500).json({ error: 'Failed to create ticket' })
    }
  }
)

// Assign ticket
router.put('/:ticketId/assign',
  authenticate,
  requireSuperAdmin,
  [
    body('assignTo').notEmpty().withMessage('Assign to admin ID is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { ticketId } = req.params
      const { assignTo } = req.body
      
      const ticket = await SupportTicket.findById(ticketId)
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' })
      }
      
      const admin = await Admin.findById(assignTo)
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' })
      }
      
      ticket.assign(assignTo, req.adminId)
      await ticket.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'update',
        resourceType: 'support_ticket',
        resourceId: ticket._id,
        resourceName: ticket.ticketNumber,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [
          { field: 'assignedTo', newValue: admin.name }
        ],
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        ticket,
        message: 'Ticket assigned successfully'
      })
    } catch (error) {
      console.error('Assign ticket error:', error)
      res.status(500).json({ error: 'Failed to assign ticket' })
    }
  }
)

// Update ticket status
router.put('/:ticketId/status',
  authenticate,
  [
    body('status').isIn(['open', 'in_progress', 'waiting_customer', 'on_hold', 'resolved', 'closed', 'reopened']).withMessage('Invalid status')
  ],
  validate,
  async (req, res) => {
    try {
      const { ticketId } = req.params
      const { status } = req.body
      
      const ticket = await SupportTicket.findById(ticketId)
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' })
      }
      
      // Check access
      if (req.admin.role !== 'super_admin' && ticket.assignedTo?.toString() !== req.adminId.toString()) {
        return res.status(403).json({ error: 'You do not have permission to update this ticket' })
      }
      
      const oldStatus = ticket.status
      ticket.updateStatus(status, req.adminId)
      await ticket.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'update',
        resourceType: 'support_ticket',
        resourceId: ticket._id,
        resourceName: ticket.ticketNumber,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [
          { field: 'status', oldValue: oldStatus, newValue: status }
        ],
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        ticket,
        message: 'Ticket status updated successfully'
      })
    } catch (error) {
      console.error('Update ticket status error:', error)
      res.status(500).json({ error: 'Failed to update ticket status' })
    }
  }
)

// Resolve ticket
router.put('/:ticketId/resolve',
  authenticate,
  [
    body('notes').trim().notEmpty().withMessage('Resolution notes are required')
  ],
  validate,
  async (req, res) => {
    try {
      const { ticketId } = req.params
      const { notes } = req.body
      
      const ticket = await SupportTicket.findById(ticketId)
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' })
      }
      
      // Check access
      if (req.admin.role !== 'super_admin' && ticket.assignedTo?.toString() !== req.adminId.toString()) {
        return res.status(403).json({ error: 'You do not have permission to resolve this ticket' })
      }
      
      ticket.resolve(notes, req.adminId)
      await ticket.save()
      
      // Log audit
      await SheetAuditLog.log({
        action: 'update',
        resourceType: 'support_ticket',
        resourceId: ticket._id,
        resourceName: ticket.ticketNumber,
        userId: req.adminId,
        userName: req.admin.name,
        userEmail: req.admin.email,
        userRole: req.admin.role,
        changes: [
          { field: 'status', newValue: 'resolved' },
          { field: 'resolutionNotes', newValue: notes }
        ],
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      res.json({
        ticket,
        message: 'Ticket resolved successfully'
      })
    } catch (error) {
      console.error('Resolve ticket error:', error)
      res.status(500).json({ error: 'Failed to resolve ticket' })
    }
  }
)

// Record response
router.post('/:ticketId/response',
  authenticate,
  async (req, res) => {
    try {
      const { ticketId } = req.params
      
      const ticket = await SupportTicket.findById(ticketId)
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' })
      }
      
      ticket.recordResponse(req.adminId)
      await ticket.save()
      
      res.json({
        ticket,
        message: 'Response recorded successfully'
      })
    } catch (error) {
      console.error('Record response error:', error)
      res.status(500).json({ error: 'Failed to record response' })
    }
  }
)

// Get SLA metrics
router.get('/metrics/sla',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { days = 30 } = req.query
      
      const metrics = await SupportTicket.getSLAMetrics(parseInt(days))
      
      res.json({ metrics })
    } catch (error) {
      console.error('Get SLA metrics error:', error)
      res.status(500).json({ error: 'Failed to fetch SLA metrics' })
    }
  }
)

// Get open tickets
router.get('/status/open',
  authenticate,
  async (req, res) => {
    try {
      const tickets = await SupportTicket.getOpenTickets()
      
      res.json({ tickets })
    } catch (error) {
      console.error('Get open tickets error:', error)
      res.status(500).json({ error: 'Failed to fetch open tickets' })
    }
  }
)

export default router
