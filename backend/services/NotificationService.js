import Notification from '../models/Notification.js'
import Member from '../models/Member.js'
import Admin from '../models/Admin.js'
import mongoose from 'mongoose'

/**
 * Notification Service - handles all notification operations
 */
class NotificationService {
  /**
   * Create and send a notification
   */
  static async createNotification(options) {
    const {
      recipientType,
      recipientId,
      type,
      channel = 'in_app',
      priority = 'medium',
      title,
      message,
      data = {},
      expiresAt = null
    } = options
    
    const notification = new Notification({
      recipientType,
      recipientId,
      type,
      channel,
      priority,
      title,
      message,
      data,
      expiresAt
    })
    
    await notification.save()
    
    // Send via other channels if specified
    if (channel !== 'in_app') {
      await this.sendExternalNotification(notification, channel)
    }
    
    return notification
  }

  /**
   * Send notification via external channel (email, SMS)
   */
  static async sendExternalNotification(notification, channel) {
    // In production, integrate with email/SMS providers
    // For now, just mark as sent
    notification.sent = true
    notification.sentAt = new Date()
    
    if (channel === 'email') {
      notification.emailStatus = 'sent'
    } else if (channel === 'sms') {
      notification.smsStatus = 'sent'
    }
    
    await notification.save()
    
    // TODO: Implement actual email/SMS sending
    console.log(`[Notification] ${channel.toUpperCase()} notification sent to ${notification.recipientType}: ${notification.title}`)
    
    return notification
  }

  /**
   * Get notifications for a recipient
   */
  static async getNotifications(recipientType, recipientId, options = {}) {
    return Notification.getByRecipient(recipientType, recipientId, options)
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(recipientType, recipientId) {
    return Notification.getUnreadCount(recipientType, recipientId)
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId)
    if (!notification) {
      throw new Error('Notification not found')
    }
    
    return notification.markAsRead()
  }

  /**
   * Mark all notifications as read for recipient
   */
  static async markAllAsRead(recipientType, recipientId) {
    return Notification.markAllAsRead(recipientType, recipientId)
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId) {
    return Notification.findByIdAndDelete(notificationId)
  }

  /**
   * Trigger notification based on event
   */
  static async triggerEvent(eventType, data) {
    const notifications = {
      loan_approval: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_approval',
        title: 'Loan Approved',
        message: `Your loan application of ${this.formatCurrency(data.amount)} has been approved.`,
        data: { loanId: data.loanId }
      }),
      
      loan_rejection: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_rejection',
        title: 'Loan Application Rejected',
        message: `Your loan application of ${this.formatCurrency(data.amount)} has been rejected. Reason: ${data.reason || 'Not specified'}`,
        data: { loanId: data.loanId }
      }),
      
      loan_disbursement: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_disbursement',
        title: 'Loan Disbursed',
        message: `Your loan of ${this.formatCurrency(data.amount)} has been disbursed to your wallet.`,
        data: { loanId: data.loanId }
      }),
      
      loan_repayment_due: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_repayment_due',
        title: 'Repayment Due',
        message: `Your loan repayment of ${this.formatCurrency(data.amount)} is due on ${data.dueDate}`,
        data: { loanId: data.loanId, dueDate: data.dueDate }
      }),
      
      loan_repayment_overdue: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_repayment_overdue',
        priority: 'high',
        title: 'Payment Overdue',
        message: `Your loan repayment of ${this.formatCurrency(data.amount)} is overdue. Please make payment to avoid penalties.`,
        data: { loanId: data.loanId, daysOverdue: data.daysOverdue }
      }),
      
      loan_completed: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'loan_completed',
        title: 'Loan Completed',
        message: 'Congratulations! Your loan has been fully repaid.',
        data: { loanId: data.loanId }
      }),
      
      contribution_received: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'contribution_received',
        title: 'Contribution Received',
        message: `Your contribution of ${this.formatCurrency(data.amount)} has been received.`,
        data: { contributionId: data.contributionId }
      }),
      
      contribution_reminder: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'contribution_reminder',
        title: 'Monthly Contribution Reminder',
        message: 'This is a reminder to make your monthly contribution.',
        data: { expectedAmount: data.amount }
      }),
      
      account_suspended: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'account_suspended',
        priority: 'high',
        title: 'Account Suspended',
        message: `Your account has been suspended. Reason: ${data.reason}`,
        data: { suspensionReason: data.reason }
      }),
      
      account_activated: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'account_activated',
        title: 'Account Activated',
        message: 'Your account has been reactivated. You can now access all features.'
      }),
      
      kyc_approved: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'kyc_approved',
        title: 'KYC Verification Approved',
        message: 'Your identity verification has been approved. You can now access all member features.'
      }),
      
      kyc_rejected: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'kyc_rejected',
        priority: 'high',
        title: 'KYC Verification Rejected',
        message: `Your identity verification has been rejected. Reason: ${data.reason || 'Please resubmit your documents'}`,
        data: { rejectionReason: data.reason }
      }),
      
      rollover_request: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'rollover_request',
        title: 'Rollover Request Received',
        message: 'Your loan rollover request has been received and is being processed.'
      }),
      
      rollover_approved: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'rollover_approved',
        title: 'Rollover Approved',
        message: 'Your loan rollover request has been approved.',
        data: { rolloverId: data.rolloverId }
      }),
      
      rollover_rejected: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'rollover_rejected',
        title: 'Rollover Rejected',
        message: `Your loan rollover request has been rejected. Reason: ${data.reason}`,
        data: { rolloverId: data.rolloverId }
      }),
      
      document_ready: () => this.createNotification({
        recipientType: 'member',
        recipientId: data.memberId,
        type: 'document_ready',
        title: 'Document Ready',
        message: `Your ${data.documentType} document is ready for download.`,
        data: { documentId: data.documentId, documentType: data.documentType }
      })
    }
    
    if (notifications[eventType]) {
      return notifications[eventType]()
    }
    
    throw new Error(`Unknown event type: ${eventType}`)
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(recipientIds, notificationData) {
    const notifications = []
    
    for (const recipientId of recipientIds) {
      const notification = await this.createNotification({
        ...notificationData,
        recipientId
      })
      notifications.push(notification)
    }
    
    return notifications
  }

  /**
   * Get notification statistics for admin
   */
  static async getStats() {
    const stats = await Notification.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          unreadByType: [
            { $match: { read: false } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { title: 1, type: 1, priority: 1, read: 1, createdAt: 1 } }
          ]
        }
      }
    ])
    
    return stats[0]
  }

  /**
   * Cleanup expired notifications
   */
  static async cleanupExpired() {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() },
      read: true
    })
    
    return { deletedCount: result.deletedCount }
  }

  /**
   * Format currency helper
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }
}

export default NotificationService
