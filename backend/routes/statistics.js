import express from 'express'
import Member from '../models/Member.js'
import Loan from '../models/Loan.js'
import Contribution from '../models/Contribution.js'
import Investment from '../models/Investment.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// Get dashboard statistics
router.get('/dashboard', authenticate, authorize(['read']), async (req, res) => {
  try {
    // Member stats
    const memberStats = await Member.aggregate([
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          activeMembers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pendingMembers: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          suspendedMembers: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
          }
        }
      }
    ])

    // Contribution stats
    const contributionStats = await Contribution.aggregate([
      {
        $group: {
          _id: null,
          totalContributions: { $sum: '$amount' },
          monthlyContributions: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$createdAt',
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ])

    // Loan stats
    const loanStats = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalLoans: { $sum: '$principalAmount' },
          outstandingLoans: { $sum: '$outstandingBalance' },
          totalRepaid: { $sum: '$totalRepaid' },
          disbursedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'disbursed'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          defaultedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'defaulted'] }, 1, 0] }
          }
        }
      }
    ])

    // Investment stats
    const investmentStats = await Investment.aggregate([
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: '$totalAmount' },
          amountRaised: { $sum: '$amountRaised' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ])

    // Calculate repayment rate
    const loanData = loanStats[0] || {}
    const repaymentRate = loanData.totalLoans > 0 
      ? ((loanData.totalRepaid / loanData.totalLoans) * 100).toFixed(2)
      : 0

    res.json({
      members: memberStats[0] || {},
      contributions: contributionStats[0] || {},
      loans: loanData,
      investments: investmentStats[0] || {},
      repaymentRate
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get monthly trends
router.get('/trends/monthly', authenticate, authorize(['read']), async (req, res) => {
  try {
    const months = 6
    const trends = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      const contributions = await Contribution.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])

      const loans = await Loan.aggregate([
        {
          $match: {
            disbursementDate: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$principalAmount' }
          }
        }
      ])

      const repayments = await Loan.aggregate([
        {
          $unwind: '$repayments'
        },
        {
          $match: {
            'repayments.date': { $gte: monthStart, $lte: monthEnd },
            'repayments.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$repayments.amount' }
          }
        }
      ])

      trends.push({
        month: monthLabel,
        contributions: contributions[0]?.total || 0,
        loans: loans[0]?.total || 0,
        repayments: repayments[0]?.total || 0
      })
    }

    res.json(trends)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get loan status distribution
router.get('/loans/status', authenticate, authorize(['read']), async (req, res) => {
  try {
    const statusDistribution = await Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$principalAmount' }
        }
      }
    ])

    const formatted = statusDistribution.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      amount: item.amount
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get default rate statistics
router.get('/loans/default-rate', authenticate, authorize(['read']), async (req, res) => {
  try {
    const loanStats = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          defaultedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'defaulted'] }, 1, 0] }
          },
          totalPrincipal: { $sum: '$principalAmount' },
          defaultedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'defaulted'] }, '$principalAmount', 0]
            }
          }
        }
      }
    ])

    const stats = loanStats[0] || {}
    const defaultRate = stats.totalLoans > 0
      ? ((stats.defaultedCount / stats.totalLoans) * 100).toFixed(2)
      : 0

    const defaultedAmountRate = stats.totalPrincipal > 0
      ? ((stats.defaultedAmount / stats.totalPrincipal) * 100).toFixed(2)
      : 0

    res.json({
      totalLoans: stats.totalLoans || 0,
      defaultedCount: stats.defaultedCount || 0,
      defaultRate: parseFloat(defaultRate),
      defaultedAmount: stats.defaultedAmount || 0,
      defaultedAmountRate: parseFloat(defaultedAmountRate)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get risk exposure statistics
router.get('/risk-exposure', authenticate, authorize(['read']), async (req, res) => {
  try {
    const riskDistribution = await Loan.aggregate([
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member'
        }
      },
      { $unwind: '$member' },
      {
        $group: {
          _id: '$member.riskTier',
          count: { $sum: 1 },
          totalPrincipal: { $sum: '$principalAmount' },
          outstandingBalance: { $sum: '$outstandingBalance' }
        }
      }
    ])

    const totalByRisk = await Loan.aggregate([
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member'
        }
      },
      { $unwind: '$member' },
      {
        $group: {
          _id: null,
          totalPrincipal: { $sum: '$principalAmount' },
          totalOutstanding: { $sum: '$outstandingBalance' }
        }
      }
    ])

    const totals = totalByRisk[0] || { totalPrincipal: 0, totalOutstanding: 0 }

    const formatted = riskDistribution.map(item => ({
      riskTier: item._id || 'unknown',
      loanCount: item.count,
      principalAmount: item.totalPrincipal,
      outstandingBalance: item.outstandingBalance,
      percentage: totals.totalPrincipal > 0
        ? ((item.totalPrincipal / totals.totalPrincipal) * 100).toFixed(2)
        : 0
    }))

    res.json({
      distribution: formatted,
      totals: {
        totalPrincipal: totals.totalPrincipal,
        totalOutstanding: totals.totalOutstanding
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get investment statistics
router.get('/investments', authenticate, authorize(['read']), async (req, res) => {
  try {
    const investmentStats = await Investment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          amountRaised: { $sum: '$amountRaised' },
          totalReturns: { $sum: '$totalReturns' }
        }
      }
    ])

    const summary = await Investment.aggregate([
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: '$totalAmount' },
          totalRaised: { $sum: '$amountRaised' },
          totalReturns: { $sum: '$totalReturns' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ])

    res.json({
      byStatus: investmentStats,
      summary: summary[0] || {}
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get rollover statistics
router.get('/rollovers', authenticate, authorize(['read']), async (req, res) => {
  {
    try {
      const Rollover = (await import('../models/Rollover.js')).default
      
      const rolloverStats = await Rollover.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$principalAmount' }
          }
        }
      ])

      const summary = await Rollover.aggregate([
        {
          $group: {
            _id: null,
            totalRollovers: { $sum: 1 },
            totalAmount: { $sum: '$principalAmount' },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            }
          }
        }
      ])

      res.json({
        byStatus: rolloverStats,
        summary: summary[0] || {}
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Get loan performance by tier
router.get('/loans/by-tier', authenticate, authorize(['read']), async (req, res) => {
  try {
    const tierPerformance = await Loan.aggregate([
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member'
        }
      },
      { $unwind: '$member' },
      {
        $group: {
          _id: '$member.riskTier',
          loanCount: { $sum: 1 },
          totalPrincipal: { $sum: '$principalAmount' },
          totalDisbursed: {
            $sum: {
              $cond: [{ $in: ['$status', ['disbursed', 'repaying', 'completed']] }, '$principalAmount', 0]
            }
          },
          totalRepaid: { $sum: '$totalRepaid' },
          defaultCount: {
            $sum: { $cond: [{ $eq: ['$status', 'defaulted'] }, 1, 0] }
          }
        }
      }
    ])

    const formatted = tierPerformance.map(tier => ({
      tier: tier._id || 'unknown',
      loanCount: tier.loanCount,
      totalPrincipal: tier.totalPrincipal,
      totalDisbursed: tier.totalDisbursed,
      totalRepaid: tier.totalRepaid,
      defaultCount: tier.defaultCount,
      defaultRate: tier.loanCount > 0
        ? ((tier.defaultCount / tier.loanCount) * 100).toFixed(2)
        : 0,
      repaymentRate: tier.totalDisbursed > 0
        ? ((tier.totalRepaid / tier.totalDisbursed) * 100).toFixed(2)
        : 0
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get daily/weekly activity stats
router.get('/activity', authenticate, authorize(['read']), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const dailyActivity = await Loan.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          newLoans: { $sum: 1 },
          disbursedAmount: { $sum: '$principalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ])

    const contributionActivity = await Contribution.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ])

    res.json({
      period: { start: startDate, end: new Date(), days },
      loans: dailyActivity,
      contributions: contributionActivity
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
