import express from 'express'
import Rollover from '../models/Rollover.js'
import Loan from '../models/Loan.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all rollover requests with filters
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, memberId, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (status) query.status = status
    if (memberId) query.memberId = memberId
    
    const skip = (page - 1) * limit
    const rollovers = await Rollover.find(query)
      .populate('memberId', 'firstName lastName email phone')
      .populate('originalLoanId', 'amount tenure interestRate')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ requestedAt: -1 })
    
    const total = await Rollover.countDocuments(query)
    
    res.json({
      rollovers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get pending rollover requests (for admin dashboard queue)
router.get('/pending', authenticate, authorize(['read']), async (req, res) => {
  try {
    const rollovers = await Rollover.find({ 
      status: { $in: ['pending', 'awaiting_admin_approval'] }
    })
      .populate('memberId', 'firstName lastName email phone')
      .populate('originalLoanId', 'amount tenure interestRate')
      .sort({ requestedAt: 1 })
    
    res.json({ rollovers, count: rollovers.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get rollover by ID with guarantor details
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const rollover = await Rollover.findById(req.params.id)
      .populate('memberId', 'firstName lastName email phone')
      .populate('originalLoanId', 'amount tenure interestRate outstandingBalance totalRepaid')
      .populate('guarantors.guarantorId', 'firstName lastName email phone')
    
    if (!rollover) {
      return res.status(404).json({ error: 'Rollover not found' })
    }
    
    res.json(rollover)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get guarantors for a rollover
router.get('/:id/guarantors', authenticate, authorize(['read']), async (req, res) => {
  try {
    const rollover = await Rollover.findById(req.params.id)
      .populate('guarantors.guarantorId', 'firstName lastName email phone')
    
    if (!rollover) {
      return res.status(404).json({ error: 'Rollover not found' })
    }
    
    const guarantors = rollover.guarantors || []
    
    // Count status
    const accepted = guarantors.filter(g => g.status === 'accepted').length
    const declined = guarantors.filter(g => g.status === 'declined').length
    const pending = guarantors.filter(g => g.status === 'pending' || g.status === 'invited').length
    
    res.json({
      guarantors,
      summary: { accepted, declined, pending, required: 3 }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve rollover request
router.post('/:id/approve', authenticate, authorize(['approve']), logAudit, createAuditEntry('rollover_approved', 'rollover'), async (req, res) => {
  try {
    const rollover = await Rollover.findById(req.params.id)
    
    if (!rollover) {
      return res.status(404).json({ error: 'Rollover not found' })
    }
    
    // Validate all guarantors have consented
    const guarantors = rollover.guarantors || []
    const accepted = guarantors.filter(g => g.status === 'accepted').length
    const declined = guarantors.filter(g => g.status === 'declined').length
    
    if (accepted < 3) {
      return res.status(400).json({ 
        error: 'Cannot approve rollover. All 3 guarantors must consent before approval.',
        accepted,
        declined
      })
    }
    
    if (declined > 0) {
      return res.status(400).json({ 
        error: 'Cannot approve rollover. One or more guarantors have declined.',
        declined
      })
    }
    
    // Update rollover status
    rollover.status = 'approved'
    rollover.approvedAt = new Date()
    rollover.approvedBy = req.admin._id
    rollover.adminNotes = req.body.notes || null
    
    // Create new loan for the rollover (same principal, new terms)
    const newLoan = new Loan({
      memberId: rollover.memberId,
      parentRolloverId: rollover._id,
      principalAmount: rollover.originalPrincipal,
      amount: rollover.originalPrincipal,
      outstandingBalance: rollover.originalPrincipal,
      totalRepaid: 0,
      tenure: rollover.newTenure,
      interestRate: rollover.newInterestRate,
      monthlyRepayment: rollover.newMonthlyRepayment,
      totalRepayment: rollover.newTotalRepayment,
      status: 'disbursed',
      disbursementDate: new Date(),
      dueDate: new Date(Date.now() + rollover.newTenure * 30 * 24 * 60 * 60 * 1000),
      previousLoanId: rollover.originalLoanId
    })
    
    await newLoan.save()
    
    // Mark old loan as rolled over
    await Loan.findByIdAndUpdate(rollover.originalLoanId, {
      status: 'rolled_over',
      rolledOverTo: newLoan._id
    })
    
    rollover.newLoanId = newLoan._id
    await rollover.save()
    
    req.auditData.resourceId = rollover._id
    req.auditData.resourceName = `Rollover for ${rollover.memberName}`
    
    res.json({ 
      message: 'Rollover approved successfully',
      rollover,
      newLoan
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reject rollover request
router.post('/:id/reject', authenticate, authorize(['approve']), logAudit, createAuditEntry('rollover_rejected', 'rollover'), async (req, res) => {
  try {
    const { reason } = req.body
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' })
    }
    
    const rollover = await Rollover.findById(req.params.id)
    
    if (!rollover) {
      return res.status(404).json({ error: 'Rollover not found' })
    }
    
    if (rollover.status === 'approved') {
      return res.status(400).json({ error: 'Cannot reject an already approved rollover' })
    }
    
    rollover.status = 'rejected'
    rollover.rejectedAt = new Date()
    rollover.rejectedBy = req.admin._id
    rollover.rejectionReason = reason
    
    await rollover.save()
    
    req.auditData.resourceId = rollover._id
    req.auditData.resourceName = `Rollover for ${rollover.memberName}`
    
    res.json({ message: 'Rollover rejected', rollover })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get rollover statistics
router.get('/stats/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await Rollover.aggregate([
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          awaitingApprovalCount: {
            $sum: { $cond: [{ $eq: ['$status', 'awaiting_admin_approval'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ])
    
    res.json(stats[0] || {
      totalRequests: 0,
      pendingCount: 0,
      awaitingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      cancelledCount: 0
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
