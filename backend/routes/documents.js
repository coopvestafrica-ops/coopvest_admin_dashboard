import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import DocumentService from '../services/DocumentService.js'

const router = express.Router()

// Get documents
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    res.json({ message: 'Documents endpoint - use specific document generation endpoints' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate Loan Approval Letter
router.post('/loan/approval/:loanId', authenticate, authorize(['approve']), async (req, res) => {
  try {
    const result = await DocumentService.generateLoanApprovalLetter(req.params.loanId)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`)
    res.send(result.content.output('arraybuffer'))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate Loan Statement
router.post('/loan/statement/:loanId', authenticate, authorize(['read']), async (req, res) => {
  try {
    const result = await DocumentService.generateLoanStatement(req.params.loanId)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`)
    res.send(result.content.output('arraybuffer'))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate Contribution Statement
router.post('/contribution/statement', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { memberId, startDate, endDate } = req.body
    
    if (!memberId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Member ID, start date, and end date are required' })
    }
    
    const result = await DocumentService.generateContributionStatement(memberId, startDate, endDate)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`)
    res.send(result.content.output('arraybuffer'))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate Multiple Loan Letters (bulk)
router.post('/loan/approval/bulk', authenticate, authorize(['approve']), async (req, res) => {
  try {
    const { loanIds } = req.body
    
    if (!loanIds || !Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ error: 'Loan IDs array is required' })
    }
    
    const results = []
    const errors = []
    
    for (const loanId of loanIds) {
      try {
        const result = await DocumentService.generateLoanApprovalLetter(loanId)
        results.push({ loanId, documentId: result.documentId, success: true })
      } catch (error) {
        errors.push({ loanId, error: error.message })
      }
    }
    
    res.json({
      message: `Generated ${results.length} documents, ${errors.length} failed`,
      results,
      errors
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
