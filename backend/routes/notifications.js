import express from 'express'
import NotificationService from '../services/NotificationService.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get notifications for current admin
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query
    const result = await NotificationService.getNotifications('admin', req.admin._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get unread count
router.get('/unread-count', authenticate, authorize(['read']), async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount('admin', req.admin._id)
    res.json({ unreadCount: count })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get notification by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const notification = await NotificationService.getNotification(req.params.id)
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Mark notification as read
router.post('/:id/read', authenticate, authorize(['read']), async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id)
    res.json({ message: 'Notification marked as read', notification })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Mark all as read
router.post('/mark-all-read', authenticate, authorize(['read']), async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead('admin', req.admin._id)
    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete notification
router.delete('/:id', authenticate, authorize(['write']), async (req, res) => {
  try {
    const result = await NotificationService.deleteNotification(req.params.id)
    if (!result) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    res.json({ message: 'Notification deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Get notification statistics
router.get('/stats/all', authenticate, authorize(['read']), async (req, res) => {
  try {
    const stats = await NotificationService.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Send notification to member
router.post('/send-to-member', authenticate, authorize(['write']), logAudit, createAuditEntry('notification_sent', 'notification'), async (req, res) => {
  try {
    const { memberId, type, title, message, priority, channel } = req.body
    
    if (!memberId || !type || !title || !message) {
      return res.status(400).json({ error: 'Member ID, type, title, and message are required' })
    }
    
    const notification = await NotificationService.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type,
      title,
      message,
      priority: priority || 'medium',
      channel: channel || 'in_app'
    })
    
    req.auditData.resourceId = notification._id
    req.auditData.resourceName = `Notification to member ${memberId}`
    
    res.json({ message: 'Notification sent', notification })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Bulk send notifications
router.post('/send-bulk', authenticate, authorize(['write']), logAudit, createAuditEntry('notifications_bulk_sent', 'notification'), async (req, res) => {
  try {
    const { memberIds, type, title, message, priority, channel } = req.body
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs array is required' })
    }
    
    const notifications = await NotificationService.sendBulkNotifications(memberIds, {
      recipientType: 'member',
      type,
      title,
      message,
      priority: priority || 'medium',
      channel: channel || 'in_app'
    })
    
    req.auditData.resourceName = `Bulk notifications: ${memberIds.length} members`
    
    res.json({ 
      message: `Sent ${notifications.length} notifications`,
      count: notifications.length 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cleanup expired notifications (admin)
router.post('/cleanup', authenticate, authorize(['manage_admins']), async (req, res) => {
  try {
    const result = await NotificationService.cleanupExpired()
    res.json({ message: `Deleted ${result.deletedCount} expired notifications` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
