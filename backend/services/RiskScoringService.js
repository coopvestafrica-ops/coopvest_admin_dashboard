import RiskScore from '../models/RiskScore.js'
import Loan from '../models/Loan.js'
import Contribution from '../models/Contribution.js'
import Member from '../models/Member.js'
import FraudCase from '../models/FraudCase.js'
import mongoose from 'mongoose'

/**
 * Risk Scoring Service - calculates and manages member risk scores
 */
class RiskScoringService {
  /**
   * Calculate risk score for a member
   */
  static async calculateRiskScore(memberId) {
    const member = await Member.findById(memberId)
    if (!member) {
      throw new Error('Member not found')
    }
    
    // Get previous score for comparison
    const previousRiskScore = await RiskScore.findOne({ memberId }).sort({ calculatedAt: -1 })
    const previousScore = previousRiskScore?.score || null
    
    // Calculate component scores
    const repaymentBehavior = await this.calculateRepaymentBehavior(memberId)
    const contributionConsistency = await this.calculateContributionConsistency(memberId)
    const loanHistory = await this.calculateLoanHistory(memberId)
    const fraudFlags = await this.calculateFraudFlags(memberId)
    const accountStanding = await this.calculateAccountStanding(memberId)
    
    // Calculate weighted overall score
    const components = {
      repaymentBehavior,
      contributionConsistency,
      loanHistory,
      fraudFlags,
      accountStanding
    }
    
    let totalScore = 0
    let totalWeight = 0
    
    for (const [key, component] of Object.entries(components)) {
      totalScore += component.score * component.weight
      totalWeight += component.weight
    }
    
    // Normalize score to 0-100
    const normalizedScore = Math.min(100, Math.max(0, totalScore / totalWeight * 100))
    
    // Determine tier
    let tier
    if (normalizedScore >= 70) {
      tier = 'low'
    } else if (normalizedScore >= 40) {
      tier = 'medium'
    } else {
      tier = 'high'
    }
    
    // Generate risk indicators
    const riskIndicators = this.generateRiskIndicators(components, member)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(normalizedScore, tier, components)
    
    // Create risk score record
    const riskScore = new RiskScore({
      memberId,
      score: Math.round(normalizedScore),
      tier,
      components,
      riskIndicators,
      recommendations,
      previousScore,
      scoreChange: previousScore ? normalizedScore - previousScore : null,
      nextCalculationAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      calculatedBy: 'system'
    })
    
    await riskScore.save()
    
    // Update member risk score
    member.riskScore = Math.round(normalizedScore)
    if (tier === 'high') {
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
   * Calculate repayment behavior score (0-100, higher is better)
   */
  static async calculateRepaymentBehavior(memberId) {
    const loans = await Loan.find({ memberId })
    
    const details = {
      onTimePayments: 0,
      latePayments: 0,
      missedPayments: 0,
      averageDaysLate: 0,
      repaymentRate: 0
    }
    
    let totalPayments = 0
    let onTimeCount = 0
    let lateDays = 0
    let missedCount = 0
    
    for (const loan of loans) {
      if (loan.repayments && loan.repayments.length > 0) {
        for (const repayment of loan.repayments) {
          totalPayments++
          
          if (repayment.status === 'completed') {
            if (repayment.daysLate > 0) {
              lateCount++
              lateDays += repayment.daysLate
            } else {
              onTimeCount++
            }
          } else if (repayment.status === 'overdue') {
            missedCount++
          }
        }
      }
    }
    
    details.onTimePayments = onTimeCount
    details.latePayments = lateCount
    details.missedPayments = missedCount
    details.averageDaysLate = lateCount > 0 ? Math.round(lateDays / lateCount) : 0
    
    if (totalPayments > 0) {
      details.repaymentRate = Math.round((onTimeCount / totalPayments) * 100)
    }
    
    // Calculate score (0-100)
    let score = 0
    
    // Repayment rate weight: 40%
    score += (details.repaymentRate / 100) * 40
    
    // Late payment penalty: -15 points for any late payments
    if (lateCount > 0) {
      score -= Math.min(15, lateCount * 3)
    }
    
    // Missed payment penalty: -20 points for each missed
    score -= Math.min(30, missedCount * 10)
    
    // Bonus for 100% repayment rate
    if (details.repaymentRate === 100 && totalPayments > 0) {
      score += 15
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: 0.30,
      details
    }
  }

  /**
   * Calculate contribution consistency score (0-100, higher is better)
   */
  static async calculateContributionConsistency(memberId) {
    const contributions = await Contribution.find({ memberId, status: 'completed' })
      .sort({ contributionDate: -1 })
      .limit(12)
    
    const details = {
      monthsActive: contributions.length,
      totalContributions: 0,
      averageMonthlyContribution: 0,
      contributionFrequency: 'poor',
      lastContributionDate: null
    }
    
    if (contributions.length > 0) {
      details.totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0)
      details.averageMonthlyContribution = details.totalContributions / contributions.length
      details.lastContributionDate = contributions[0].contributionDate
      
      // Determine frequency
      if (contributions.length >= 10) {
        details.contributionFrequency = 'regular'
      } else if (contributions.length >= 5) {
        details.contributionFrequency = 'irregular'
      }
    }
    
    // Calculate score
    let score = 0
    
    // Months active: up to 30 points
    score += Math.min(30, details.monthsActive * 3)
    
    // Consistency bonus: up to 40 points
    if (details.contributionFrequency === 'regular') {
      score += 40
    } else if (details.contributionFrequency === 'irregular') {
      score += 20
    }
    
    // Recent activity: up to 30 points
    if (details.lastContributionDate) {
      const daysSinceLast = (Date.now() - new Date(details.lastContributionDate)) / (1000 * 60 * 60 * 24)
      if (daysSinceLast <= 30) {
        score += 30
      } else if (daysSinceLast <= 60) {
        score += 20
      } else if (daysSinceLast <= 90) {
        score += 10
      }
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: 0.25,
      details
    }
  }

  /**
   * Calculate loan history score (0-100, higher is better)
   */
  static async calculateLoanHistory(memberId) {
    const loans = await Loan.find({ memberId })
    
    const details = {
      totalLoans: loans.length,
      completedLoans: loans.filter(l => l.status === 'completed').length,
      defaultedLoans: loans.filter(l => l.status === 'defaulted').length,
      currentOutstanding: 0,
      loanUtilizationRate: 0
    }
    
    // Calculate current outstanding
    let totalBorrowed = 0
    for (const loan of loans) {
      if (['disbursed', 'repaying'].includes(loan.status)) {
        totalBorrowed += loan.outstandingBalance || loan.principalAmount
      }
    }
    details.currentOutstanding = totalBorrowed
    
    // Get member contributions for utilization calculation
    const member = await Member.findById(memberId)
    const totalContributions = member.contributions?.total || 0
    
    if (totalContributions > 0) {
      details.loanUtilizationRate = Math.round((totalBorrowed / totalContributions) * 100)
    }
    
    // Calculate score
    let score = 50 // Base score
    
    // Completed loans bonus
    score += Math.min(20, details.completedLoans * 10)
    
    // Default penalty
    score -= Math.min(30, details.defaultedLoans * 15)
    
    // Utilization rate penalty (high utilization = higher risk)
    if (details.loanUtilizationRate > 300) {
      score -= 20
    } else if (details.loanUtilizationRate > 200) {
      score -= 10
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: 0.20,
      details
    }
  }

  /**
   * Calculate fraud flags score (0-100, lower is better, but we invert for consistency)
   */
  static async calculateFraudFlags(memberId) {
    const fraudCases = await FraudCase.find({
      'involvedMembers.member': memberId,
      status: { $in: ['open', 'investigating'] }
    })
    
    const details = {
      fraudCases: fraudCases.length,
      referralAbuse: 0,
      suspiciousActivity: 0,
      complianceIssues: 0
    }
    
    // Count by type
    for (const case_ of fraudCases) {
      if (case_.type.includes('referral')) {
        details.referralAbuse++
      }
      if (case_.type.includes('suspicious') || case_.type.includes('pattern')) {
        details.suspiciousActivity++
      }
    }
    
    // Check member flags
    const member = await Member.findById(memberId)
    for (const flag of member.flags || []) {
      if (flag.includes('fraud') || flag.includes('suspicious')) {
        details.suspiciousActivity++
      }
      if (flag.includes('compliance')) {
        details.complianceIssues++
      }
    }
    
    // Calculate score (100 - penalties)
    let score = 100
    
    // Active fraud cases
    score -= details.fraudCases * 25
    score -= details.referralAbuse * 20
    score -= details.suspiciousActivity * 15
    score -= details.complianceIssues * 20
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: 0.15,
      details
    }
  }

