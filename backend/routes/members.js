import express from 'express'
import { body, validationResult } from 'express-validator'
import Member from '../models/Member.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'
import AppError from '../utils/appError.js'

const router = express.Router()

// Validation middleware
const validateMember = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg })
    }
    next()
  }
]

// Get all members with pagination and filtering
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { status, kycStatus, search, page = 1, limit = 10 } = req.query
    
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
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
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
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create member
router.post('/', authenticate, authorize(['write']), validateMember, logAudit, createAuditEntry('member_created', 'member'), async (req, res) => {
  try {
    const existingMember = await Member.findOne({ 
      $or: [{ email: req.body.email }, { phone: req.body.phone }] 
    })
    
    if (existingMember) {
      return res.status(400).json({ error: 'Member with this email or phone already exists' })
    }

    const member = new Member(req.body)
    await member.save()
    
    req.auditData.resourceId = member._id
    req.auditData.resourceName = `${member.firstName} ${member.lastName}`
    
    res.status(201).json(member)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update member
router.put('/:id', authenticate, authorize(['write']), validateMember, logAudit, createAuditEntry('member_updated', 'member'), async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }
    
    req.auditData.resourceId = member._id
    req.auditData.resourceName = `${member.firstName} ${member.lastName}`
    
    res.json(member)
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

// Delete member
router.delete('/:id', authenticate, authorize(['admin']), logAudit, createAuditEntry('member_deleted', 'member'), async (req, res, next) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id)
    
    if (!member) {
      return next(new AppError('Member not found', 404))
    }
    
    req.auditData.resourceId = member._id
    req.auditData.resourceName = `${member.firstName} ${member.lastName}`
    
    res.json({ message: 'Member deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Bulk Import Members
import { DataService } from '../services/dataService.js'
router.post('/bulk-import', authenticate, authorize(['write']), async (req, res, next) => {
  try {
    const { csvData } = req.body
    if (!csvData) return next(new AppError('CSV data is required', 400))

    const parsedData = await DataService.parseCSV(csvData)
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (const item of parsedData) {
      try {
        const member = new Member(item)
        await member.save()
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({ item, error: err.message })
      }
    }

    res.json({
      message: `Import completed: ${results.success} succeeded, ${results.failed} failed`,
      results
    })
  } catch (error) {
    next(error)
  }
})

export default router
