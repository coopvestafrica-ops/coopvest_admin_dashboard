import express from 'express'
import Member from '../models/Member.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all members
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, kycStatus, search, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (status) query.status = status
    if (kycStatus) query.kycStatus = kycStatus
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (page - 1) * limit
    const members = await Member.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
    
    const total = await Member.countDocuments(query)
    
    res.json({
      members,
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

// Get member by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }
    
    res.json(member)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve member
router.post('/:id/approve', authenticate, authorize(['approve']), logAudit, createAuditEntry('member_approved', 'member'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }
    
    member.status = 'active'
    member.kycStatus = 'approved'
    await member.save()
    
    req.auditData.resourceId = member._id
    req.auditData.resourceName = `${member.firstName} ${member.lastName}`
    
    res.json({ message: 'Member approved successfully', member })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Suspend member
router.post('/:id/suspend', authenticate, authorize(['write']), logAudit, createAuditEntry('member_suspended', 'member'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }
    
    member.status = 'suspended'
    await member.save()
    
    req.auditData.resourceId = member._id
    req.auditData.resourceName = `${member.firstName} ${member.lastName}`
    
    res.json({ message: 'Member suspended successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
