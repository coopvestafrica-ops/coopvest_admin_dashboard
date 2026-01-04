import express from 'express'
import Referral from '../models/Referral.js'
import ReferralTier from '../models/ReferralTier.js'
import FraudCase from '../models/FraudCase.js'
import QRCode from '../models/QRCode.js'
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/referrals - Get all referrals with filters
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, tier, search, flagged, dateFrom, dateTo } = req.query
    const query = {}
    
    if (status) query.status = status
    if (tier) query.tier = tier
    if (flagged === 'true') query.isFlagged = true
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }
    if (search) {
      query.$or = [
        { referralCode: { $regex: search, $options: 'i' } }
      ]
    }

    const referrals = await Referral.find(query)
      .populate('referrer', 'name phone email')
      .populate('referred', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await Referral.countDocuments(query)

    res.json({
      success: true,
      data: referrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/stats/overview - Get referral statistics
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query
    const startDate = new Date()
    
    if (period === 'day') startDate.setDate(startDate.getDate() - 1)
    else if (period === 'week') startDate.setDate(startDate.getDate() - 7)
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1)
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1)

    const [total, confirmed, pending, rejected, flagged] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'confirmed' }),
      Referral.countDocuments({ status: 'pending' }),
      Referral.countDocuments({ status: 'rejected' }),
      Referral.countDocuments({ isFlagged: true })
    ])

    const totalBonuses = await Referral.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$bonusAmount' } } }
    ])

    const pendingBonuses = await Referral.aggregate([
      { $match: { bonusStatus: 'pending', status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$bonusAmount' } } }
    ])

    res.json({
      success: true,
      data: {
        totalReferrals: total,
        confirmedReferrals: confirmed,
        pendingReferrals: pending,
        rejectedReferrals: rejected,
        flaggedReferrals: flagged,
        totalBonuses: totalBonuses[0]?.total || 0,
        pendingBonuses: pendingBonuses[0]?.total || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/stats/tiers - Get tier distribution
router.get('/stats/tiers', authenticate, requireAdmin, async (req, res) => {
  try {
    const tiers = await Referral.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    res.json({ success: true, data: tiers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/stats/fraud - Get fraud statistics
router.get('/stats/fraud', authenticate, requireAdmin, async (req, res) => {
  try {
    const [open, critical, high, medium, low] = await Promise.all([
      FraudCase.countDocuments({ status: 'open' }),
      FraudCase.countDocuments({ severity: 'critical', status: 'open' }),
      FraudCase.countDocuments({ severity: 'high', status: 'open' }),
      FraudCase.countDocuments({ severity: 'medium', status: 'open' }),
      FraudCase.countDocuments({ severity: 'low', status: 'open' })
    ])
    res.json({
      success: true,
      data: { open, critical, high, medium, low }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/tiers - Get all tiers
router.get('/tiers', authenticate, requireAdmin, async (req, res) => {
  try {
    const tiers = await ReferralTier.find({ isActive: true }).sort({ order: 1 })
    res.json({ success: true, data: tiers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/tiers - Create tier
router.post('/tiers', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const tier = new ReferralTier(req.body)
    await tier.save()
    res.status(201).json({ success: true, data: tier })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/referrals/tiers/:id - Update tier
router.put('/tiers/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const tier = await ReferralTier.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: tier })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/referrals/tiers/:id - Delete tier
router.delete('/tiers/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await ReferralTier.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Tier deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/:id - Get single referral
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('referrer', 'name phone email')
      .populate('referred', 'name phone email')
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/:id/approve - Approve flagged referral
router.post('/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      { 
        isFlagged: false, 
        flaggedReason: null,
        status: 'confirmed',
        confirmedAt: new Date()
      },
      { new: true }
    )
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/:id/reject - Reject referral
router.post('/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedReason: req.body.reason
      },
      { new: true }
    )
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/:id/flag - Flag referral
router.post('/:id/flag', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      { 
        isFlagged: true,
        flaggedReason: req.body.reason,
        flaggedAt: new Date(),
        status: 'pending'
      },
      { new: true }
    )
    
    // Create fraud case
    const fraudCase = new FraudCase({
      type: 'manual_flag',
      severity: req.body.severity || 'medium',
      involvedReferrals: [req.params.id],
      evidence: { descriptions: [req.body.reason] },
      detectionMethod: 'manual'
    })
    await fraudCase.save()
    
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/:id/unflag - Unflag referral
router.post('/:id/unflag', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      { isFlagged: false, flaggedReason: null },
      { new: true }
    )
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/referrals/fraud/suspicious - Get suspicious referrals
router.get('/fraud/suspicious', authenticate, requireAdmin, async (req, res) => {
  try {
    const fraudCases = await FraudCase.find({ status: 'open' })
      .populate('involvedMembers.member', 'name phone')
      .sort({ severity: -1, detectedAt: -1 })
    res.json({ success: true, data: fraudCases })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/fraud/investigate/:id - Investigate fraud case
router.post('/fraud/investigate/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const fraudCase = await FraudCase.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'investigating',
        $push: {
          investigationNotes: {
            timestamp: new Date(),
            admin: req.admin.id,
            note: req.body.notes,
            action: req.body.action
          }
        }
      },
      { new: true }
    )
    res.json({ success: true, data: fraudCase })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/fraud/ban/:memberId - Ban member for fraud
router.post('/fraud/ban/:memberId', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await FraudCase.create({
      type: 'manual_flag',
      severity: 'critical',
      status: 'resolved',
      involvedMembers: [{ member: req.params.memberId, role: 'both' }],
      resolution: {
        action: 'member_banned',
        reason: req.body.reason,
        resolvedBy: req.admin.id,
        resolvedAt: new Date()
      },
      detectionMethod: 'admin_report'
    })
    res.json({ success: true, message: 'Member banned for fraud' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/bonuses/calculate - Calculate pending bonuses
router.post('/bonuses/calculate', authenticate, requireAdmin, async (req, res) => {
  try {
    const tiers = await ReferralTier.find({ isActive: true }).sort({ order: 1 })
    
    // Update tier based on referral count for each referrer
    const referrals = await Referral.find({ status: 'confirmed', bonusStatus: 'pending' })
    
    for (const referral of referrals) {
      const referralCount = await Referral.countDocuments({ 
        referrer: referral.referrer, 
        status: 'confirmed' 
      })
      
      let tier = 'Bronze'
      let discount = 0
      for (const t of tiers.reverse()) {
        if (referralCount >= t.minReferrals) {
          tier = t.name
          discount = t.discountPercent
          break
        }
      }
      
      const baseBonus = 5000 // Base bonus amount
      await Referral.findByIdAndUpdate(referral._id, {
        tier,
        tierBonusPercent: discount,
        bonusAmount: baseBonus * (1 + discount / 100),
        lockInEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
    }
    
    res.json({ success: true, message: `Updated ${referrals.length} referral bonuses` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/referrals/bonuses/:id/disburse - Disburse bonus
router.post('/bonuses/:id/disburse', authenticate, requireAdmin, async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      { bonusStatus: 'disbursed', bonusConsumed: true },
      { new: true }
    )
    res.json({ success: true, data: referral })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
