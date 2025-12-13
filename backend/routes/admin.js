import express from 'express'
import Admin from '../models/Admin.js'
import { authenticate, authorize, requireSuperAdmin } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all admins (Super Admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
    
    res.json(admins)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get admin by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    res.json(admin)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create admin (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_created', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' })
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email })
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' })
    }
    
    const admin = new Admin({
      name,
      email,
      password,
      role,
      permissions: permissions || [],
      createdBy: req.admin._id,
      status: 'pending_approval'
    })
    
    await admin.save()
    
    // Update audit data
    req.auditData.resourceId = admin._id
    req.auditData.resourceName = admin.name
    req.auditData.changes = { after: { name, email, role, permissions } }
    
    res.status(201).json({
      message: 'Admin created successfully. Awaiting approval.',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve admin (Super Admin only)
router.post('/:id/approve', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_approved', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    admin.status = 'active'
    admin.approvedBy = req.admin._id
    admin.approvedAt = new Date()
    await admin.save()
    
    req.auditData.resourceId = admin._id
    req.auditData.resourceName = admin.name
    
    res.json({ message: 'Admin approved successfully', admin })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update admin (Super Admin only)
router.put('/:id', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_updated', 'admin'), async (req, res) => {
  try {
    const { name, role, permissions, status } = req.body
    const admin = await Admin.findById(req.params.id)
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    const before = { name: admin.name, role: admin.role, permissions: admin.permissions, status: admin.status }
    
    if (name) admin.name = name
    if (role) admin.role = role
    if (permissions) admin.permissions = permissions
    if (status) admin.status = status
    
    await admin.save()
    
    req.auditData.resourceId = admin._id
    req.auditData.resourceName = admin.name
    req.auditData.changes = { before, after: { name: admin.name, role: admin.role, permissions: admin.permissions, status: admin.status } }
    
    res.json({ message: 'Admin updated successfully', admin })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Suspend admin (Super Admin only)
router.post('/:id/suspend', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_suspended', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    admin.status = 'suspended'
    await admin.save()
    
    req.auditData.resourceId = admin._id
    req.auditData.resourceName = admin.name
    
    res.json({ message: 'Admin suspended successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete admin (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_deleted', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id)
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    req.auditData.resourceId = admin._id
    req.auditData.resourceName = admin.name
    
    res.json({ message: 'Admin deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
