import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// Get documents
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    res.json({ message: 'Documents endpoint - coming soon' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
