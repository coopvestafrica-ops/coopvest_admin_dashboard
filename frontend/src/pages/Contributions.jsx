import React, { useState } from 'react'
import { Wallet, TrendingUp, Plus } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'
import { useApi } from '../hooks/useApi'

const Contributions = () => {
  const { data: contributionsData, loading: contributionsLoading, refetch: refetchContributions } = useApi(
    '/contributions',
    { pollInterval: 30000 }
  )

  const contributions = contributionsData?.data || []

  const stats = {
    total: contributions.reduce((sum, c) => sum + (c.amount || 0), 0),
    monthly: contributions.filter(c => {
      const date = new Date(c.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).reduce((sum, c) => sum + (c.amount || 0), 0),
    count: contributions.length
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">Contributions Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Track and manage member contributions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Contributions</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  ₦{(stats.total / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Wallet className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">This Month</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  ₦{(stats.monthly / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <TrendingUp className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{stats.count}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Wallet className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Recent Contributions</h2>
          
          {contributionsLoading ? (
            <div className="text-center py-8 text-neutral-500">Loading contributions...</div>
          ) : contributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Member</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contribution) => (
                    <tr key={contribution.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-50">{contribution.memberName}</td>
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-50">₦{(contribution.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        {new Date(contribution.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">No contributions found</div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Contributions
