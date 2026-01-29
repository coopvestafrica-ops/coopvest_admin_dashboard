import express from 'express'
import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import Admin from '../models/Admin.js'
import SheetAssignment from '../models/SheetAssignment.js'
import SheetDefinition from '../models/SheetDefinition.js'
import { authenticate, checkAccountLock } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'
import AppError from '../utils/appError.js'

const router = express.Router()

// Login
router.post('/login', checkAccountLock, logAudit, createAuditEntry('login_attempt', 'admin'), async (req, res, next) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return next(new AppError('Email and password are required', 400))
    }
    
    const admin = await Admin.findOne({ email })
    
    if (!admin) {
      return next(new AppError('Invalid credentials', 401))
    }
    
    if (admin.isLocked()) {
      return next(new AppError('Account is locked. Please try again later.', 423))
    }
    
    const isPasswordValid = await admin.comparePassword(password)
    
    if (!isPasswordValid) {
      await admin.incLoginAttempts()
      return next(new AppError('Invalid credentials', 401))
    }
    
    // If MFA is enabled, don't issue token yet
    if (admin.mfaEnabled) {
      return res.json({
        mfaRequired: true,
        adminId: admin._id
      })
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
    next(error)
  }
})

// Verify MFA Token
router.post('/verify-mfa', async (req, res, next) => {
  try {
    const { adminId, token } = req.body
    
    const admin = await Admin.findById(adminId)
    if (!admin) return next(new AppError('Admin not found', 404))

    const verified = speakeasy.totp.verify({
      secret: admin.mfaSecret,
      encoding: 'base32',
      token
    })

    if (!verified) {
      return next(new AppError('Invalid MFA token', 401))
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts()
    admin.lastLogin = new Date()
    await admin.save()

    const jwtToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )

    res.json({
      token: jwtToken,
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
    next(error)
  }
})

// Setup MFA
router.post('/setup-mfa', authenticate, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Coopvest Admin (${req.admin.email})`
    })

    req.admin.mfaSecret = secret.base32
    await req.admin.save()

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    })
  } catch (error) {
    next(error)
  }
})

// Enable MFA
router.post('/enable-mfa', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body
    
    const verified = speakeasy.totp.verify({
      secret: req.admin.mfaSecret,
      encoding: 'base32',
      token
    })

    if (!verified) {
      return next(new AppError('Invalid MFA token', 401))
    }

    req.admin.mfaEnabled = true
    await req.admin.save()

    res.json({ message: 'MFA enabled successfully' })
  } catch (error) {
    next(error)
  }
})

// Verify token
router.get('/verify', authenticate, async (req, res, next) => {
  try {
    // Get user's sheet assignments
    let allowedSheets = []
    
    if (req.admin.role === 'super_admin') {
      // Super admins see all active sheets
      const sheets = await SheetDefinition.find({ status: 'active' })
      allowedSheets = sheets.map(s => ({
        sheetId: s.sheetId,
        name: s.name,
        category: s.category
      }))
    } else {
      // Get user's assignments
      const assignments = await SheetAssignment.find({
        adminId: req.adminId,
        status: 'active',
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
      
      const sheetIds = assignments.map(a => a.sheetId)
      const sheets = await SheetDefinition.find({
        sheetId: { $in: sheetIds },
        status: 'active'
      })
      
      allowedSheets = sheets.map(sheet => {
        const assignment = assignments.find(a => a.sheetId === sheet.sheetId)
        return {
          sheetId: sheet.sheetId,
          name: sheet.name,
          category: sheet.category,
          permissions: assignment.permissions
        }
      })
    }
    
    res.json({
      valid: true,
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
        permissions: req.admin.permissions
      },
      allowedSheets
    })
  } catch (error) {
    next(error)
  }
})

// Logout
router.post('/logout', authenticate, logAudit, createAuditEntry('logout', 'admin'), (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

// Change password
router.post('/change-password', authenticate, logAudit, createAuditEntry('password_changed', 'admin'), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return next(new AppError('Current and new passwords are required', 400))
    }
    
    const isPasswordValid = await req.admin.comparePassword(currentPassword)
    
    if (!isPasswordValid) {
      return next(new AppError('Current password is incorrect', 401))
    }
    
    req.admin.password = newPassword
    await req.admin.save()
    
    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
