import express from 'express'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import { authenticate, checkAccountLock } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Login
router.post('/login', checkAccountLock, logAudit, createAuditEntry('login_attempt', 'admin'), async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    
    const admin = await Admin.findOne({ email })
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    if (admin.isLocked()) {
      return res.status(423).json({ error: 'Account is locked. Please try again later.' })
    }
    
    const isPasswordValid = await admin.comparePassword(password)
    
    if (!isPasswordValid) {
      await admin.incLoginAttempts()
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    // Reset login attempts on successful login
    await admin.resetLoginAttempts()
    admin.lastLogin = new Date()
    await admin.save()
    
    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )
    
    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        mfaEnabled: admin.mfaEnabled
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({
    valid: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      permissions: req.admin.permissions
    }
  })
})

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticate, logAudit, createAuditEntry('logout', 'admin'), (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

// Change password
router.post('/change-password', authenticate, logAudit, createAuditEntry('password_changed', 'admin'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' })
    }
    
    const isPasswordValid = await req.admin.comparePassword(currentPassword)
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    
    req.admin.password = newPassword
    await req.admin.save()
    
    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
