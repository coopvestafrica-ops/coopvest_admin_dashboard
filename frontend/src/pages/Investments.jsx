import React from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react'

const Investments = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">Investment Pool Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Create and manage cooperative investment projects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Active Pools</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">8</p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <PieChart className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Invested</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">₦15.8M</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <BarChart3 className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Average ROI</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">12.5%</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Investment Pools</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Investment pool management features coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Investments
