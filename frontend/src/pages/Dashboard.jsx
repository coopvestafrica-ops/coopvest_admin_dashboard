import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Wallet, Banknote, AlertCircle, Activity } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 2847,
    activeMembers: 2156,
    pendingVerification: 691,
    totalContributions: 45230000,
    monthlyContributions: 3850000,
    totalLoans: 28500000,
    outstandingLoans: 12300000,
    repaymentRate: 94.2,
  })

  const [chartData] = useState([
    { month: 'Jan', contributions: 2400, loans: 1200, repayments: 2210 },
    { month: 'Feb', contributions: 3210, loans: 1290, repayments: 2290 },
    { month: 'Mar', contributions: 2290, loans: 1000, repayments: 2000 },
    { month: 'Apr', contributions: 2390, loans: 1108, repayments: 2108 },
    { month: 'May', contributions: 3490, loans: 1280, repayments: 3280 },
    { month: 'Jun', contributions: 3490, loans: 1280, repayments: 3280 },
  ])

  const [loanStatus] = useState([
    { name: 'Approved', value: 45, fill: '#22c55e' },
    { name: 'Pending', value: 30, fill: '#f59e0b' },
    { name: 'Rejected', value: 15, fill: '#ef4444' },
    { name: 'Defaulted', value: 10, fill: '#8b5cf6' },
  ])

  const [alerts] = useState([
    { id: 1, type: 'warning', message: '5 members with overdue loan payments', count: 5 },
    { id: 2, type: 'info', message: 'New member verification requests pending', count: 12 },
    { id: 3, type: 'error', message: 'System backup failed', count: 1 },
  ])

  const StatCard = ({ icon: Icon, label, value, subtext, trend }) => (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
          {subtext && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{subtext}</p>}
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
          <Icon className="text-primary-600 dark:text-primary-400" size={24} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-accent-600 dark:text-accent-400 text-sm">
          <TrendingUp size={16} />
          <span>{trend}</span>
        </div>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Welcome back! Here's your system overview.</p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Members"
            value={stats.totalMembers.toLocaleString()}
            subtext={`${stats.activeMembers} active`}
            trend="+12% this month"
          />
          <StatCard
            icon={Wallet}
            label="Total Contributions"
            value={`₦${(stats.totalContributions / 1000000).toFixed(1)}M`}
            subtext={`₦${(stats.monthlyContributions / 1000000).toFixed(1)}M this month`}
            trend="+8% this month"
          />
          <StatCard
            icon={Banknote}
            label="Total Loans"
            value={`₦${(stats.totalLoans / 1000000).toFixed(1)}M`}
            subtext={`₦${(stats.outstandingLoans / 1000000).toFixed(1)}M outstanding`}
            trend="+5% this month"
          />
          <StatCard
            icon={Activity}
            label="Repayment Rate"
            value={`${stats.repaymentRate}%`}
            subtext="On-time repayments"
            trend="+2% this month"
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card border-l-4 ${
                alert.type === 'error'
                  ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                  : alert.type === 'warning'
                  ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className={
                    alert.type === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : alert.type === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-50">{alert.message}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {alert.count} item{alert.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
              Monthly Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="contributions"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="loans"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="repayments"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="card">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
              Loan Status
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={loanStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {loanStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
            Contributions vs Loans vs Repayments
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="contributions" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              <Bar dataKey="loans" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="repayments" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MainLayout>
  )
}

export default Dashboard
