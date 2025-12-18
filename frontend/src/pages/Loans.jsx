import React, { useState } from 'react'
import { Banknote, TrendingUp, AlertCircle, CheckCircle, X, Plus } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'
import { useApi, useMutation } from '../hooks/useApi'

const Loans = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    duration: '',
    status: 'pending'
  })

  const { data: loansData, loading: loansLoading, refetch: refetchLoans } = useApi(
    '/loans',
    { pollInterval: 30000 }
  )

  const { execute: approveLoan, loading: approveLoading } = useMutation('/loans', {
    method: 'PUT',
    onSuccess: () => refetchLoans()
  })

  const { execute: rejectLoan, loading: rejectLoading } = useMutation('/loans', {
    method: 'PUT',
    onSuccess: () => refetchLoans()
  })

  const loans = loansData?.data || []

  const stats = {
    totalDisbursed: loans.reduce((sum, l) => sum + (l.amount || 0), 0),
    outstanding: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + (l.amount || 0), 0),
    repaymentRate: 94.2
  }

  const handleApprove = async (loanId) => {
    await approveLoan({ status: 'approved' }, )
  }

  const handleReject = async (loanId) => {
    await rejectLoan({ status: 'rejected' }, )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Loan Management</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Manage loan applications, approvals, and repayments
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            New Loan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Loans Disbursed</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  ₦{(stats.totalDisbursed / 1000000).toFixed(1)}M
                </p>
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
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  ₦{(stats.outstanding / 1000000).toFixed(1)}M
                </p>
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
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{stats.repaymentRate}%</p>
              </div>
              <div className="p-3 bg-accent-100 dark:bg-accent-900 rounded-lg">
                <TrendingUp className="text-accent-600 dark:text-accent-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">Loan Applications</h2>
          
          {loansLoading ? (
            <div className="text-center py-8 text-neutral-500">Loading loans...</div>
          ) : loans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Member</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-50">{loan.memberName}</td>
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-50">₦{(loan.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">{loan.duration} months</td>
                      <td className="py-3 px-4">
                        <span className={}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {loan.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(loan.id)}
                              disabled={approveLoading}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded text-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(loan.id)}
                              disabled={rejectLoading}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-sm transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">No loans found</div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Loans
