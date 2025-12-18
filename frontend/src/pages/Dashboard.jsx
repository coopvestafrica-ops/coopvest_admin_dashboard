import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Wallet, Banknote, AlertCircle, Activity, RefreshCw } from 'lucide-react'
import MainLayout from '../components/Layout/MainLayout'
import { useApi } from '../hooks/useApi'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loanStatus, setLoanStatus] = useState([])
  const [alerts, setAlerts] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  // Fetch dashboard statistics
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApi(
    '/statistics/dashboard',
    { pollInterval: 30000 }
  )

  // Fetch chart data
  const { data: chartDataResponse, loading: chartLoading, refetch: refetchChart } = useApi(
    '/statistics/trends',
    { pollInterval: 60000 }
  )

  // Fetch alerts
  const { data: alertsData, loading: alertsLoading, refetch: refetchAlerts } = useApi(
    '/statistics/alerts',
    { pollInterval: 20000 }
  )

  useEffect(() => {
    if (statsData) {
      setStats(statsData.data || statsData)
    }
  }, [statsData])

  useEffect(() => {
    if (chartDataResponse) {
      const data = chartDataResponse.data || chartDataResponse
      setChartData(Array.isArray(data) ? data : [])
    }
  }, [chartDataResponse])

  useEffect(() => {
    if (alertsData) {
      const data = alertsData.data || alertsData
      setAlerts(Array.isArray(data) ? data : [])
    }
  }, [alertsData])

  useEffect(() => {
    if (stats?.loanStatus) {
      setLoanStatus(stats.loanStatus)
    }
  }, [stats])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchStats(), refetchChart(), refetchAlerts()])
    } finally {
      setRefreshing(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, subtext, trend, onClick }) => (
    <div className="card-hover cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {value || 'Loading...'}
          </p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Welcome back! Here's your real-time system overview.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Members"
            value={stats?.totalMembers?.toLocaleString() || '0'}
            subtext={}
            trend={}
          />
          <StatCard
            icon={Wallet}
            label="Total Contributions"
            value={}
            subtext={}
            trend={}
          />
          <StatCard
            icon={Banknote}
            label="Total Loans"
            value={}
            subtext={}
            trend={}
          />
          <StatCard
            icon={Activity}
            label="Repayment Rate"
            value={}
            subtext="On-time repayments"
            trend={}
          />
        </div>

        {alerts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={}
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
              Monthly Trends
            </h3>
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center text-neutral-500">
                Loading chart data...
              </div>
            ) : chartData.length > 0 ? (
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
            ) : (
              <div className="h-80 flex items-center justify-center text-neutral-500">
                No chart data available
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
              Loan Status
            </h3>
            {loanStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={loanStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {loanStatus.map((entry, index) => (
                      <Cell key={} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-neutral-500">
                No loan status data available
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-6">
            Contributions vs Loans vs Repayments
          </h3>
          {chartLoading ? (
            <div className="h-80 flex items-center justify-center text-neutral-500">
              Loading chart data...
            </div>
          ) : chartData.length > 0 ? (
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
          ) : (
            <div className="h-80 flex items-center justify-center text-neutral-500">
              No chart data available
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Dashboard
