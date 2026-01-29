import React, { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Search, Filter, Edit, Trash2, CheckCircle, AlertCircle, Clock, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'
import { useApi, useMutation } from '../hooks/useApi'

const memberSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  status: z.enum(['active', 'pending', 'suspended', 'inactive']).default('pending')
})

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'pending'
    }
  })

  // Memoize params to prevent unnecessary refetches
  const params = useMemo(() => ({
    search: searchTerm,
    status: filterStatus === 'all' ? undefined : filterStatus,
    page,
    limit: 10
  }), [searchTerm, filterStatus, page])

  // Fetch members with server-side params
  const { data: membersData, loading: membersLoading, refetch: refetchMembers } = useApi(
    '/members',
    { params }
  )

  // Mutations
  const { execute: createMember, loading: createLoading } = useMutation('/members', {
    method: 'POST',
    onSuccess: () => {
      setShowModal(false)
      refetchMembers()
    }
  })

  const { execute: updateMember, loading: updateLoading } = useMutation('/members', {
    method: 'PUT',
    onSuccess: () => {
      setShowModal(false)
      setEditingMember(null)
      refetchMembers()
    }
  })

  const { execute: deleteMember, loading: deleteLoading } = useMutation('/members', {
    method: 'DELETE',
    onSuccess: () => {
      refetchMembers()
    }
  })

  const members = membersData?.members || []
  const pagination = membersData?.pagination || { total: 0, pages: 0 }

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-200', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-200', icon: Clock },
      suspended: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-200', icon: AlertCircle },
      inactive: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-700 dark:text-gray-200', icon: X },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 ${badge.bg} ${badge.text} rounded text-xs font-medium`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    )
  }

  const handleOpenModal = (member = null) => {
    if (member) {
      setEditingMember(member)
      reset({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        status: member.status
      })
    } else {
      setEditingMember(null)
      reset({ firstName: '', lastName: '', email: '', phone: '', status: 'pending' })
    }
    setShowModal(true)
  }

  const onFormSubmit = async (data) => {
    if (editingMember) {
      await updateMember(data, `/members/${editingMember._id}`)
    } else {
      await createMember(data)
    }
  }

  const handleDelete = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      await deleteMember(null, `/members/${memberId}`)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Member Management</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Manage and monitor all cooperative members</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Member
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-neutral-600 dark:text-neutral-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {membersLoading ? (
            <div className="text-center py-12 text-neutral-500">Loading members...</div>
          ) : members.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member._id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <td className="py-3 px-4 text-neutral-900 dark:text-neutral-50">{member.firstName} {member.lastName}</td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">{member.email}</td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">{member.phone}</td>
                        <td className="py-3 px-4">{getStatusBadge(member.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(member)}
                              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} className="text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(member._id)}
                              disabled={deleteLoading}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Showing <span className="font-medium">{members.length}</span> of <span className="font-medium">{pagination.total}</span> members
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-neutral-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium">Page {page} of {pagination.pages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="p-2 border border-neutral-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-neutral-500">No members found</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">First Name</label>
                  <input
                    {...register('firstName')}
                    className={`w-full px-4 py-2 border ${errors.firstName ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Last Name</label>
                  <input
                    {...register('lastName')}
                    className={`w-full px-4 py-2 border ${errors.lastName ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email Address</label>
                <input
                  {...register('email')}
                  className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone Number</label>
                <input
                  {...register('phone')}
                  className={`w-full px-4 py-2 border ${errors.phone ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || updateLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {createLoading || updateLoading ? 'Saving...' : editingMember ? 'Update' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Members
