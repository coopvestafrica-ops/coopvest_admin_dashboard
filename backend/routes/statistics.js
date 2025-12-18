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

export default router
