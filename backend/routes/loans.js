import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// Get loans
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    res.json({ message: 'Loans endpoint - coming soon' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create loan
router.post('/', authenticate, authorize(['write']), async (req, res) => {
  try {
    res.json({ message: 'Create loan - coming soon' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
