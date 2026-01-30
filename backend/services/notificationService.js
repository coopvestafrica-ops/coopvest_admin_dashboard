import Notification from '../models/Notification.js'
import Member from '../models/Member.js'
import Admin from '../models/Admin.js'
import mongoose from 'mongoose'

class NotificationService {
  /**
   * Create and send a notification
   */
  static async createNotification({ recipientType, recipientId, type, channel = 'in_app', priority = 'medium', title, message, data = {}, expiresAt = null }) {
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
    
    // Send via configured channels
    if (channel === 'in_app') {
      notification.sent = true
      notification.sentAt = new Date()
      notification.delivered = true
      notification.deliveredAt = new Date()
      await notification.save()
    }
    
    // Queue email/sms (placeholder for actual implementation)
    if (channel === 'email') {
      await this.sendEmailNotification(notification, recipientType, recipientId)
    }
    
    if (channel === 'sms') {
      await this.sendSmsNotification(notification, recipientType, recipientId)
    }
    
    return notification
  }

  /**
   * Send email notification (placeholder)
   */
  static async sendEmailNotification(notification, recipientType, recipientId) {
    try {
      let email
      if (recipientType === 'member') {
        const member = await Member.findById(recipientId)
        email = member?.email
      } else if (recipientType === 'admin') {
        const admin = await Admin.findById(recipientId)
        email = admin?.email
      }
      
      if (email) {
        // Placeholder: Use nodemailer in production
        console.log(`[EMAIL] To: ${email}, Subject: ${notification.title}, Body: ${notification.message}`)
        
        notification.emailStatus = 'sent'
        await notification.save()
      }
    } catch (error) {
      console.error('Email notification failed:', error)
      notification.emailStatus = 'failed'
      await notification.save()
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  static async sendSmsNotification(notification, recipientType, recipientId) {
    try {
      let phone
      if (recipientType === 'member') {
        const member = await Member.findById(recipientId)
        phone = member?.phone
      } else if (recipientType === 'admin') {
        const admin = await Admin.findById(recipientId)
        phone = admin?.phone
      }
      
      if (phone) {
        // Placeholder: Use Twilio or other SMS service in production
        console.log(`[SMS] To: ${phone}, Message: ${notification.message}`)
        
        notification.smsStatus = 'sent'
        await notification.save()
      }
    } catch (error) {
      console.error('SMS notification failed:', error)
      notification.smsStatus = 'failed'
      await notification.save()
    }
  }

  /**
   * Notify loan approval
   */
  static async notifyLoanApproval(memberId, loanData) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'loan_approval',
      priority: 'high',
      title: 'Loan Approved',
      message: `Your loan application for ₦${loanData.amount.toLocaleString()} has been approved.`,
      data: {
        entityType: 'loan',
        entityId: loanData.loanId,
        actionUrl: `/loans/${loanData.loanId}`
      }
    })
  }

  /**
   * Notify loan rejection
   */
  static async notifyLoanRejection(memberId, loanData, reason) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'loan_rejection',
      priority: 'high',
      title: 'Loan Application Update',
      message: `We regret to inform you that your loan application was not approved. Reason: ${reason}`,
      data: {
        entityType: 'loan',
        entityId: loanData.loanId,
        actionUrl: `/loans/${loanData.loanId}`
      }
    })
  }

  /**
   * Notify loan disbursement
   */
  static async notifyLoanDisbursement(memberId, loanData) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'loan_disbursement',
      priority: 'high',
      title: 'Funds Disbursed',
      message: `Your loan of ₦${loanData.amount.toLocaleString()} has been disbursed to your wallet.`,
      data: {
        entityType: 'loan',
        entityId: loanData.loanId,
        actionUrl: `/wallet`
      }
    })
  }

  /**
   * Notify repayment due
   */
  static async notifyRepaymentDue(memberId, loanData, dueDate) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'loan_repayment_due',
      priority: 'medium',
      title: 'Repayment Due Reminder',
      message: `Your loan repayment of ₦${loanData.monthlyPayment.toLocaleString()} is due on ${dueDate}.`,
      data: {
        entityType: 'loan',
        entityId: loanData.loanId,
        actionUrl: `/loans/${loanData.loanId}/repay`
      }
    })
  }

  /**
   * Notify overdue payment
   */
  static async notifyOverduePayment(memberId, loanData, daysOverdue) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'loan_repayment_overdue',
      priority: 'urgent',
      title: 'Overdue Payment Notice',
      message: `Your loan payment is ${daysOverdue} days overdue. Please make payment to avoid penalties.`,
      data: {
        entityType: 'loan',
        entityId: loanData.loanId,
        actionUrl: `/loans/${loanData.loanId}/repay`
      }
    })
  }

  /**
   * Notify account suspension
   */
  static async notifyAccountSuspension(memberId, reason) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'account_suspended',
      priority: 'urgent',
      title: 'Account Suspended',
      message: `Your account has been suspended. Reason: ${reason}. Please contact support for assistance.`,
      data: {
        entityType: 'member',
        actionUrl: '/support'
      }
    })
  }

  /**
   * Notify contribution received
   */
  static async notifyContributionReceived(memberId, contributionData) {
    return this.createNotification({
      recipientType: 'member',
      recipientId: memberId,
      type: 'contribution_received',
      priority: 'low',
      title: 'Contribution Received',
      message: `Your contribution of ₦${contributionData.amount.toLocaleString()} has been received.`,
      data: {
        entityType: 'contribution',
        entityId: contributionData.contributionId,
        actionUrl: `/contributions/${contributionData.contributionId}`
      }
    })
  }

  /**
   * Get notifications for recipient
   */
  static async getNotifications(recipientType, recipientId, options = {}) {
    return Notification.getByRecipient(recipientType, recipientId, options)
  }

  /**
   * Get unread count
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
   * Mark all as read
   */
  static async markAllAsRead(recipientType, recipientId) {
    return Notification.markAllAsRead(recipientType, recipientId)
  }

  /**
   * Send bulk notifications (for system announcements)
   */
  static async sendBulkNotification({ recipientType, type, title, message, excludeIds = [] }) {
    let query = { recipientType }
    if (excludeIds.length > 0) {
      query.recipientId = { $nin: excludeIds }
    }
    
    // Get all recipients (implement pagination for large lists)
    const recipients = await (recipientType === 'member' 
      ? Member.find(query).select('_id')
      : Admin.find(query).select('_id'))
    
    const notifications = []
    for (const recipient of recipients) {
      const notification = await this.createNotification({
        recipientType,
        recipientId: recipient._id,
        type,
        priority: 'medium',
        title,
        message
      })
      notifications.push(notification)
    }
    
    return {
      sent: notifications.length,
      totalRecipients: recipients.length
    }
  }
}

export default NotificationService
