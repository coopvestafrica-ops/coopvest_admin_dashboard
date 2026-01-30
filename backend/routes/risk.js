import express from 'express'
import RiskScoringService from '../services/RiskScoringService.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Calculate risk score for a member
router.post('/calculate/:memberId', authenticate, authorize(['read']), async (req, res) => {
  try {
    const riskScore = await RiskScoringService.calculateRiskScore(req.params.memberId)
    res.json({
      message: 'Risk score calculated successfully',
      riskScore
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get risk score for a member
router.get('/member/:memberId', authenticate, authorize(['read']), async (req, res) => {
  try {
    const riskScore = await RiskScoringService.getRiskScore(req.params.memberId)
    if (!riskScore) {
      return res.status(404).json({ error: 'Risk score not found' })
    }
    res.json(riskScore)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get high risk members
router.get('/high-risk', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { limit = 100 } = req.query
    const members = await RiskScoringService.getHighRiskMembers(parseInt(limit))
    res.json({ count: members.length, members })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get risk statistics
router.get('/stats', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await RiskScoringService.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Check loan eligibility
router.post('/check-eligibility/:memberId', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { loanAmount } = req.body
    
    if (!loanAmount || loanAmount <= 0) {
      return res.status(400).json({ error: 'Valid loan amount is required' })
    }
    
    const eligibility = await RiskScoringService.checkLoanEligibility(
      req.params.memberId,
      loanAmount
    )
    
    res.json(eligibility)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Batch recalculate risk scores
router.post('/batch-recalculate', authenticate, authorize(['write']), logAudit, createAuditEntry('risk_scores_batch', 'risk_score'), async (req, res) => {
  try {
    const { memberIds } = req.body
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs array is required' })
    }
    
    const results = await RiskScoringService.batchRecalculate(memberIds)
    
    req.auditData.resourceName = `Batch recalculation: ${results.success} success, ${results.failed} failed`
    
    res.json({
      message: 'Batch recalculation completed',
      ...results
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get members by tier
router.get('/tier/:tier', authenticate, authorize(['read']), async (req, res) => {
  try {
    const RiskScore = (await import('../models/RiskScore.js')).default
    const members = await RiskScore.getByTier(req.params.tier)
    res.json({ count: members.length, members })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
