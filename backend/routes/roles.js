import express from 'express'
import Role from '../models/Role.js'
import Admin from '../models/Admin.js'
import { authenticate, authorize, requireSuperAdmin } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all roles
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ name: 1 })
    
    res.json(roles)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get role by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('features.featureId')
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    res.json(role)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get role by name
router.get('/name/:name', authenticate, authorize(['read']), async (req, res) => {
  try {
    const role = await Role.findOne({ name: req.params.name })
      .populate('features.featureId')
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    res.json(role)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create role (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, logAudit, createAuditEntry('role_created', 'role'), async (req, res) => {
  try {
    const { name, displayName, description, permissions, scope } = req.body
    
    if (!name || !displayName) {
      return res.status(400).json({ error: 'Name and displayName are required' })
    }
    
    const existingRole = await Role.findOne({ name })
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' })
    }
    
    const role = new Role({
      name,
      displayName,
      description,
      permissions: permissions || [],
      scope: scope || 'global',
      createdBy: req.admin._id
    })
    
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    
    res.status(201).json({ message: 'Role created', role })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update role permissions (Super Admin only)
router.patch('/:id/permissions', authenticate, requireSuperAdmin, logAudit, createAuditEntry('role_permissions_updated', 'role'), async (req, res) => {
  try {
    const { permissions } = req.body
    const role = await Role.findById(req.params.id)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    const previousPermissions = role.permissions
    role.permissions = permissions
    role.lastModifiedBy = req.admin._id
    
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    req.auditData.changes = { before: { permissions: previousPermissions }, after: { permissions } }
    
    res.json({ message: 'Role permissions updated', role })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Assign feature access to role (Super Admin only)
router.post('/:id/features/:featureId', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_assigned_to_role', 'role'), async (req, res) => {
  try {
    const { canEnable, canDisable, canConfigure } = req.body
    const role = await Role.findById(req.params.id)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    // Check if feature already assigned
    const existingFeature = role.features.find(f => f.featureId.toString() === req.params.featureId)
    if (existingFeature) {
      return res.status(400).json({ error: 'Feature already assigned to this role' })
    }
    
    role.features.push({
      featureId: req.params.featureId,
      canEnable: canEnable || false,
      canDisable: canDisable || false,
      canConfigure: canConfigure || false
    })
    
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    
    res.json({ message: 'Feature assigned to role', role })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Remove feature access from role (Super Admin only)
router.delete('/:id/features/:featureId', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_removed_from_role', 'role'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    role.features = role.features.filter(f => f.featureId.toString() !== req.params.featureId)
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    
    res.json({ message: 'Feature removed from role', role })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Assign admin to role (Super Admin only)
router.post('/:id/assign-admin/:adminId', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_assigned_to_role', 'role'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    const admin = await Admin.findById(req.params.adminId)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    // Check max admins allowed
    if (role.maxAdminsAllowed !== -1 && role.currentAdminCount >= role.maxAdminsAllowed) {
      return res.status(400).json({ error: `Maximum admins (${role.maxAdminsAllowed}) already assigned to this role` })
    }
    
    // Update admin role
    const previousRole = admin.role
    admin.role = role.name
    admin.permissions = role.permissions
    await admin.save()
    
    // Update role admin count
    role.currentAdminCount += 1
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    req.auditData.changes = { admin: admin.name, previousRole, newRole: role.name }
    
    res.json({ message: 'Admin assigned to role', role, admin })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Remove admin from role (Super Admin only)
router.post('/:id/remove-admin/:adminId', authenticate, requireSuperAdmin, logAudit, createAuditEntry('admin_removed_from_role', 'role'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    const admin = await Admin.findById(req.params.adminId)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    if (admin.role !== role.name) {
      return res.status(400).json({ error: 'Admin is not assigned to this role' })
    }
    
    // Update admin role
    admin.role = null
    admin.permissions = []
    await admin.save()
    
    // Update role admin count
    role.currentAdminCount = Math.max(0, role.currentAdminCount - 1)
    await role.save()
    
    req.auditData.resourceId = role._id
    req.auditData.resourceName = role.displayName
    
    res.json({ message: 'Admin removed from role', role, admin })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get admins with specific role
router.get('/:id/admins', authenticate, authorize(['read']), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }
    
    const admins = await Admin.find({ role: role.name })
      .select('-password')
    
    res.json({ role, admins })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
