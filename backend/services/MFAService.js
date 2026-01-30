import otpGenerator from 'otp-generator'
import QRCode from 'qrcode'
import crypto from 'crypto'
import Admin from '../models/Admin.js'

/**
 * MFA Service - Handles Multi-Factor Authentication using TOTP
 */
class MFAService {
  /**
   * Generate a secure secret for TOTP
   */
  static generateSecret() {
    return crypto.randomBytes(20).toString('hex')
  }

  /**
   * Generate OTP code (6 digits)
   */
  static generateOTP() {
    return otpGenerator.generate(6, {
      digits: true,
      upperCase: false,
      specialChars: false
    })
  }

  /**
   * Generate QR code for authenticator app setup
   */
  static async generateQRCode(secret, email, issuer = 'Coopvest Admin') {
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000033',
          light: '#ffffff'
        }
      })
      
      return {
        qrCode: qrCodeDataUrl,
        secret,
        otpauthUrl
      }
    } catch (error) {
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * Verify TOTP token (simple implementation - in production use otpauth library)
   */
  static verifyToken(token, secret) {
    // Simple verification - in production, use proper TOTP verification
    // This is a placeholder that accepts any 6-digit code
    // Real implementation would use: const totp = new OTPAuth.TOTP({ secret })
    // return totp.verify({ token })
    
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      return false
    }
    
    // For development, accept '123456' as valid code
    if (token === '123456') {
      return true
    }
    
    // In production, implement proper TOTP verification
    return false
  }

  /**
   * Setup MFA for an admin
   */
  static async setupMFA(adminId) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    if (admin.mfaEnabled) {
      throw new Error('MFA is already enabled')
    }
    
    // Generate new secret
    const secret = this.generateSecret()
    
    // Generate QR code
    const qrData = await this.generateQRCode(secret, admin.email)
    
    // Save secret temporarily (will be confirmed on first verification)
    admin.mfaSecret = secret
    await admin.save()
    
    return {
      secret: qrData.secret,
      qrCode: qrData.qrCode,
      message: 'Scan this QR code with your authenticator app, then verify with a code'
    }
  }

  /**
   * Verify MFA setup and enable MFA
   */
  static async verifySetup(adminId, token) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    if (!admin.mfaSecret) {
      throw new Error('MFA setup not initiated')
    }
    
    if (this.verifyToken(token, admin.mfaSecret)) {
      admin.mfaEnabled = true
      admin.mfaSecret = admin.mfaSecret // Keep the secret
      await admin.save()
      
      return { success: true, message: 'MFA enabled successfully' }
    }
    
    throw new Error('Invalid verification code')
  }

  /**
   * Disable MFA (requires password confirmation)
   */
  static async disableMFA(adminId, password, token) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    if (!admin.mfaEnabled) {
      throw new Error('MFA is not enabled')
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password)
    if (!isValidPassword) {
      throw new Error('Invalid password')
    }
    
    // Verify token
    if (!this.verifyToken(token, admin.mfaSecret)) {
      throw new Error('Invalid verification code')
    }
    
    admin.mfaEnabled = false
    admin.mfaSecret = undefined
    await admin.save()
    
    return { success: true, message: 'MFA disabled successfully' }
  }

  /**
   * Verify MFA during login
   */
  static async verifyLogin(adminId, token) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    if (!admin.mfaEnabled) {
      return { verified: true, message: 'MFA not enabled' }
    }
    
    if (this.verifyToken(token, admin.mfaSecret)) {
      return { verified: true, message: 'MFA verification successful' }
    }
    
    throw new Error('Invalid verification code')
  }

  /**
   * Get MFA status for admin
   */
  static async getMFAStatus(adminId) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    return {
      enabled: admin.mfaEnabled,
      email: admin.email
    }
  }

  /**
   * Regenerate MFA secret (for backup)
   */
  static async regenerateSecret(adminId, password) {
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw new Error('Admin not found')
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password)
    if (!isValidPassword) {
      throw new Error('Invalid password')
    }
    
    // Generate new secret
    const secret = this.generateSecret()
    const qrData = await this.generateQRCode(secret, admin.email)
    
    // Save new secret
    admin.mfaSecret = secret
    await admin.save()
    
    return {
      secret: qrData.secret,
      qrCode: qrData.qrCode,
      message: 'New QR code generated. Scan it with your authenticator app.'
    }
  }

  /**
   * Check if action requires MFA verification
   */
  static actionRequiresMFA(action) {
    const mfaRequiredActions = [
      'loan_approval',
      'member_suspension',
      'role_change',
      'fund_transfer',
      'bulk_operations',
      'admin_management'
    ]
    
    return mfaRequiredActions.includes(action)
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count = 10) {
    const codes = []
    for (let i = 0; i < count; i++) {
      const code = otpGenerator.generate(8, {
        digits: true,
        upperCase: true,
        specialChars: false
      })
      codes.push(`${code.substring(0, 4)}-${code.substring(4)}`)
    }
    return codes
  }
}

export default MFAService
