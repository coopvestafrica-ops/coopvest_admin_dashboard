import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { FileText, Download, Upload } from 'lucide-react'

const Documents = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Documents & Automation</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Manage automated document generation and repository
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Upload size={20} />
            Upload Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Documents</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">1,247</p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <FileText className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Pending Approval</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">23</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <FileText className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Storage Used</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">2.3 GB</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <Download className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Document Repository</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Document management features coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Documents
