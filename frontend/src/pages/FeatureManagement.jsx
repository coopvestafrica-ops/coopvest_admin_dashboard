import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Toggle2, Settings, Eye, EyeOff, AlertCircle } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'

const FeatureManagement = () => {
  const [features, setFeatures] = useState([
    {
      id: 1,
      name: 'loan_application',
      displayName: 'Loan Application',
      description: 'Allow members to apply for loans',
      category: 'lending',
      platforms: ['web', 'mobile'],
      enabled: true,
      rolloutPercentage: 100,
      status: 'active',
      priority: 'high'
    },
    {
      id: 2,
      name: 'investment_pools',
      displayName: 'Investment Pools',
      description: 'Cooperative investment pool management',
      category: 'investment',
      platforms: ['web', 'admin_dashboard'],
      enabled: true,
      rolloutPercentage: 75,
      status: 'active',
      priority: 'high'
    },
    {
      id: 3,
      name: 'mobile_wallet',
      displayName: 'Mobile Wallet',
      description: 'Mobile wallet functionality',
      category: 'payment',
      platforms: ['mobile'],
      enabled: false,
      rolloutPercentage: 0,
      status: 'testing',
      priority: 'medium'
    },
    {
      id: 4,
      name: 'biometric_auth',
      displayName: 'Biometric Authentication',
      description: 'Fingerprint and face recognition',
      category: 'security',
      platforms: ['mobile'],
      enabled: false,
      rolloutPercentage: 0,
      status: 'development',
      priority: 'medium'
    },
    {
      id: 5,
      name: 'advanced_analytics',
      displayName: 'Advanced Analytics',
      description: 'Advanced reporting and analytics',
      category: 'admin',
      platforms: ['admin_dashboard'],
      enabled: true,
      rolloutPercentage: 50,
      status: 'active',
      priority: 'low'
    }
  ])

  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredFeatures = features.filter(feature => {
    const platformMatch = selectedPlatform === 'all' || feature.platforms.includes(selectedPlatform)
    const categoryMatch = selectedCategory === 'all' || feature.category === selectedCategory
    return platformMatch && categoryMatch
  })

  const toggleFeature = (id) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ))
  }

  const updateRollout = (id, percentage) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, rolloutPercentage: percentage } : f
    ))
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
      medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
      high: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200',
      critical: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
    }
    return colors[priority] || colors.medium
  }

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200',
      development: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
      testing: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
      active: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
      paused: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
      deprecated: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
    }
    return colors[status] || colors.planning
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Feature Management</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Control features across web, mobile, and admin dashboard
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Create Feature
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="form-label">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="input-field"
              >
                <option value="all">All Platforms</option>
                <option value="web">Web App</option>
                <option value="mobile">Mobile App</option>
                <option value="admin_dashboard">Admin Dashboard</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                <option value="all">All Categories</option>
                <option value="payment">Payment</option>
                <option value="lending">Lending</option>
                <option value="investment">Investment</option>
                <option value="savings">Savings</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFeatures.map((feature) => (
            <div key={feature.id} className="card">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-50">
                    {feature.displayName}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {feature.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    feature.enabled
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {feature.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`badge ${getPriorityColor(feature.priority)}`}>
                  {feature.priority.toUpperCase()}
                </span>
                <span className={`badge ${getStatusColor(feature.status)}`}>
                  {feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                </span>
              </div>

              {/* Platforms */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                  PLATFORMS
                </p>
                <div className="flex flex-wrap gap-2">
                  {feature.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 text-xs rounded"
                    >
                      {platform === 'admin_dashboard' ? 'Admin' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rollout Percentage */}
              {feature.enabled && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      ROLLOUT
                    </p>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                      {feature.rolloutPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feature.rolloutPercentage}
                    onChange={(e) => updateRollout(feature.id, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <Settings size={18} />
                  Configure
                </button>
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <Edit size={18} />
                  Edit
                </button>
                <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="card border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Feature Management Tips
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                <li>• Use rollout percentage for gradual feature deployment</li>
                <li>• Monitor feature usage before full rollout</li>
                <li>• Disable features immediately if issues are detected</li>
                <li>• All changes are logged in audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default FeatureManagement
