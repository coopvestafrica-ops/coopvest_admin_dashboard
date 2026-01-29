import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { Bell, Mail, MessageSquare } from 'lucide-react'

const Notifications = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">Notifications & Communication</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage notifications and member communications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Unread Notifications</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">12</p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Bell className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Pending Messages</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">5</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Mail className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Broadcast Sent</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">34</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <MessageSquare className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Real-time Notification Feed</h2>
            <div className="space-y-4">
              <div className="p-3 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 rounded">
                <p className="font-semibold text-sm">High-Risk Member Flagged</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Member #CV-2049 showing unusual withdrawal patterns.</p>
                <p className="text-[10px] text-neutral-400 mt-1">2 minutes ago</p>
              </div>
              <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 rounded">
                <p className="font-semibold text-sm">Large Transaction Detected</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">₦5,000,000 deposit pending approval.</p>
                <p className="text-[10px] text-neutral-400 mt-1">15 minutes ago</p>
              </div>
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10 rounded">
                <p className="font-semibold text-sm">System Update</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Weekly interest accrual completed successfully.</p>
                <p className="text-[10px] text-neutral-400 mt-1">1 hour ago</p>
              </div>
            </div>
            <button className="w-full mt-4 text-primary-600 text-sm hover:underline">View All Activity</button>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Email Communication</h2>
            <form className="space-y-4">
              <div className="form-group">
                <label className="form-label text-sm">Target Audience</label>
                <select className="input-field text-sm">
                  <option>All Active Members</option>
                  <option>Members with Active Loans</option>
                  <option>Super Admins Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-sm">Subject</label>
                <input type="text" className="input-field text-sm" placeholder="Notification Subject" />
              </div>
              <div className="form-group">
                <label className="form-label text-sm">Message Template</label>
                <textarea className="input-field text-sm h-32" placeholder="Write your message here..."></textarea>
              </div>
              <button type="button" className="btn-primary w-full text-sm">Send Broadcast Email</button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Notifications
