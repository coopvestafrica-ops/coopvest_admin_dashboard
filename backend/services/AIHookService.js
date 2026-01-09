import AIService from '../models/AIService.js'
import LoanRiskFlag from '../models/LoanRiskFlag.js'
import ReferralAbuseDetection from '../models/ReferralAbuseDetection.js'
import SupportTicket from '../models/SupportTicket.js'

/**
 * AIHook Service Layer
 * Provides integration points for AI features
 * Handles risk assessment, fraud detection, and recommendations
 */

class AIHookService {
  /**
   * Initialize AI services
   */
  static async initialize() {
    try {
      const services = await AIService.getActiveServices()
      console.log(`Initialized ${services.length} AI services`)
      return services
    } catch (error) {
      console.error('Error initializing AI services:', error)
      return []
    }
  }

  /**
   * Assess loan risk using AI
   * CRITICAL: Called when loan is created or updated
   */
  static async assessLoanRisk(loan, member) {
    try {
      const service = await AIService.getServiceByType('risk_assessment')
      
      if (!service || !service.isFeatureEnabled('loanRiskAssessment')) {
        return null
      }
      
      // Prepare data for AI model
      const riskData = {
        loanAmount: loan.loanAmount,
        loanTerm: loan.loanTerm,
        interestRate: loan.interestRate,
        memberAge: member.age,
        memberIncome: member.employment?.salary,
        memberCreditScore: member.creditScore,
        memberLoanHistory: member.loans?.length || 0,
        memberDefaultHistory: member.defaultHistory?.length || 0,
        memberContributionHistory: member.contributions?.length || 0,
        memberKYCStatus: member.kycStatus,
        memberRiskScore: member.riskScore
      }
      
      // Call AI service (mock implementation)
      const startTime = Date.now()
      const riskAssessment = await this._callAIModel(service, 'assess_loan_risk', riskData)
      const responseTime = Date.now() - startTime
      
      // Record the request
      service.recordRequest(true, responseTime, riskAssessment.cost || 0)
      await service.save()
      
      // Create risk flag if needed
      if (riskAssessment.riskLevel !== 'low') {
        const riskFlag = await LoanRiskFlag.create({
          loanId: loan._id,
          memberId: member._id,
          riskLevel: riskAssessment.riskLevel,
          riskScore: riskAssessment.riskScore,
          riskFactors: riskAssessment.factors,
          aiModel: {
            name: service.provider.model,
            version: service.provider.version,
            confidence: riskAssessment.confidence
          },
          recommendation: riskAssessment.recommendation,
          recommendationReason: riskAssessment.reason,
          status: 'active'
        })
        
        return riskFlag
      }
      
      return null
    } catch (error) {
      console.error('Error assessing loan risk:', error)
      return null
    }
  }

  /**
   * Detect referral abuse using AI
   * CRITICAL: Called when referral is created or updated
   */
  static async detectReferralAbuse(referral, referrer, referredMember) {
    try {
      const service = await AIService.getServiceByType('fraud_detection')
      
      if (!service || !service.isFeatureEnabled('referralAbuseDetection')) {
        return null
      }
      
      // Prepare data for AI model
      const abuseData = {
        referrerId: referrer._id,
        referredMemberId: referredMember._id,
        referrerTotalReferrals: referrer.referrals?.length || 0,
        referrerSuccessfulReferrals: referrer.referrals?.filter(r => r.status === 'approved').length || 0,
        referrerRewardAmount: referrer.totalRewardEarned || 0,
        referredMemberAge: referredMember.age,
        referredMemberKYCStatus: referredMember.kycStatus,
        referredMemberContributionAmount: referredMember.totalContributions || 0,
        referralAmount: referral.rewardAmount,
        referralDate: referral.createdAt,
        referrerLocation: referrer.address?.state,
        referredMemberLocation: referredMember.address?.state,
        sameLocation: referrer.address?.state === referredMember.address?.state
      }
      
      // Call AI service (mock implementation)
      const startTime = Date.now()
      const abuseAssessment = await this._callAIModel(service, 'detect_referral_abuse', abuseData)
      const responseTime = Date.now() - startTime
      
      // Record the request
      service.recordRequest(true, responseTime, abuseAssessment.cost || 0)
      await service.save()
      
      // Create abuse detection record if needed
      if (abuseAssessment.riskLevel !== 'low') {
        const abuseDetection = await ReferralAbuseDetection.create({
          referralId: referral._id,
          referrerId: referrer._id,
          referredMemberId: referredMember._id,
          abuseType: abuseAssessment.abuseType,
          riskLevel: abuseAssessment.riskLevel,
          abuseScore: abuseAssessment.abuseScore,
          detectionFactors: abuseAssessment.factors,
          aiModel: {
            name: service.provider.model,
            version: service.provider.version,
            confidence: abuseAssessment.confidence
          },
          recommendation: abuseAssessment.recommendation,
          recommendationReason: abuseAssessment.reason,
          status: 'active'
        })
        
        return abuseDetection
      }
      
      return null
    } catch (error) {
      console.error('Error detecting referral abuse:', error)
      return null
    }
  }

