import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { FileText, Download, Filter } from 'lucide-react'

const AuditLogs = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Audit Logs</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              View all system activities and admin actions
            </p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={20} />
            Export Logs
          </button>
        </div>

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search logs..."
              className="input-field flex-1"
            />
            <select className="input-field md:w-48">
              <option>All Actions</option>
              <option>Admin Created</option>
              <option>Role Changed</option>
              <option>Permission Modified</option>
              <option>Member Approved</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Filter size={20} />
              Filter
            </button>
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-b border-neutral-200 dark:border-neutral-700 pb-4 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg mt-1">
                      <FileText className="text-primary-600 dark:text-primary-400" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-50">Admin Role Assignment</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        Chioma Okafor assigned Finance Admin role to Adebayo Oluwaseun
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap ml-4">
                    2 hours ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default AuditLogs
