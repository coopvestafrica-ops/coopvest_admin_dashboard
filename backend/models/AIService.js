import mongoose from 'mongoose'

/**
 * AIService Model
 * Manages AI service integrations and configurations
 * Supports multiple AI providers and feature flags
 */
const aiServiceSchema = new mongoose.Schema({
  // Service name
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Service type
  type: {
    type: String,
    enum: ['risk_assessment', 'fraud_detection', 'nlp_analysis', 'recommendation_engine', 'predictive_analytics'],
    required: true,
    index: true
  },
  
  // Provider information
  provider: {
    name: {
      type: String,
      enum: ['openai', 'anthropic', 'custom', 'internal'],
      required: true
    },
    
    apiKey: String,
    apiEndpoint: String,
    
    model: String,
    version: String
  },
  
  // Configuration
  config: {
    enabled: {
      type: Boolean,
      default: true
    },
    
    // Feature flags
    features: {
      loanRiskAssessment: {
        type: Boolean,
        default: false
      },
      
      referralAbuseDetection: {
        type: Boolean,
        default: false
      },
      
      supportResponseSuggestion: {
        type: Boolean,
        default: false
      },
      
      adminSummaryGeneration: {
        type: Boolean,
        default: false
      },
      
      memberBehaviorAnalysis: {
        type: Boolean,
        default: false
      }
    },
    
    // Performance settings
    timeout: {
      type: Number,
      default: 30000 // 30 seconds
    },
    
    retryAttempts: {
      type: Number,
      default: 3
    },
    
    // Rate limiting
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: 60
      },
      
      requestsPerDay: {
        type: Number,
        default: 10000
      }
    },
    
    // Cost tracking
    costPerRequest: Number,
    monthlyBudget: Number
  },
  
  // Usage statistics
  statistics: {
    totalRequests: {
      type: Number,
      default: 0
    },
    
    successfulRequests: {
      type: Number,
      default: 0
    },
    
    failedRequests: {
      type: Number,
      default: 0
    },
    
    averageResponseTime: Number,
    
    totalCost: {
      type: Number,
      default: 0
    },
    
    lastUsed: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'testing', 'deprecated'],
    default: 'inactive',
    index: true
  },
  
  // Health check
  healthCheck: {
    lastChecked: Date,
    isHealthy: {
      type: Boolean,
      default: true
    },
    lastError: String
  },
  
  // Metadata
  description: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
})

// Indexes
aiServiceSchema.index({ type: 1, status: 1 })
aiServiceSchema.index({ 'provider.name': 1 })

// Method to check if feature is enabled
aiServiceSchema.methods.isFeatureEnabled = function(feature) {
  return this.config.enabled && this.config.features[feature] === true
}

// Method to record request
aiServiceSchema.methods.recordRequest = function(success, responseTime, cost = 0) {
  this.statistics.totalRequests += 1
  
  if (success) {
    this.statistics.successfulRequests += 1
  } else {
    this.statistics.failedRequests += 1
  }
  
  // Update average response time
  if (responseTime) {
    const prevAvg = this.statistics.averageResponseTime || 0
    const prevCount = this.statistics.successfulRequests - 1
    this.statistics.averageResponseTime = (prevAvg * prevCount + responseTime) / this.statistics.successfulRequests
  }
  
  // Update cost
  if (cost > 0) {
    this.statistics.totalCost += cost
  }
  
  this.statistics.lastUsed = new Date()
}

// Method to check rate limit
aiServiceSchema.methods.checkRateLimit = function() {
  // This would be implemented with Redis or similar
  // For now, return true
  return true
}

// Static method to get active services
aiServiceSchema.statics.getActiveServices = async function() {
  return this.find({
    status: 'active',
    'config.enabled': true
  }).lean()
}

// Static method to get service by type
aiServiceSchema.statics.getServiceByType = async function(type) {
  return this.findOne({
    type,
    status: 'active',
    'config.enabled': true
  })
}

// Static method to get health status
aiServiceSchema.statics.getHealthStatus = async function() {
  const services = await this.find({
    status: { $in: ['active', 'testing'] }
  }).lean()
  
  return services.map(service => ({
    name: service.name,
    type: service.type,
    status: service.status,
    isHealthy: service.healthCheck.isHealthy,
    lastChecked: service.healthCheck.lastChecked,
    lastError: service.healthCheck.lastError
  }))
}

export default mongoose.model('AIService', aiServiceSchema)
