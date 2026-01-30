import RiskScore from '../models/RiskScore.js'
import Member from '../models/Member.js'
import Loan from '../models/Loan.js'
import Contribution from '../models/Contribution.js'
import FraudCase from '../models/FraudCase.js'
import mongoose from 'mongoose'

class RiskScoringService {
  /**
   * Calculate comprehensive risk score for a member
   */
  static async calculateRiskScore(memberId) {
    const member = await Member.findById(memberId)
    if (!member) {
      throw new Error('Member not found')
    }

    // Get all relevant data
    const [
      loanHistory,
      contributionHistory,
      fraudCases
    ] = await Promise.all([
      Loan.find({ memberId }),
      Contribution.find({ memberId, status: 'completed' }),
      FraudCase.find({ 
        'involvedMembers.member': memberId,
        status: { $ne: 'dismissed' }
      })
    ])

    // Calculate component scores
    const repaymentBehavior = this.calculateRepaymentBehavior(loanHistory)
    const contributionConsistency = this.calculateContributionConsistency(contributionHistory)
    const loanHistoryScore = this.calculateLoanHistoryScore(loanHistory)
    const fraudFlags = this.calculateFraudFlags(fraudCases)
    const accountStanding = this.calculateAccountStanding(member)

    // Calculate weighted overall score
    const overallScore = Math.round(
      (repaymentBehavior.score * repaymentBehavior.weight) +
      (contributionConsistency.score * contributionConsistency.weight) +
      (loanHistoryScore.score * loanHistoryScore.weight) +
      (fraudFlags.score * fraudFlags.weight) +
      (accountStanding.score * accountStanding.weight)
    )

    // Generate risk indicators
    const riskIndicators = this.generateRiskIndicators({
      repaymentBehavior,
      contributionConsistency,
      loanHistory,
      fraudCases,
      member
    })

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      score: overallScore,
      tier: this.getTierFromScore(overallScore),
      riskIndicators,
      loanHistory,
      contributionHistory
    })

    // Get previous score
    const previousScoreDoc = await RiskScore.findOne({ memberId }).sort({ calculatedAt: -1 })
    const previousScore = previousScoreDoc?.score

    // Create or update risk score record
    const riskScore = new RiskScore({
      memberId,
      score: overallScore,
      components: {
        repaymentBehavior: {
          score: repaymentBehavior.score,
          weight: repaymentBehavior.weight,
          details: repaymentBehavior.details
        },
        contributionConsistency: {
          score: contributionConsistency.score,
          weight: contributionConsistency.weight,
          details: contributionConsistency.details
        },
        loanHistory: {
          score: loanHistoryScore.score,
          weight: loanHistoryScore.weight,
          details: loanHistoryScore.details
        },
        fraudFlags: {
          score: fraudFlags.score,
          weight: fraudFlags.weight,
          details: fraudFlags.details
        },
        accountStanding: {
          score: accountStanding.score,
          weight: accountStanding.weight,
          details: accountStanding.details
        }
      },
      riskIndicators,
      recommendations,
      previousScore,
      scoreChange: previousScore ? overallScore - previousScore : 0,
      calculatedAt: new Date(),
      nextCalculationAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      calculatedBy: 'system'
    })

    await riskScore.save()

    // Update member's risk score
    member.riskScore = overallScore
    if (this.getTierFromScore(overallScore) === 'high') {
      if (!member.flags.includes('high_risk')) {
        member.flags.push('high_risk')
      }
    } else {
      member.flags = member.flags.filter(f => f !== 'high_risk')
    }
    await member.save()

    return riskScore
  }

  /**
   * Calculate repayment behavior score (0-100)
   */
  static calculateRepaymentBehavior(loanHistory) {
    const details = {
      onTimePayments: 0,
      latePayments: 0,
      missedPayments: 0,
      averageDaysLate: 0,
      repaymentRate: 0
    }

    if (loanHistory.length === 0) {
      return {
        score: 70, // Neutral score for no loan history
        weight: 0.30,
        details
      }
    }

    let totalRepaid = 0
    let totalPrincipal = 0
    let lateCount = 0
    let lateDaysTotal = 0
    let completedCount = 0

    for (const loan of loanHistory) {
      totalPrincipal += loan.principalAmount
      totalRepaid += loan.totalRepaid

      if (loan.status === 'completed') {
        completedCount++
      }

      if (loan.repayments) {
        for (const repayment of loan.repayments) {
          if (repayment.status === 'completed') {
            details.onTimePayments++
          } else if (repayment.status === 'overdue') {
            details.missedPayments++
            lateCount++
          }
        }
      }
    }

    // Calculate repayment rate
    details.repaymentRate = totalPrincipal > 0 ? (totalRepaid / totalPrincipal) * 100 : 100

    // Base score on repayment rate
    let score = Math.min(details.repaymentRate, 100)

    // Adjust for late/missed payments
    const totalPayments = details.onTimePayments + details.latePayments + details.missedPayments
    if (totalPayments > 0) {
      const lateRatio = (details.latePayments + details.missedPayments) / totalPayments
      score -= lateRatio * 30 // Reduce up to 30 points for poor payment history
    }

    // Adjust for defaulted loans
    const defaultedCount = loanHistory.filter(l => l.status === 'defaulted').length
    if (defaultedCount > 0) {
      score -= defaultedCount * 15
    }

    details.latePayments = lateCount
    details.averageDaysLate = lateCount > 0 ? Math.round(lateDaysTotal / lateCount) : 0

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: 0.30,
      details
    }
  }

  /**
   * Calculate contribution consistency score (0-100)
   */
  static calculateContributionConsistency(contributionHistory) {
    const details = {
      monthsActive: 0,
      totalContributions: 0,
      averageMonthlyContribution: 0,
      contributionFrequency: 'regular',
      lastContributionDate: null
    }

    if (contributionHistory.length === 0) {
      return {
        score: 50,
        weight: 0.25,
        details
      }
    }

    // Sort by date
    const sorted = [...contributionHistory].sort((a, b) => b.contributionDate - a.contributionDate)
    
    details.totalContributions = sorted.reduce((sum, c) => sum + c.amount, 0)
    details.lastContributionDate = sorted[0]?.contributionDate

    // Calculate months active
    if (sorted.length > 1) {
      const firstDate = sorted[sorted.length - 1].contributionDate
      const lastDate = sorted[0].contributionDate
      const monthsActive = Math.max(1, Math.ceil((lastDate - firstDate) / (30 * 24 * 60 * 60 * 1000)))
      details.monthsActive = monthsActive
      details.averageMonthlyContribution = details.totalContributions / monthsActive
    } else {
      details.averageMonthlyContribution = sorted[0]?.amount || 0
      details.monthsActive = 1
    }

    // Calculate contribution frequency
    const contributionsByMonth = {}
    for (const contribution of sorted) {
      const monthKey = new Date(contribution.contributionDate).toISOString().slice(0, 7)
      contributionsByMonth[monthKey] = (contributionsByMonth[monthKey] || 0) + 1
    }

    const monthsWithContributions = Object.keys(contributionsByMonth).length
    const avgContributionsPerMonth = sorted.length / Math.max(1, monthsWithContributions)

    if (avgContributionsPerMonth >= 1) {
      details.contributionFrequency = 'regular'
    } else if (avgContributionsPerMonth >= 0.5) {
      details.contributionFrequency = 'irregular'
    } else {
      details.contributionFrequency = 'poor'
    }

    // Calculate score
    let score = 50 // Base score

    // Adjust for consistency
    if (details.contributionFrequency === 'regular') score += 25
    else if (details.contributionFrequency === 'irregular') score += 10
    else score -= 10

    // Adjust for average contribution (higher = better)
    if (details.averageMonthlyContribution > 50000) score += 15
    else if (details.averageMonthlyContribution > 20000) score += 10
    else if (details.averageMonthlyContribution < 5000) score -= 10

    // Adjust for recent activity
    const daysSinceLast = sorted[0] 
      ? Math.floor((Date.now() - new Date(sorted[0].contributionDate)) / (24 * 60 * 60 * 1000))
      : 999
    if (daysSinceLast < 30) score += 10
    else if (daysSinceLast > 90) score -= 15
    else if (daysSinceLast > 180) score -= 25

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: 0.25,
      details
    }
  }

  /**
   * Calculate loan history score (0-100)
   */
  static calculateLoanHistoryScore(loanHistory) {
    const details = {
      totalLoans: loanHistory.length,
      completedLoans: 0,
      defaultedLoans: 0,
      currentOutstanding: 0,
      loanUtilizationRate: 0
    }

    if (loanHistory.length === 0) {
      return {
        score: 75, // No loan history is positive
        weight: 0.20,
        details
      }
    }

    let totalLoans = 0
    let completedLoans = 0
    let defaultedLoans = 0

    for (const loan of loanHistory) {
      totalLoans += loan.principalAmount
      if (loan.status === 'completed') completedLoans++
      if (loan.status === 'defaulted') defaultedLoans++
    }

    details.completedLoans = completedLoans
    details.defaultedLoans = defaultedLoans
    details.currentOutstanding = loanHistory
      .filter(l => ['disbursed', 'repaying'].includes(l.status))
      .reduce((sum, l) => sum + l.outstandingBalance, 0)

    // Calculate loan utilization
    const activeLoans = loanHistory.filter(l => ['disbursed', 'repaying'].includes(l.status))
    details.loanUtilizationRate = totalLoans > 0 
      ? (activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0) / totalLoans) * 100
      : 0

    // Calculate score
    let score = 60 // Base score

    // Completion rate
    if (loanHistory.length > 0) {
      const completionRate = (completedLoans / loanHistory.length) * 100
      score += (completionRate - 50) * 0.6 // Adjust based on completion rate
    }

    // Penalty for defaults
    score -= defaultedLoans * 20

    // Adjust for utilization
    if (details.loanUtilizationRate < 50) score += 10
    else if (details.loanUtilizationRate > 80) score -= 10

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: 0.20,
      details
    }
  }

  /**
   * Calculate fraud flags score (0-100)
   */
  static calculateFraudFlags(fraudCases) {
    const details = {
      fraudCases: 0,
      referralAbuse: 0,
      suspiciousActivity: 0,
      complianceIssues: 0
    }

    if (fraudCases.length === 0) {
      return {
        score: 100, // No fraud history is positive
        weight: 0.15,
        details
      }
    }

    for (const caseItem of fraudCases) {
      if (caseItem.type === 'fraud') details.fraudCases++
      else if (caseItem.type.includes('referral')) details.referralAbuse++
      
      if (caseItem.severity === 'critical' || caseItem.severity === 'high') {
        details.suspiciousActivity++
      }
    }

    // Calculate score - start high and reduce based on flags
    let score = 100

    score -= details.fraudCases * 50
    score -= details.referralAbuse * 25
    score -= details.suspiciousActivity * 20
    score -= details.complianceIssues * 30

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: 0.15,
      details
    }
  }

  /**
   * Calculate account standing score (0-100)
   */
  static calculateAccountStanding(member) {
    const details = {
      kycStatus: member.kycStatus,
      accountAge: 0,
      status: member.status,
      suspensionCount: member.flags.filter(f => f === 'compliance_issue').length
    }

    // Calculate account age in months
    const createdAt = new Date(member.createdAt)
    const now = new Date()
    details.accountAge = Math.max(0, Math.floor((now - createdAt) / (30 * 24 * 60 * 60 * 1000)))

    let score = 50 // Base score

    // Adjust for KYC status
    if (member.kycStatus === 'approved') score += 30
    else if (member.kycStatus === 'pending') score += 10
    else if (member.kycStatus === 'rejected') score -= 30

    // Adjust for account status
    if (member.status === 'active') score += 15
    else if (member.status === 'suspended') score -= 40
    else if (member.status === 'inactive') score -= 20

    // Adjust for account age
    if (details.accountAge >= 12) score += 10
    else if (details.accountAge >= 6) score += 5
    else if (details.accountAge < 3) score -= 10

    // Adjust for flags
    score -= details.suspensionCount * 15

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: 0.10,
      details
    }
  }

  /**
   * Generate risk indicators
   */
  static generateRiskIndicators(data) {
    const indicators = []

    // Late payment indicator
    if (data.repaymentBehavior.details.latePayments > 2) {
      indicators.push({
        type: 'late_payment',
        severity: data.repaymentBehavior.details.latePayments > 5 ? 'high' : 'medium',
        description: 'Member has multiple late payments',
        detectedAt: new Date()
      })
    }

    // Missed payment indicator
    if (data.repaymentBehavior.details.missedPayments > 0) {
      indicators.push({
        type: 'missed_payment',
        severity: data.repaymentBehavior.details.missedPayments > 3 ? 'high' : 'medium',
        description: 'Member has missed loan payments',
        detectedAt: new Date()
      })
    }

    // High debt ratio indicator
    if (data.loanHistory?.length > 0) {
      const totalLoans = data.loanHistory.reduce((sum, l) => sum + l.principalAmount, 0)
      const outstanding = data.loanHistory
        .filter(l => ['disbursed', 'repaying'].includes(l.status))
        .reduce((sum, l) => sum + l.outstandingBalance, 0)
      
      if (outstanding > totalLoans * 0.7) {
        indicators.push({
          type: 'high_debt_ratio',
          severity: outstanding > totalLoans * 0.9 ? 'high' : 'medium',
          description: 'High debt-to-loan ratio',
          detectedAt: new Date()
        })
      }
    }

    // Irregular contribution indicator
    if (data.contributionConsistency.details.contributionFrequency === 'poor') {
      indicators.push({
        type: 'irregular_activity',
        severity: 'medium',
        description: 'Irregular contribution patterns',
        detectedAt: new Date()
      })
    }

    // Fraud indicator
    if (data.fraudCases?.length > 0) {
      const severity = data.fraudCases.some(c => c.severity === 'critical') ? 'high' : 'medium'
      indicators.push({
        type: 'fraud_suspicion',
        severity,
        description: 'Fraud cases associated with member',
        detectedAt: new Date()
      })
    }

    // KYC indicator
    if (data.member.kycStatus !== 'approved') {
      indicators.push({
        type: 'kyc_issue',
        severity: data.member.kycStatus === 'rejected' ? 'high' : 'medium',
        description: 'KYC verification incomplete or rejected',
        detectedAt: new Date()
      })
    }

    return indicators
  }

  /**
   * Generate recommendations based on risk analysis
   */
  static generateRecommendations(data) {
    const recommendations = []
    const { score, tier, riskIndicators, loanHistory, contributionHistory } = data

    // Loan recommendations
    if (tier === 'high' || riskIndicators.some(i => i.type === 'high_debt_ratio')) {
      recommendations.push({
        action: 'Consider reducing loan eligibility',
        reason: 'Member has elevated risk indicators',
        priority: 'high'
      })
    }

    if (tier === 'low' && loanHistory.length > 2) {
      recommendations.push({
        action: 'Consider increasing loan limit',
        reason: 'Member has excellent repayment history',
        priority: 'low'
      })
    }

    // Contribution recommendations
    if (contributionHistory.length === 0) {
      recommendations.push({
        action: 'Encourage regular contributions',
        reason: 'No contribution history on record',
        priority: 'medium'
      })
    }

    // Monitoring recommendations
    if (riskIndicators.length > 2) {
      recommendations.push({
        action: 'Increase monitoring frequency',
        reason: 'Multiple risk indicators detected',
        priority: 'high'
      })
    }

    if (tier === 'medium') {
      recommendations.push({
        action: 'Standard monitoring',
        reason: 'Member is in acceptable risk range',
        priority: 'low'
      })
    }

    return recommendations
  }

  /**
   * Get tier from score
   */
  static getTierFromScore(score) {
    if (score >= 70) return 'low'
    if (score >= 40) return 'medium'
    return 'high'
  }

  /**
   * Get member risk profile
   */
  static async getMemberRiskProfile(memberId) {
    const currentScore = await RiskScore.findOne({ memberId }).sort({ calculatedAt: -1 })
    const previousScore = await RiskScore.findOne({ memberId }).sort({ calculatedAt: -2 })
    
    return {
      current: currentScore,
      previous: previousScore,
      trend: currentScore && previousScore 
        ? currentScore.score - previousScore.score 
        : null
    }
  }

  /**
   * Batch calculate risk scores
   */
  static async batchCalculateRiskScores(memberIds) {
    const results = []
    for (const memberId of memberIds) {
      try {
        const score = await this.calculateRiskScore(memberId)
        results.push({ memberId, success: true, score: score.score })
      } catch (error) {
        results.push({ memberId, success: false, error: error.message })
      }
    }
    return results
  }

  /**
   * Get high-risk members
   */
  static async getHighRiskMembers(limit = 100) {
    return RiskScore.getHighRiskMembers(limit)
  }
}

export default RiskScoringService
