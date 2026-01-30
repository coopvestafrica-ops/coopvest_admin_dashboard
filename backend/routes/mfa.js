import express from 'express'
import MFAService from '../services/MFAService.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Get MFA status for current admin
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await MFAService.getMFAStatus(req.admin._id)
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Setup MFA (generate QR code)
router.post('/setup', authenticate, async (req, res) => {
  try {
    const result = await MFAService.setupMFA(req.admin._id)
    res.json({
      message: result.message,
      qrCode: result.qrCode,
      secret: result.secret
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Verify MFA setup (enable MFA)
router.post('/verify-setup', authenticate, async (req, res) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }
    
    const result = await MFAService.verifySetup(req.admin._id, token)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Disable MFA
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password, token } = req.body
    
    if (!password || !token) {
      return res.status(400).json({ error: 'Password and verification token are required' })
    }
    
    const result = await MFAService.disableMFA(req.admin._id, password, token)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Verify MFA token (for login flow)
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }
    
    const result = await MFAService.verifyLogin(req.admin._id, token)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Regenerate MFA secret
router.post('/regenerate-secret', authenticate, async (req, res) => {
  try {
    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }
    
    const result = await MFAService.regenerateSecret(req.admin._id, password)
    res.json({
      message: result.message,
      qrCode: result.qrCode,
      secret: result.secret
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Check if action requires MFA
router.post('/check-requirement', authenticate, async (req, res) => {
  try {
    const { action } = req.body
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' })
    }
    
    const required = MFAService.actionRequiresMFA(action)
    res.json({ action, mfaRequired: required })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
