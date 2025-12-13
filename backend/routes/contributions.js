import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// Get contributions
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    res.json({ message: 'Contributions endpoint - coming soon' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Record contribution
router.post('/', authenticate, authorize(['write']), async (req, res) => {
  try {
    res.json({ message: 'Record contribution - coming soon' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