  /**
   * Generate support response suggestions using AI
   * CRITICAL: Called when support ticket is being responded to
   */
  static async generateSupportResponseSuggestion(ticket) {
    try {
      const service = await AIService.getServiceByType('nlp_analysis')
      
      if (!service || !service.isFeatureEnabled('supportResponseSuggestion')) {
        return null
      }
      
      // Prepare data for AI model
      const ticketData = {
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        category: ticket.category,
        priority: ticket.priority,
        responseCount: ticket.responseCount
      }
      
      // Call AI service (mock implementation)
      const startTime = Date.now()
      const suggestion = await this._callAIModel(service, 'generate_response_suggestion', ticketData)
      const responseTime = Date.now() - startTime
      
      // Record the request
      service.recordRequest(true, responseTime, suggestion.cost || 0)
      await service.save()
      
      return suggestion
    } catch (error) {
      console.error('Error generating support response suggestion:', error)
      return null
    }
  }

  /**
   * Generate admin summary using AI
   * CRITICAL: Called for dashboard summaries and reports
   */
  static async generateAdminSummary(data) {
    try {
      const service = await AIService.getServiceByType('recommendation_engine')
      
      if (!service || !service.isFeatureEnabled('adminSummaryGeneration')) {
        return null
      }
      
      // Call AI service (mock implementation)
      const startTime = Date.now()
      const summary = await this._callAIModel(service, 'generate_admin_summary', data)
      const responseTime = Date.now() - startTime
      
      // Record the request
      service.recordRequest(true, responseTime, summary.cost || 0)
      await service.save()
      
      return summary
    } catch (error) {
      console.error('Error generating admin summary:', error)
      return null
    }
  }

  /**
   * Analyze member behavior using AI
   * CRITICAL: Called for member risk assessment
   */
  static async analyzeMemberBehavior(member) {
    try {
      const service = await AIService.getServiceByType('predictive_analytics')
      
      if (!service || !service.isFeatureEnabled('memberBehaviorAnalysis')) {
        return null
      }
      
      // Prepare data for AI model
      const behaviorData = {
        memberId: member._id,
        memberAge: member.age,
        memberStatus: member.status,
        totalContributions: member.contributions?.length || 0,
        totalLoans: member.loans?.length || 0,
        totalDefaults: member.defaultHistory?.length || 0,
        averageLoanAmount: member.loans?.reduce((sum, l) => sum + l.loanAmount, 0) / (member.loans?.length || 1),
        contributionFrequency: member.contributions?.length / ((Date.now() - member.createdAt) / (1000 * 60 * 60 * 24)),
        loanRepaymentRate: member.loans?.filter(l => l.status === 'repaid').length / (member.loans?.length || 1),
        memberSince: member.createdAt
      }
      
      // Call AI service (mock implementation)
      const startTime = Date.now()
      const analysis = await this._callAIModel(service, 'analyze_member_behavior', behaviorData)
      const responseTime = Date.now() - startTime
      
      // Record the request
      service.recordRequest(true, responseTime, analysis.cost || 0)
      await service.save()
      
      return analysis
    } catch (error) {
      console.error('Error analyzing member behavior:', error)
      return null
    }
  }

