import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { Banknote, TrendingUp, AlertCircle } from 'lucide-react'

const Loans = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">Loan Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage loan applications, approvals, and repayments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Loans Disbursed</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">₦28.5M</p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Banknote className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Outstanding Loans</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">₦12.3M</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Repayment Rate</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">94.2%</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <TrendingUp className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Loan Applications</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Loan management features coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Loans