  /**
   * Calculate account standing score (0-100, higher is better)
   */
  static async calculateAccountStanding(memberId) {
    const member = await Member.findById(memberId)
    
    const details = {
      kycStatus: member.kycStatus,
      accountAge: 0,
      status: member.status,
      suspensionCount: 0
    }
    
    // Calculate account age in months
    const ageInMonths = (Date.now() - new Date(member.createdAt)) / (1000 * 60 * 60 * 24 * 30)
    details.accountAge = Math.round(ageInMonths)
    
    // Calculate score
    let score = 0
    
    // KYC status: up to 30 points
    if (member.kycStatus === 'approved') {
      score += 30
    } else if (member.kycStatus === 'pending') {
      score += 15
    }
    
    // Account age: up to 30 points
    score += Math.min(30, details.accountAge * 2.5)
    
    // Account status: up to 25 points
    if (member.status === 'active') {
      score += 25
    } else if (member.status === 'pending') {
      score += 10
    }
    
    // Suspension penalty
    if (member.status === 'suspended') {
      score -= 50
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: 0.10,
      details
    }
  }

  /**
   * Generate risk indicators based on component scores
   */
  static generateRiskIndicators(components, member) {
    const indicators = []
    
    // Repayment issues
    if (components.repaymentBehavior.details.missedPayments > 0) {
      indicators.push({
        type: 'missed_payment',
        severity: components.repaymentBehavior.details.missedPayments > 2 ? 'high' : 'medium',
        description: `Member has ${components.repaymentBehavior.details.missedPayments} missed payments`,
        detectedAt: new Date()
      })
    }
    
    // Late payments
    if (components.repaymentBehavior.details.latePayments > 0) {
      indicators.push({
        type: 'late_payment',
        severity: components.repaymentBehavior.details.averageDaysLate > 14 ? 'high' : 'medium',
        description: `Average ${components.repaymentBehavior.details.averageDaysLate} days late on payments`,
        detectedAt: new Date()
      })
    }
    
    // High debt ratio
    if (components.loanHistory.details.loanUtilizationRate > 300) {
      indicators.push({
        type: 'high_debt_ratio',
        severity: 'high',
        description: `Loan utilization rate of ${components.loanHistory.details.loanUtilizationRate}% is very high`,
        detectedAt: new Date()
      })
    }
    
    // Fraud flags
    if (components.fraudFlags.details.fraudCases > 0) {
      indicators.push({
        type: 'fraud_suspicion',
        severity: 'high',
        description: `${components.fraudFlags.details.fraudCases} active fraud case(s)`,
        detectedAt: new Date()
      })
    }
    
    // KYC issues
    if (components.accountStanding.details.kycStatus !== 'approved') {
      indicators.push({
        type: 'kyc_issue',
        severity: 'medium',
        description: 'KYC verification not completed',
        detectedAt: new Date()
      })
    }
    
    // Irregular contribution activity
    if (components.contributionConsistency.details.contributionFrequency === 'poor') {
      indicators.push({
        type: 'irregular_activity',
        severity: 'medium',
        description: 'Irregular contribution activity',
        detectedAt: new Date()
      })
    }
    
    return indicators
  }

