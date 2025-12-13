import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key')
    const admin = await Admin.findById(decoded.id)
    
    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' })
    }
    
    if (admin.status === 'suspended' || admin.status === 'inactive') {
      return res.status(403).json({ error: 'Account is suspended or inactive' })
    }
    
    req.admin = admin
    req.adminId = admin._id
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next()
    }
    
    // Check if admin has required permissions
    const hasPermission = requiredPermissions.every(permission =>
      req.admin.permissions.includes(permission)
    )
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}

export const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admins can perform this action' })
  }
  
  next()
}

export const checkAccountLock = async (req, res, next) => {
  try {
    const { email } = req.body
    const admin = await Admin.findOne({ email })
    
    if (admin && admin.isLocked()) {
      return res.status(423).json({ 
        error: 'Account is locked due to too many failed login attempts. Please try again later.' 
      })
    }
    
    next()
  } catch (error) {
    next(error)
  }
}
