import express from 'express'
import Investment from '../models/Investment.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all investments with filters
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (status) query.status = status
    if (type) query.type = type
    
    const skip = (page - 1) * limit
    const investments = await Investment.find(query)
      .populate('manager', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
    
    const total = await Investment.countDocuments(query)
    
    res.json({
      investments,
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

// Get investment by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('members.memberId', 'firstName lastName email')
    
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' })
    }
    
    res.json(investment)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create investment
router.post('/', authenticate, authorize(['write']), logAudit, createAuditEntry('investment_created', 'investment'), async (req, res) => {
  try {
    const { name, description, type, targetAmount, expectedROI, location } = req.body
    
    if (!name || !type || !targetAmount) {
      return res.status(400).json({ error: 'Name, type, and target amount are required' })
    }
    
    const investment = new Investment({
      name,
      description,
      type,
      targetAmount,
      totalAmount: targetAmount,
      expectedROI: expectedROI || 0,
      location,
      manager: req.admin._id,
      status: 'planning'
    })
    
    await investment.save()
    await investment.populate('manager', 'name email')
    
    req.auditData.resourceId = investment._id
    req.auditData.resourceName = investment.name
    
    res.status(201).json({ message: 'Investment created', investment })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add member to investment
router.post('/:id/add-member', authenticate, authorize(['write']), logAudit, createAuditEntry('member_added_to_investment', 'investment'), async (req, res) => {
  try {
    const { memberId, amount } = req.body
    const investment = await Investment.findById(req.params.id)
    
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' })
    }
    
    if (!memberId || !amount) {
      return res.status(400).json({ error: 'Member ID and amount are required' })
    }
    
    // Check if member already in investment
    const existingMember = investment.members.find(m => m.memberId.toString() === memberId)
    if (existingMember) {
      return res.status(400).json({ error: 'Member already in this investment' })
    }
    
    const shares = (amount / investment.targetAmount) * 100
    investment.members.push({
      memberId,
      amount,
      shares,
      joinDate: new Date()
    })
    
    investment.amountRaised += amount
    await investment.save()
    
    req.auditData.resourceId = investment._id
    req.auditData.resourceName = investment.name
    
    res.json({ message: 'Member added to investment', investment })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Activate investment
router.post('/:id/activate', authenticate, authorize(['approve']), logAudit, createAuditEntry('investment_activated', 'investment'), async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
    
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' })
    }
    
    investment.status = 'active'
    investment.startDate = new Date()
    await investment.save()
    
    req.auditData.resourceId = investment._id
    req.auditData.resourceName = investment.name
    
    res.json({ message: 'Investment activated', investment })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get investment statistics
router.get('/stats/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await Investment.aggregate([
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalRaised: { $sum: '$amountRaised' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageROI: { $avg: '$expectedROI' }
        }
      }
    ])
    
    res.json(stats[0] || {})
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
