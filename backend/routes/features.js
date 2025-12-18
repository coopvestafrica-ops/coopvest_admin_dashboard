import express from 'express'
import Feature from '../models/Feature.js'
import { authenticate, authorize, requireSuperAdmin } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all features
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { category, platform, status, enabled, page = 1, limit = 20 } = req.query
    
    let query = {}
    if (category) query.category = category
    if (platform) query.platforms = platform
    if (status) query.status = status
    if (enabled !== undefined) query.enabled = enabled === 'true'
    
    const skip = (page - 1) * limit
    const features = await Feature.find(query)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ priority: -1, createdAt: -1 })
    
    const total = await Feature.countDocuments(query)
    
    res.json({
      features,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get feature by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    res.json(feature)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get features for specific platform
router.get('/platform/:platform', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { platform } = req.params
    const features = await Feature.find({
      platforms: platform,
      enabled: true
    }).select('name displayName description config')
    
    res.json(features)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create feature (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_created', 'feature'), async (req, res) => {
  try {
    const { name, displayName, description, category, platforms, config } = req.body
    
    if (!name || !displayName || !category || !platforms) {
      return res.status(400).json({ error: 'Name, displayName, category, and platforms are required' })
    }
    
    const feature = new Feature({
      name,
      displayName,
      description,
      category,
      platforms,
      config,
      createdBy: req.admin._id
    })
    
    await feature.save()
    
    req.auditData.resourceId = feature._id
    req.auditData.resourceName = feature.displayName
    
    res.status(201).json({ message: 'Feature created', feature })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Toggle feature (Super Admin only)
router.post('/:id/toggle', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_toggled', 'feature'), async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id)
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    const previousState = feature.enabled
    feature.enabled = !feature.enabled
    feature.metrics.lastToggled = new Date()
    feature.metrics.toggleCount += 1
    feature.lastModifiedBy = req.admin._id
    
    feature.changelog.push({
      timestamp: new Date(),
      action: `Feature ${feature.enabled ? 'enabled' : 'disabled'}`,
      changedBy: req.admin._id,
      changes: { enabled: previousState, newEnabled: feature.enabled }
    })
    
    await feature.save()
    
    req.auditData.resourceId = feature._id
    req.auditData.resourceName = feature.displayName
    req.auditData.changes = { before: { enabled: previousState }, after: { enabled: feature.enabled } }
    
    res.json({ message: `Feature ${feature.enabled ? 'enabled' : 'disabled'}`, feature })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update feature rollout percentage (Super Admin only)
router.patch('/:id/rollout', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_rollout_updated', 'feature'), async (req, res) => {
  try {
    const { rolloutPercentage } = req.body
    const feature = await Feature.findById(req.params.id)
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      return res.status(400).json({ error: 'Rollout percentage must be between 0 and 100' })
    }
    
    const previousPercentage = feature.rolloutPercentage
    feature.rolloutPercentage = rolloutPercentage
    feature.lastModifiedBy = req.admin._id
    
    feature.changelog.push({
      timestamp: new Date(),
      action: `Rollout percentage updated from ${previousPercentage}% to ${rolloutPercentage}%`,
      changedBy: req.admin._id,
      changes: { rolloutPercentage: previousPercentage, newRolloutPercentage: rolloutPercentage }
    })
    
    await feature.save()
    
    req.auditData.resourceId = feature._id
    req.auditData.resourceName = feature.displayName
    
    res.json({ message: 'Rollout percentage updated', feature })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update feature configuration (Super Admin only)
router.patch('/:id/config', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_config_updated', 'feature'), async (req, res) => {
  try {
    const { config } = req.body
    const feature = await Feature.findById(req.params.id)
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    const previousConfig = feature.config
    feature.config = { ...feature.config, ...config }
    feature.lastModifiedBy = req.admin._id
    
    feature.changelog.push({
      timestamp: new Date(),
      action: 'Feature configuration updated',
      changedBy: req.admin._id,
      changes: { previousConfig, newConfig: feature.config }
    })
    
    await feature.save()
    
    req.auditData.resourceId = feature._id
    req.auditData.resourceName = feature.displayName
    
    res.json({ message: 'Feature configuration updated', feature })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update feature status (Super Admin only)
router.patch('/:id/status', authenticate, requireSuperAdmin, logAudit, createAuditEntry('feature_status_updated', 'feature'), async (req, res) => {
  try {
    const { status } = req.body
    const feature = await Feature.findById(req.params.id)
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    const previousStatus = feature.status
    feature.status = status
    feature.lastModifiedBy = req.admin._id
    
    feature.changelog.push({
      timestamp: new Date(),
      action: `Status changed from ${previousStatus} to ${status}`,
      changedBy: req.admin._id,
      changes: { status: previousStatus, newStatus: status }
    })
    
    await feature.save()
    
    req.auditData.resourceId = feature._id
    req.auditData.resourceName = feature.displayName
    
    res.json({ message: 'Feature status updated', feature })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get feature changelog
router.get('/:id/changelog', authenticate, authorize(['read']), async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id)
      .populate('changelog.changedBy', 'name email')
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' })
    }
    
    res.json(feature.changelog)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get feature statistics
router.get('/stats/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await Feature.aggregate([
      {
        $group: {
          _id: null,
          totalFeatures: { $sum: 1 },
          enabledFeatures: {
            $sum: { $cond: ['$enabled', 1, 0] }
          },
          disabledFeatures: {
            $sum: { $cond: ['$enabled', 0, 1] }
          },
          byCategory: {
            $push: {
              category: '$category',
              enabled: '$enabled'
            }
          }
        }
      }
    ])
    
    res.json(stats[0] || {})
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
