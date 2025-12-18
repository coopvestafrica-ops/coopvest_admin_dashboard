import express from 'express'
import Contribution from '../models/Contribution.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all contributions with filters
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, memberId, month, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (status) query.status = status
    if (memberId) query.memberId = memberId
    if (month) query.month = month
    
    const skip = (page - 1) * limit
    const contributions = await Contribution.find(query)
      .populate('memberId', 'firstName lastName email')
      .populate('processedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
    
    const total = await Contribution.countDocuments(query)
    
    res.json({
      contributions,
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

// Get contribution by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id)
      .populate('memberId')
      .populate('processedBy', 'name email')
    
    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' })
    }
    
    res.json(contribution)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Record contribution
router.post('/', authenticate, authorize(['write']), logAudit, createAuditEntry('contribution_recorded', 'contribution'), async (req, res) => {
  try {
    const { memberId, amount, type, paymentMethod, month, description } = req.body
    
    if (!memberId || !amount || !month) {
      return res.status(400).json({ error: 'Member ID, amount, and month are required' })
    }
    
    const contribution = new Contribution({
      memberId,
      amount,
      type: type || 'regular',
      paymentMethod: paymentMethod || 'bank_transfer',
      month,
      description,
      status: 'completed',
      processedDate: new Date(),
      processedBy: req.admin._id
    })
    
    await contribution.save()
    await contribution.populate('memberId', 'firstName lastName email')
    
    req.auditData.resourceId = contribution._id
    req.auditData.resourceName = `Contribution from ${contribution.memberName}`
    
    res.status(201).json({ message: 'Contribution recorded', contribution })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get contribution statistics
router.get('/stats/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await Contribution.aggregate([
      {
        $group: {
          _id: null,
          totalContributions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ])
    
    res.json(stats[0] || {})
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get monthly contributions
router.get('/stats/monthly', authenticate, authorize(['read']), async (req, res) => {
  try {
    const monthlyStats = await Contribution.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$month',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 12
      }
    ])
    
    res.json(monthlyStats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