  /**
   * Mock AI model call
   * In production, this would call actual AI services (OpenAI, Anthropic, etc.)
   */
  static async _callAIModel(service, operation, data) {
    // Mock implementation
    // In production, replace with actual API calls
    
    switch (operation) {
      case 'assess_loan_risk':
        return {
          riskLevel: data.memberDefaultHistory > 0 ? 'high' : 'low',
          riskScore: Math.min(100, (data.memberDefaultHistory * 20) + (data.loanAmount / 100000 * 10)),
          factors: [
            { factor: 'Default History', weight: 0.3, description: `${data.memberDefaultHistory} previous defaults` },
            { factor: 'Loan Amount', weight: 0.2, description: `Loan amount: ${data.loanAmount}` },
            { factor: 'Income Ratio', weight: 0.2, description: `Loan to income ratio` }
          ],
          confidence: 0.85,
          recommendation: data.memberDefaultHistory > 0 ? 'review' : 'approve',
          reason: data.memberDefaultHistory > 0 ? 'Previous default history detected' : 'Low risk profile',
          cost: 0.01
        }
        
      case 'detect_referral_abuse':
        return {
          abuseType: data.sameLocation && data.referrerTotalReferrals > 10 ? 'collusion' : 'suspicious_pattern',
          riskLevel: data.referrerTotalReferrals > 20 ? 'high' : 'low',
          abuseScore: Math.min(100, (data.referrerTotalReferrals * 2) + (data.sameLocation ? 10 : 0)),
          factors: [
            { factor: 'Referral Count', weight: 0.4, description: `${data.referrerTotalReferrals} total referrals` },
            { factor: 'Location Match', weight: 0.3, description: data.sameLocation ? 'Same location' : 'Different location' }
          ],
          confidence: 0.80,
          recommendation: data.referrerTotalReferrals > 20 ? 'investigate' : 'allow',
          reason: data.referrerTotalReferrals > 20 ? 'Unusually high referral count' : 'Normal referral pattern',
          cost: 0.01
        }
        
      case 'generate_response_suggestion':
        return {
          suggestion: `Thank you for contacting us regarding "${data.title}". We understand your concern about ${data.category}. Our team is looking into this and will provide you with an update within 24 hours.`,
          tone: 'professional',
          confidence: 0.75,
          cost: 0.02
        }
        
      case 'generate_admin_summary':
        return {
          summary: 'System operating normally. All critical metrics within acceptable ranges.',
          keyMetrics: {
            activeMembers: data.activeMembers || 0,
            pendingLoans: data.pendingLoans || 0,
            totalContributions: data.totalContributions || 0
          },
          recommendations: ['Review high-risk loans', 'Follow up on overdue payments'],
          cost: 0.03
        }
        
      case 'analyze_member_behavior':
        return {
          riskLevel: data.totalDefaults > 0 ? 'medium' : 'low',
          behaviorScore: Math.max(0, 100 - (data.totalDefaults * 20)),
          patterns: ['Regular contributor', 'Consistent loan repayment'],
          recommendations: ['Member is reliable', 'Eligible for higher loan amounts'],
          cost: 0.01
        }
        
      default:
        return { error: 'Unknown operation' }
    }
  }

  /**
   * Health check for AI services
   */
  static async healthCheck() {
    try {
      const services = await AIService.find({ status: { $in: ['active', 'testing'] } })
      
      for (const service of services) {
        try {
          // Mock health check
          service.healthCheck.lastChecked = new Date()
          service.healthCheck.isHealthy = true
          service.healthCheck.lastError = null
          await service.save()
        } catch (error) {
          service.healthCheck.lastChecked = new Date()
          service.healthCheck.isHealthy = false
          service.healthCheck.lastError = error.message
          await service.save()
        }
      }
      
      return await AIService.getHealthStatus()
    } catch (error) {
      console.error('Error during AI service health check:', error)
      return []
    }
  }
}

export default AIHookService
