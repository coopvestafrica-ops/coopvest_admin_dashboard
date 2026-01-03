import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  User,
  DollarSign,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'
import { useApi, useMutation } from '../hooks/useApi'
import toast from 'react-hot-toast'

const RiskScoring = () => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [riskFilter, setRiskFilter] = useState('')

  const { data: membersData, loading: membersLoading, refetch } = useApi('/members')
  const { execute: updateRiskLevel, loading: updateLoading } = useMutation('/members', { method: 'PUT' })

  useEffect(() => {
    if (membersData?.members) {
      setMembers(membersData.members)
    }
  }, [membersData])

  // Calculate risk score for a member
  const calculateRiskScore = (member) => {
    let score = 50 // Base score

    // Contribution history (lower = higher risk)
    const contributionMonths = member.contributionMonths || 0
    if (contributionMonths >= 12) score -= 20
    else if (contributionMonths >= 6) score -= 10
    else if (contributionMonths < 3) score += 15

    // Loan history
    if (member.previousLoans > 0) score -= 5
    if (member.defaultedLoans > 0) score += 25

    // Savings ratio
    const savingsRatio = member.savingsRatio || 0
    if (savingsRatio >= 0.3) score -= 10
    else if (savingsRatio < 0.1) score += 15

    // KYC status
    if (member.kycStatus === 'approved') score -= 5
    else if (member.kycStatus === 'pending') score += 10

    // Age factor
    const age = member.age || 30
    if (age >= 25 && age <= 55) score -= 5
    else if (age < 25) score += 10

    return Math.max(0, Math.min(100, score))
  }

  const getRiskLevel = (score) => {
    if (score < 30) return { level: 'Low', color: 'green', icon: CheckCircle }
    if (score < 50) return { level: 'Medium', color: 'yellow', icon: AlertTriangle }
    if (score < 70) return { level: 'High', color: 'orange', icon: Activity }
    return { level: 'Critical', color: 'red', icon: XCircle }
  }

  // Get mock members with risk data if API returns empty
  const getMockMembers = () => [
    { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@email.com', phone: '08012345678', contributionMonths: 24, previousLoans: 3, defaultedLoans: 0, savingsRatio: 0.35, kycStatus: 'approved', age: 35 },
    { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@email.com', phone: '08012345679', contributionMonths: 6, previousLoans: 1, defaultedLoans: 0, savingsRatio: 0.2, kycStatus: 'approved', age: 28 },
    { _id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike@email.com', phone: '08012345670', contributionMonths: 2, previousLoans: 0, defaultedLoans: 0, savingsRatio: 0.05, kycStatus: 'pending', age: 23 },
    { _id: '4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@email.com', phone: '08012345671', contributionMonths: 18, previousLoans: 2, defaultedLoans: 1, savingsRatio: 0.15, kycStatus: 'approved', age: 42 },
    { _id: '5', firstName: 'Tom', lastName: 'Brown', email: 'tom@email.com', phone: '08012345672', contributionMonths: 36, previousLoans: 5, defaultedLoans: 0, savingsRatio: 0.4, kycStatus: 'approved', age: 45 }
  ]

  const displayMembers = members.length > 0 ? members : getMockMembers()

  // Add risk scores to members
  const membersWithRisk = displayMembers.map(member => ({
    ...member,
    riskScore: calculateRiskScore(member),
    riskLevel: getRiskLevel(calculateRiskScore(member))
  }))

  // Filter by risk level
  const filteredMembers = riskFilter 
    ? membersWithRisk.filter(m => m.riskLevel.level.toLowerCase() === riskFilter)
    : membersWithRisk

  // Calculate stats
  const stats = {
    lowRisk: membersWithRisk.filter(m => m.riskLevel.level === 'Low').length,
    mediumRisk: membersWithRisk.filter(m => m.riskLevel.level === 'Medium').length,
    highRisk: membersWithRisk.filter(m => m.riskLevel.level === 'High').length,
    criticalRisk: membersWithRisk.filter(m => m.riskLevel.level === 'Critical').length,
    avgScore: Math.round(membersWithRisk.reduce((sum, m) => sum + m.riskScore, 0) / membersWithRisk.length)
  }

  const handleViewDetails = (member) => {
    setSelectedMember(member)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Risk Scoring & Assessment
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Evaluate and monitor member risk profiles
            </p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Scores
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card-hover">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Low Risk</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{stats.lowRisk}</p>
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Medium Risk</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{stats.mediumRisk}</p>
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Activity className="text-orange-600 dark:text-orange-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">High Risk</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{stats.highRisk}</p>
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <XCircle className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Critical</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{stats.criticalRisk}</p>
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Score</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{stats.avgScore}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Filter by Risk Level:
          </label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Members Table */}
        <div className="card">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Member Risk Assessment
          </h2>

          {membersLoading ? (
            <div className="text-center py-8 text-neutral-500">Loading members...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Member</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Contributions</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Loan History</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Savings Ratio</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">KYC</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Risk Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr 
                      key={member._id} 
                      className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            member.riskLevel.level === 'Low' ? 'bg-green-100 text-green-600' :
                            member.riskLevel.level === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                            member.riskLevel.level === 'High' ? 'bg-orange-100 text-orange-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-50">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {member.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        {member.contributionMonths || 0} months
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <span className="text-neutral-900 dark:text-neutral-50">{member.previousLoans || 0} loans</span>
                          {(member.defaultedLoans || 0) > 0 && (
                            <span className="text-red-600 ml-1">({member.defaultedLoans} default)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (member.savingsRatio || 0) >= 0.3 ? 'bg-green-500' :
                                (member.savingsRatio || 0) >= 0.1 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, (member.savingsRatio || 0) * 100 * 2)}%` }}
                            />
                          </div>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {((member.savingsRatio || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          member.kycStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          member.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {member.kycStatus || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                            member.riskScore < 30 ? 'bg-green-100 text-green-700' :
                            member.riskScore < 50 ? 'bg-yellow-100 text-yellow-700' :
                            member.riskScore < 70 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {member.riskScore}
                          </div>
                          <span className={`text-xs font-medium ${
                            member.riskLevel.level === 'Low' ? 'text-green-600' :
                            member.riskLevel.level === 'Medium' ? 'text-yellow-600' :
                            member.riskLevel.level === 'High' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {member.riskLevel.level}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewDetails(member)}
                          className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800 rounded text-sm transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                Risk Assessment Details
              </h2>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-neutral-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Member Info */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                  selectedMember.riskScore < 30 ? 'bg-green-100 text-green-700' :
                  selectedMember.riskScore < 50 ? 'bg-yellow-100 text-yellow-700' :
                  selectedMember.riskScore < 70 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedMember.riskScore}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400">{selectedMember.email}</p>
                  <span className={`inline-flex items-center px-2 py-1 mt-1 rounded text-xs font-medium ${
                    selectedMember.riskLevel.level === 'Low' ? 'bg-green-100 text-green-700' :
                    selectedMember.riskLevel.level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    selectedMember.riskLevel.level === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedMember.riskLevel.level} Risk
                  </span>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-3">Risk Factors</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Contribution History</span>
                    <span className={`font-medium ${
                      (selectedMember.contributionMonths || 0) >= 12 ? 'text-green-600' :
                      (selectedMember.contributionMonths || 0) >= 6 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {(selectedMember.contributionMonths || 0) >= 12 ? 'Good (24+ months)' :
                       (selectedMember.contributionMonths || 0) >= 6 ? 'Fair (6-12 months)' :
                       'Poor (<6 months)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Loan Defaults</span>
                    <span className={`font-medium ${
                      (selectedMember.defaultedLoans || 0) === 0 ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {(selectedMember.defaultedLoans || 0) === 0 ? 'No defaults' : `${selectedMember.defaultedLoans} defaults`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Savings Ratio</span>
                    <span className={`font-medium ${
                      (selectedMember.savingsRatio || 0) >= 0.3 ? 'text-green-600' :
                      (selectedMember.savingsRatio || 0) >= 0.1 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {((selectedMember.savingsRatio || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">KYC Status</span>
                    <span className={`font-medium ${
                      selectedMember.kycStatus === 'approved' ? 'text-green-600' :
                      selectedMember.kycStatus === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedMember.kycStatus || 'Not submitted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Recommendations</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  {selectedMember.riskScore >= 50 && (
                    <li>• Require additional guarantors for loan applications</li>
                  )}
                  {selectedMember.riskScore >= 70 && (
                    <li>• Limit loan amount to 50% of maximum eligibility</li>
                  )}
                  {(selectedMember.contributionMonths || 0) < 6 && (
                    <li>• Require minimum 6 months contribution history</li>
                  )}
                  {(selectedMember.savingsRatio || 0) < 0.1 && (
                    <li>• Recommend increasing monthly contributions</li>
                  )}
                  {selectedMember.riskScore < 30 && (
                    <li>• Eligible for premium loan products and higher limits</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedMember(null)}
                className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default RiskScoring