  /**
   * Generate recommendations based on risk profile
   */
  static generateRecommendations(score, tier, components) {
    const recommendations = []
    
    if (tier === 'high') {
      recommendations.push({
        action: 'Require additional collateral for new loans',
        reason: 'High risk score indicates elevated lending risk',
        priority: 'high'
      })
      
      if (components.repaymentBehavior.score < 50) {
        recommendations.push({
          action: 'Send payment reminder and set up payment plan',
          reason: 'Poor repayment behavior detected',
          priority: 'high'
        })
      }
    }
    
    if (tier === 'medium') {
      recommendations.push({
        action: 'Monitor closely for next 90 days',
        reason: 'Medium risk score requires attention',
        priority: 'medium'
      })
      
      if (components.loanHistory.details.loanUtilizationRate > 200) {
        recommendations.push({
          action: 'Consider debt consolidation discussion',
          reason: 'High loan utilization relative to contributions',
          priority: 'medium'
        })
      }
    }
    
    if (tier === 'low') {
      recommendations.push({
        action: 'Eligible for priority loan approval',
        reason: 'Low risk score indicates reliable repayment history',
        priority: 'low'
      })
      
      recommendations.push({
        action: 'Consider for referral program incentives',
        reason: 'Good standing member can be trusted referrer',
        priority: 'low'
      })
    }
    
    return recommendations
  }

