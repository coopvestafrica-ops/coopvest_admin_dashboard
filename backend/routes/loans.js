import express from 'express'
import Loan from '../models/Loan.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all loans with filters
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, memberId, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (status) query.status = status
    if (memberId) query.memberId = memberId
    
    const skip = (page - 1) * limit
    const loans = await Loan.find(query)
      .populate('memberId', 'firstName lastName email')
      .populate('approvedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
    
    const total = await Loan.countDocuments(query)
    
    res.json({
      loans,
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

// Get loan by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('memberId')
      .populate('approvedBy', 'name email')
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }
    
    res.json(loan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create loan application
router.post('/', authenticate, authorize(['write']), logAudit, createAuditEntry('loan_created', 'loan'), async (req, res) => {
  try {
    const { memberId, amount, purpose, collateral } = req.body
    
    if (!memberId || !amount) {
      return res.status(400).json({ error: 'Member ID and amount are required' })
    }
    
    const loan = new Loan({
      memberId,
      amount,
      principalAmount: amount,
      purpose,
      collateral,
      outstandingBalance: amount
    })
    
    await loan.save()
    await loan.populate('memberId', 'firstName lastName email')
    
    req.auditData.resourceId = loan._id
    req.auditData.resourceName = `Loan for ${loan.memberName}`
    
    res.status(201).json({ message: 'Loan application created', loan })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve loan
router.post('/:id/approve', authenticate, authorize(['approve']), logAudit, createAuditEntry('loan_approved', 'loan'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }
    
    loan.status = 'approved'
    loan.approvalDate = new Date()
    loan.approvedBy = req.admin._id
    await loan.save()
    
    req.auditData.resourceId = loan._id
    req.auditData.resourceName = `Loan for ${loan.memberName}`
    
    res.json({ message: 'Loan approved', loan })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Disburse loan
router.post('/:id/disburse', authenticate, authorize(['approve']), logAudit, createAuditEntry('loan_disbursed', 'loan'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }
    
    if (loan.status !== 'approved') {
      return res.status(400).json({ error: 'Loan must be approved before disbursement' })
    }
    
    loan.status = 'disbursed'
    loan.disbursementDate = new Date()
    loan.dueDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    await loan.save()
    
    req.auditData.resourceId = loan._id
    req.auditData.resourceName = `Loan for ${loan.memberName}`
    
    res.json({ message: 'Loan disbursed', loan })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Record repayment
router.post('/:id/repay', authenticate, authorize(['write']), logAudit, createAuditEntry('loan_repayment', 'loan'), async (req, res) => {
  try {
    const { amount } = req.body
    const loan = await Loan.findById(req.params.id)
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }
    
    loan.repayments.push({
      amount,
      date: new Date(),
      status: 'completed'
    })
    
    loan.totalRepaid += amount
    loan.outstandingBalance = loan.principalAmount - loan.totalRepaid
    
    if (loan.outstandingBalance <= 0) {
      loan.status = 'completed'
      loan.outstandingBalance = 0
    } else if (loan.status === 'disbursed') {
      loan.status = 'repaying'
    }
    
    await loan.save()
    
    req.auditData.resourceId = loan._id
    req.auditData.resourceName = `Loan repayment for ${loan.memberName}`
    
    res.json({ message: 'Repayment recorded', loan })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get loan statistics
router.get('/stats/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' },
          totalRepaid: { $sum: '$totalRepaid' },
          totalOutstanding: { $sum: '$outstandingBalance' },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          disbursedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'disbursed'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          defaultedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'defaulted'] }, 1, 0] }
          }
        }
      }
    ])
    
    res.json(stats[0] || {})
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
