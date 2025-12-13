import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { Wallet, TrendingUp, Download } from 'lucide-react'

const Contributions = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">Contributions & E-Wallet Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Track and manage member contributions and wallet balances
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Contributions</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">₦45.2M</p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Wallet className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Monthly Contributions</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">₦3.85M</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <TrendingUp className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Active Wallets</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">2,156</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Wallet className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Recent Contributions</h2>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              Export
            </button>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">Contribution tracking and wallet management features coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Contributions
