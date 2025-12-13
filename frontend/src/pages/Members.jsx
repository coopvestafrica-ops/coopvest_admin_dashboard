import React, { useState } from 'react'
import { Search, Filter, Eye, Edit, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [members] = useState([
    {
      id: 1,
      name: 'Chioma Okafor',
      email: 'chioma@example.com',
      phone: '+234 801 234 5678',
      status: 'verified',
      kycStatus: 'approved',
      joinDate: '2024-01-15',
      contributions: 450000,
      loans: 200000,
    },
    {
      id: 2,
      name: 'Adebayo Oluwaseun',
      email: 'adebayo@example.com',
      phone: '+234 802 345 6789',
      status: 'verified',
      kycStatus: 'approved',
      joinDate: '2024-02-20',
      contributions: 650000,
      loans: 350000,
    },
    {
      id: 3,
      name: 'Zainab Mohammed',
      email: 'zainab@example.com',
      phone: '+234 803 456 7890',
      status: 'pending',
      kycStatus: 'pending',
      joinDate: '2024-11-10',
      contributions: 0,
      loans: 0,
    },
    {
      id: 4,
      name: 'Emeka Nwosu',
      email: 'emeka@example.com',
      phone: '+234 804 567 8901',
      status: 'verified',
      kycStatus: 'approved',
      joinDate: '2024-03-05',
      contributions: 320000,
      loans: 150000,
    },
    {
      id: 5,
      name: 'Fatima Hassan',
      email: 'fatima@example.com',
      phone: '+234 805 678 9012',
      status: 'suspended',
      kycStatus: 'rejected',
      joinDate: '2024-04-12',
      contributions: 200000,
      loans: 100000,
    },
  ])

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || member.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status) => {
    const badges = {
      verified: { bg: 'bg-accent-100 dark:bg-accent-900', text: 'text-accent-700 dark:text-accent-200', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-200', icon: Clock },
      suspended: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-200', icon: AlertCircle },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <div className={`badge ${badge.bg} ${badge.text}`}>
        <Icon size={14} className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="section-title">Member Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage and monitor all cooperative members</p>
        </div>

        {/* Search and Filter */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <button className="btn-secondary flex items-center gap-2">
                <Filter size={20} />
                <span className="hidden sm:inline">More Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Name</th>
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Email</th>
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Status</th>
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Contributions</th>
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Loans</th>
                <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="table-row">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-50">{member.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{member.phone}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400">{member.email}</td>
                  <td className="py-4 px-4">{getStatusBadge(member.status)}</td>
                  <td className="py-4 px-4 font-medium text-neutral-900 dark:text-neutral-50">
                    ₦{(member.contributions / 1000).toFixed(0)}K
                  </td>
                  <td className="py-4 px-4 font-medium text-neutral-900 dark:text-neutral-50">
                    ₦{(member.loans / 1000).toFixed(0)}K
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card flex items-center justify-between">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing {filteredMembers.length} of {members.length} members
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary">Previous</button>
            <button className="btn-primary">Next</button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Members