  /**
   * Get risk score for a member
   */
  static async getRiskScore(memberId) {
    return RiskScore.getByMember(memberId)
  }

  /**
   * Get high risk members
   */
  static async getHighRiskMembers(limit = 100) {
    return RiskScore.getHighRiskMembers(limit)
  }

  /**
   * Get risk statistics
   */
  static async getStats() {
    const tierStats = await RiskScore.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          averageScore: { $avg: '$score' }
        }
      }
    ])
    
    const recentCalculations = await RiskScore.find()
      .sort({ calculatedAt: -1 })
      .limit(10)
      .populate('memberId', 'firstName lastName email')
    
    return {
      byTier: tierStats,
      recentCalculations
    }
  }

  /**
   * Batch recalculate risk scores
   */
  static async batchRecalculate(memberIds) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    }
    
    for (const memberId of memberIds) {
      try {
        await this.calculateRiskScore(memberId)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({ memberId, error: error.message })
      }
    }
    
    return results
  }

  /**
   * Check if member is eligible for loan based on risk score
   */
  static async checkLoanEligibility(memberId, loanAmount) {
    const riskScore = await this.getRiskScore(memberId)
    
    if (!riskScore) {
      return {
        eligible: false,
        reason: 'No risk score calculated',
        recommendation: 'Calculate risk score first'
      }
    }
    
    if (riskScore.tier === 'high') {
      return {
        eligible: false,
        tier: riskScore.tier,
        score: riskScore.score,
        reason: 'High risk members require manual approval',
        recommendation: 'Submit for manual review with collateral requirements'
      }
    }
    
    if (riskScore.tier === 'medium') {
      const member = await Member.findById(memberId)
      const maxLoanAmount = member.contributions.total * 3
      
      if (loanAmount > maxLoanAmount) {
        return {
          eligible: false,
          tier: riskScore.tier,
          score: riskScore.score,
          reason: 'Loan amount exceeds limit for medium risk members',
          recommendation: `Maximum eligible loan: ${maxLoanAmount}`
        }
      }
    }
    
    return {
      eligible: true,
      tier: riskScore.tier,
      score: riskScore.score,
      maxLoanMultiplier: riskScore.tier === 'low' ? 5 : 3
    }
  }
}

export default RiskScoringService
