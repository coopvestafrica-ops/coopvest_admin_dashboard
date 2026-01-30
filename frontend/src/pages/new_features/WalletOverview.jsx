import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Button, Tag, Statistic, Select, Input, DatePicker, Space, Modal, Form, Descriptions, Tabs } from 'antd'
import { DollarOutlined, BankOutlined, HistoryOutlined, FilterOutlined, ExportOutlined, SyncOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import '../styles/WalletOverview.css'

const { RangePicker } = DatePicker
const { Search } = Input

const WalletOverview = () => {
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({})
  const [filters, setFilters] = useState({})
  const [walletModalVisible, setWalletModalVisible] = useState(false)
  const [transactionModalVisible, setTransactionModalVisible] = useState(false)

  useEffect(() => {
    fetchWallets()
    fetchSummary()
  }, [filters])

  const fetchWallets = async () => {
    setLoading(true)
    try {
      // Simulated API call
      const mockWallets = [
        { _id: '1', walletId: 'WAL123456', ownerType: 'member', owner: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }, type: 'contribution', balance: 150000, availableBalance: 140000, lockedBalance: 10000, status: 'active', lastTransactionAt: '2024-01-15' },
        { _id: '2', walletId: 'WAL123457', ownerType: 'member', owner: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }, type: 'loan', balance: 500000, availableBalance: 480000, lockedBalance: 20000, status: 'active', lastTransactionAt: '2024-01-14' },
        { _id: '3', walletId: 'WAL123458', ownerType: 'platform', owner: { name: 'Coopvest Platform' }, type: 'investment', balance: 2500000, availableBalance: 2000000, lockedBalance: 500000, status: 'active', lastTransactionAt: '2024-01-15' },
        { _id: '4', walletId: 'WAL123459', ownerType: 'member', owner: { firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' }, type: 'contribution', balance: 75000, availableBalance: 75000, lockedBalance: 0, status: 'frozen', lastTransactionAt: '2024-01-10' }
      ]
      setWallets(mockWallets)
    } catch (error) {
      console.error('Failed to fetch wallets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    const mockSummary = {
      totalBalance: 3125000,
      availableBalance: 2775000,
      lockedBalance: 350000,
      walletCount: 4,
      byType: {
        contribution: { balance: 225000, count: 2 },
        loan: { balance: 500000, count: 1 },
        investment: { balance: 2400000, count: 1 }
      }
    }
    setSummary(mockSummary)
  }

  const fetchTransactions = async (walletId) => {
    setLoading(true)
    try {
      const mockTransactions = [
        { _id: '1', transactionId: 'TXN001', type: 'credit', category: 'contribution', amount: 50000, balanceBefore: 100000, balanceAfter: 150000, status: 'success', createdAt: '2024-01-15 10:30:00', reference: 'REF123' },
        { _id: '2', transactionId: 'TXN002', type: 'debit', category: 'withdrawal', amount: 10000, balanceBefore: 150000, balanceAfter: 140000, status: 'success', createdAt: '2024-01-14 15:45:00', reference: 'REF124' },
        { _id: '3', transactionId: 'TXN003', type: 'credit', category: 'refund', amount: 5000, balanceBefore: 135000, balanceAfter: 140000, status: 'success', createdAt: '2024-01-13 09:20:00', reference: 'REF125' }
      ]
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewWallet = (wallet) => {
    setSelectedWallet(wallet)
    setWalletModalVisible(true)
    fetchTransactions(wallet._id)
  }

  const handleFreezeWallet = async (walletId) => {
    // API call to freeze wallet
    console.log('Freezing wallet:', walletId)
    fetchWallets()
  }

  const handleUnfreezeWallet = async (walletId) => {
    // API call to unfreeze wallet
    console.log('Unfreezing wallet:', walletId)
    fetchWallets()
  }

  const handleReconcile = async (walletId) => {
    // API call to reconcile wallet
    console.log('Reconciling wallet:', walletId)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value)
  }

  const walletColumns = [
    {
      title: 'Wallet ID',
      dataIndex: 'walletId',
      key: 'walletId',
      render: (id) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{id}</span>
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) => record.ownerType === 'member' 
        ? `${record.owner.firstName} ${record.owner.lastName}`
        : record.owner.name
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const colors = { contribution: 'blue', loan: 'green', investment: 'purple', platform: 'orange' }
        return <Tag color={colors[type]}>{type.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) => formatCurrency(record.balance)
    },
    {
      title: 'Available',
      key: 'availableBalance',
      render: (_, record) => formatCurrency(record.availableBalance)
    },
    {
      title: 'Locked',
      key: 'lockedBalance',
      render: (_, record) => formatCurrency(record.lockedBalance)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { active: 'success', frozen: 'warning', suspended: 'error', closed: 'default' }
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Last Transaction',
      dataIndex: 'lastTransactionAt',
      key: 'lastTransactionAt',
      render: (date) => date ? new Date(date).toLocaleString() : 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleViewWallet(record)}>View</Button>
          {record.status === 'active' ? (
            <Button size="small" danger onClick={() => handleFreezeWallet(record._id)}><LockOutlined /></Button>
          ) : (
            <Button size="small" type="primary" onClick={() => handleUnfreezeWallet(record._id)}><UnlockOutlined /></Button>
          )}
        </Space>
      )
    }
  ]

  const transactionColumns = [
    { title: 'Transaction ID', dataIndex: 'transactionId', key: 'transactionId', render: (id) => <span style={{ fontFamily: 'monospace' }}>{id}</span> },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag color={type === 'credit' ? 'green' : 'red'}>{type.toUpperCase()}</Tag>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag>{cat}</Tag>
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amt) => formatCurrency(amt) },
    { title: 'Balance After', dataIndex: 'balanceAfter', key: 'balanceAfter', render: (bal) => formatCurrency(bal) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'success' ? 'success' : 'error'}>{status.toUpperCase()}</Tag>
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date) => new Date(date).toLocaleString() }
  ]

  return (
    <div className="wallet-overview">
      <div className="page-header">
        <h1>Wallet Management</h1>
        <Space>
          <Button icon={<SyncOutlined />} onClick={fetchWallets}>Refresh</Button>
          <Button type="primary" icon={<ExportOutlined />}>Export</Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-section">
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic
              title="Total Balance"
              value={summary.totalBalance}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic
              title="Available Balance"
              value={summary.availableBalance}
              valueStyle={{ color: '#52c41a' }}
              prefix={<BankOutlined />}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic
              title="Locked Balance"
              value={summary.lockedBalance}
              valueStyle={{ color: '#faad14' }}
              prefix={<LockOutlined />}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic
              title="Total Wallets"
              value={summary.walletCount}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="filter-card">
        <Row gutter={16} align="middle">
          <Col>
            <Search placeholder="Search wallet ID or owner" style={{ width: 250 }} />
          </Col>
          <Col>
            <Select placeholder="Wallet Type" style={{ width: 150 }} allowClear>
              <Select.Option value="contribution">Contribution</Select.Option>
              <Select.Option value="loan">Loan</Select.Option>
              <Select.Option value="investment">Investment</Select.Option>
            </Select>
          </Col>
          <Col>
            <Select placeholder="Status" style={{ width: 120 }} allowClear>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="frozen">Frozen</Select.Option>
              <Select.Option value="suspended">Suspended</Select.Option>
            </Select>
          </Col>
          <Col>
            <RangePicker />
          </Col>
          <Col>
            <Button type="primary" icon={<FilterOutlined />}>Apply Filters</Button>
          </Col>
        </Row>
      </Card>

      {/* Wallets Table */}
      <Card title="All Wallets" className="table-card">
        <Table
          columns={walletColumns}
          dataSource={wallets}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Wallet Details Modal */}
      <Modal
        title={`Wallet Details - ${selectedWallet?.walletId}`}
        open={walletModalVisible}
        onCancel={() => setWalletModalVisible(false)}
        width={900}
        footer={[
          <Button key="reconcile" onClick={() => handleReconcile(selectedWallet?._id)}>Run Reconciliation</Button>,
          <Button key="close" onClick={() => setWalletModalVisible(false)}>Close</Button>
        ]}
      >
        {selectedWallet && (
          <Tabs
            items={[
              {
                key: 'details',
                label: 'Wallet Details',
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Wallet ID">{selectedWallet.walletId}</Descriptions.Item>
                    <Descriptions.Item label="Owner Type">{selectedWallet.ownerType}</Descriptions.Item>
                    <Descriptions.Item label="Owner">
                      {selectedWallet.ownerType === 'member' 
                        ? `${selectedWallet.owner.firstName} ${selectedWallet.owner.lastName}`
                        : selectedWallet.owner.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Type">{selectedWallet.type}</Descriptions.Item>
                    <Descriptions.Item label="Balance">{formatCurrency(selectedWallet.balance)}</Descriptions.Item>
                    <Descriptions.Item label="Available">{formatCurrency(selectedWallet.availableBalance)}</Descriptions.Item>
                    <Descriptions.Item label="Locked">{formatCurrency(selectedWallet.lockedBalance)}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedWallet.status === 'active' ? 'success' : 'warning'}>
                        {selectedWallet.status.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Transaction">
                      {selectedWallet.lastTransactionAt 
                        ? new Date(selectedWallet.lastTransactionAt).toLocaleString() 
                        : 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>
                )
              },
              {
                key: 'transactions',
                label: 'Transactions',
                children: (
                  <Table
                    columns={transactionColumns}
                    dataSource={transactions}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                  />
                )
              }
            ]}
          />
        )}
      </Modal>
    </div>
  )
}

export default WalletOverview
