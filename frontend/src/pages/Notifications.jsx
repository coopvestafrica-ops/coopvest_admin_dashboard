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

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Notification Manager</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Notification management features coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Notifications
