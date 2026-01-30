import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts'
import { Card, Row, Col, Statistic, Table, Tag, Button, Select, DatePicker, Badge, Progress, Alert } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, TeamOutlined, BankOutlined, AlertOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import '../styles/ExecutiveDashboard.css'

const { RangePicker } = DatePicker

// Color palette
const COLORS = ['#003366', '#006633', '#CC6600', '#993333', '#666699', '#339966']

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [dashboardData, setDashboardData] = useState({
    kpis: {},
    loanStats: {},
    memberStats: {},
    riskDistribution: [],
    monthlyTrends: [],
    topPerformers: [],
    alerts: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Simulated API call - replace with actual API
      const mockData = {
        kpis: {
          totalMembers: 12450,
          totalLoans: 3840,
          activeLoans: 2450,
          totalDisbursed: 125000000,
          totalCollected: 98000000,
          defaultRate: 3.2,
          collectionRate: 96.8
        },
        loanStats: {
          pending: 125,
          approved: 890,
          disbursed: 2450,
          repaying: 1890,
          completed: 425,
          defaulted: 78
        },
        memberStats: {
          active: 11200,
          pending: 450,
          suspended: 180,
          newThisMonth: 380
        },
        riskDistribution: [
          { name: 'Low Risk', value: 7500, color: '#28a745' },
          { name: 'Medium Risk', value: 3800, color: '#ffc107' },
          { name: 'High Risk', value: 1150, color: '#dc3545' }
        ],
        monthlyTrends: [
          { month: 'Jan', loans: 120, disbursed: 4500000, collected: 3200000 },
          { month: 'Feb', loans: 145, disbursed: 5200000, collected: 3800000 },
          { month: 'Mar', loans: 180, disbursed: 6800000, collected: 5100000 },
          { month: 'Apr', loans: 165, disbursed: 6100000, collected: 4800000 },
          { month: 'May', loans: 210, disbursed: 7800000, collected: 6200000 },
          { month: 'Jun', loans: 195, disbursed: 7200000, collected: 5900000 }
        ],
        topPerformers: [
          { id: 1, name: 'Lagos Branch', loans: 450, collection: 98.5 },
          { id: 2, name: 'Abuja Branch', loans: 380, collection: 97.2 },
          { id: 3, name: 'Port Harcourt', loans: 320, collection: 96.8 },
          { id: 4, name: 'Ibadan Branch', loans: 290, collection: 95.5 },
          { id: 5, name: 'Kano Branch', loans: 250, collection: 94.2 }
        ],
        alerts: [
          { id: 1, type: 'warning', message: '15 loans past due date', time: '2 hours ago' },
          { id: 2, type: 'info', message: 'New KYC verification pending', time: '4 hours ago' },
          { id: 3, type: 'success', message: 'Monthly collection target achieved', time: '1 day ago' }
        ]
      }
      setDashboardData(mockData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const loanStatusColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'gold',
          approved: 'blue',
          disbursed: 'green',
          repaying: 'cyan',
          completed: 'purple',
          defaulted: 'red'
        }
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (val) => <Progress percent={val} size="small" />
    }
  ]

  const loanStatusData = Object.entries(dashboardData.loanStats).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / dashboardData.totalLoans) * 100)
  }))

  return (
    <div className="executive-dashboard">
      <div className="dashboard-header">
        <h1>Executive Dashboard</h1>
        <div className="header-controls">
          <Select
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 150 }}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' }
            ]}
          />
          <Button type="primary" onClick={fetchDashboardData}>Refresh</Button>
        </div>
      </div>

      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <div className="alerts-section">
          {dashboardData.alerts.map(alert => (
            <Alert
              key={alert.id}
              message={alert.message}
              type={alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'info'}
              showIcon
              closable
              className={`alert-${alert.type}`}
            />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="kpi-section">
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card">
            <Statistic
              title="Total Members"
              value={dashboardData.kpis.totalMembers}
              prefix={<TeamOutlined />}
              suffix={<Badge count="+" style={{ backgroundColor: '#52c41a' }} />}
            />
            <div className="kpi-trend positive">
              <ArrowUpOutlined /> 12.5% from last month
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card">
            <Statistic
              title="Active Loans"
              value={dashboardData.kpis.activeLoans}
              prefix={<BankOutlined />}
            />
            <div className="kpi-trend positive">
              <ArrowUpOutlined /> 8.3% from last month
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card">
            <Statistic
              title="Total Disbursed"
              value={dashboardData.kpis.totalDisbursed}
              prefix={<DollarOutlined />}
              precision={0}
            />
            <div className="kpi-trend positive">
              <ArrowUpOutlined /> 15.2% from last month
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card">
            <Statistic
              title="Collection Rate"
              value={dashboardData.kpis.collectionRate}
              suffix="%"
              valueStyle={{ color: dashboardData.kpis.collectionRate >= 95 ? '#52c41a' : '#faad14' }}
            />
            <Progress percent={dashboardData.kpis.collectionRate} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
      </Row>

      {/* Secondary KPIs */}
      <Row gutter={[16, 16]} className="secondary-kpis">
        <Col xs={12} sm={6}>
          <Card className="kpi-card small">
            <Statistic title="Default Rate" value={dashboardData.kpis.defaultRate} suffix="%" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="kpi-card small">
            <Statistic title="Pending Loans" value={dashboardData.loanStats.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="kpi-card small">
            <Statistic title="Defaulted Loans" value={dashboardData.loanStats.defaulted} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="kpi-card small">
            <Statistic title="New Members" value={dashboardData.memberStats.newThisMonth} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="charts-section">
        <Col xs={24} lg={16}>
          <Card title="Monthly Loan Trends" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="disbursed" stackId="1" stroke="#003366" fill="#003366" name="Disbursed" />
                <Area type="monotone" dataKey="collected" stackId="2" stroke="#006633" fill="#006633" name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Risk Distribution" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Bottom Section */}
      <Row gutter={[16, 16]} className="bottom-section">
        <Col xs={24} lg={12}>
          <Card title="Loan Status Overview" className="table-card">
            <Table
              columns={loanStatusColumns}
              dataSource={loanStatusData}
              rowKey="status"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Performing Branches" className="table-card">
            <Table
              columns={[
                { title: 'Rank', key: 'rank', render: (_, __, index) => index + 1 },
                { title: 'Branch', dataIndex: 'name', key: 'name' },
                { title: 'Loans', dataIndex: 'loans', key: 'loans', render: (v) => v.toLocaleString() },
                {
                  title: 'Collection Rate',
                  dataIndex: 'collection',
                  key: 'collection',
                  render: (v) => (
                    <Progress
                      percent={v}
                      size="small"
                      strokeColor={v >= 97 ? '#52c41a' : v >= 95 ? '#faad14' : '#ff4d4f'}
                    />
                  )
                }
              ]}
              dataSource={dashboardData.topPerformers}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Member Status Overview */}
      <Row gutter={[16, 16]} className="member-overview">
        <Col xs={24}>
          <Card title="Member Status Overview" className="status-card">
            <Row gutter={16}>
              <Col span={6}>
                <div className="status-item">
                  <TeamOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div className="status-info">
                    <span className="status-label">Active Members</span>
                    <span className="status-value">{dashboardData.memberStats.active.toLocaleString()}</span>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="status-item">
                  <CheckCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div className="status-info">
                    <span className="status-label">Pending Verification</span>
                    <span className="status-value">{dashboardData.memberStats.pending}</span>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="status-item">
                  <WarningOutlined style={{ fontSize: 24, color: '#faad14' }} />
                  <div className="status-info">
                    <span className="status-label">Suspended Accounts</span>
                    <span className="status-value">{dashboardData.memberStats.suspended}</span>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="status-item">
                  <ArrowUpOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                  <div className="status-info">
                    <span className="status-label">New This Month</span>
                    <span className="status-value">{dashboardData.memberStats.newThisMonth}</span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ExecutiveDashboard
