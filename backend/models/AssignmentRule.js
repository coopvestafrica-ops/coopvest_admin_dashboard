import mongoose from 'mongoose'

/**
 * AssignmentRule Model
 * Configures automatic row assignment based on criteria
 * Supports auto-assignment on creation and reassignment logic
 */
const assignmentRuleSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    index: true
  },
  
  // Rule name and description
  name: {
    type: String,
    required: true
  },
  
  description: String,
  
  // Rule status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },
  
  // Trigger configuration
  trigger: {
    // When to apply this rule
    event: {
      type: String,
      enum: ['on_create', 'on_status_change', 'on_priority_change', 'manual'],
      default: 'on_create'
    },
    
    // Conditions for applying the rule
    conditions: {
      // Match by status
      status: [String],
      
      // Match by priority
      priority: [String],
      
      // Match by tags
      tags: [String],
      
      // Custom field conditions
      customFields: [{
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'contains', 'greater_than', 'less_than', 'in_range']
        },
        value: mongoose.Schema.Types.Mixed
      }]
    }
  },
  
  // Assignment strategy
  assignmentStrategy: {
    type: {
      type: String,
      enum: ['round_robin', 'least_loaded', 'by_role', 'by_skill', 'manual_pool', 'creator'],
      default: 'round_robin'
    },
    
    // For round_robin: list of staff to rotate through
    staffPool: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }],
    
    // For by_role: specific role to assign to
    targetRole: String,
    
    // For by_skill: required skills
    requiredSkills: [String],
    
    // For manual_pool: specific staff members
    assignToStaff: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }],
    
    // Assign to creator
    assignToCreator: {
      type: Boolean,
      default: false
    }
  },
  
  // Reassignment configuration
  reassignment: {
    // Enable automatic reassignment
    enabled: {
      type: Boolean,
      default: false
    },
    
    // Reassign if no activity for X days
    inactivityDays: Number,
    
    // Reassign if status is pending for X days
    pendingDays: Number,
    
    // Reassign to
    reassignTo: {
      type: String,
      enum: ['next_in_pool', 'manager', 'supervisor'],
      default: 'next_in_pool'
    }
  },
  
  // Notification settings
  notifications: {
    notifyAssignee: {
      type: Boolean,
      default: true
    },
    
    notifyManager: {
      type: Boolean,
      default: false
    },
    
    notificationTemplate: String
  },
  
  // Rule priority (higher number = higher priority)
  priority: {
    type: Number,
    default: 0
  },
  
  // Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Statistics
  statistics: {
    totalAssignments: {
      type: Number,
      default: 0
    },
    
    totalReassignments: {
      type: Number,
      default: 0
    },
    
    lastApplied: Date
  }
}, {
  timestamps: true
})

// Compound indexes
assignmentRuleSchema.index({ sheetId: 1, status: 1 })
assignmentRuleSchema.index({ sheetId: 1, priority: -1 })

// Method to check if rule applies to a row
assignmentRuleSchema.methods.appliesToRow = function(row) {
  const conditions = this.trigger.conditions
  
  // Check status condition
  if (conditions.status && conditions.status.length > 0) {
    if (!conditions.status.includes(row.status)) {
      return false
    }
  }
  
  // Check priority condition
  if (conditions.priority && conditions.priority.length > 0) {
    if (!conditions.priority.includes(row.priority)) {
      return false
    }
  }
  
  // Check tags condition
  if (conditions.tags && conditions.tags.length > 0) {
    const hasMatchingTag = conditions.tags.some(tag => row.tags?.includes(tag))
    if (!hasMatchingTag) {
      return false
    }
  }
  
  // Check custom field conditions
  if (conditions.customFields && conditions.customFields.length > 0) {
    for (const condition of conditions.customFields) {
      const fieldValue = row.data?.get(condition.field)
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false
          break
        case 'contains':
          if (!String(fieldValue).includes(String(condition.value))) return false
          break
        case 'greater_than':
          if (!(fieldValue > condition.value)) return false
          break
        case 'less_than':
          if (!(fieldValue < condition.value)) return false
          break
        case 'in_range':
          if (!(fieldValue >= condition.value.min && fieldValue <= condition.value.max)) return false
          break
      }
    }
  }
  
  return true
}

// Method to get next assignee based on strategy
assignmentRuleSchema.methods.getNextAssignee = async function() {
  const strategy = this.assignmentStrategy
  
  switch (strategy.type) {
    case 'round_robin':
      // Get the next staff member in rotation
      if (strategy.staffPool.length === 0) return null
      
      // Simple round-robin: return first staff member
      // In production, track rotation state
      return strategy.staffPool[0]
      
    case 'least_loaded':
      // Find staff member with least assigned rows
      const Admin = mongoose.model('Admin')
      const SheetRow = mongoose.model('SheetRow')
      
      const staffWithCounts = await Promise.all(
        strategy.staffPool.map(async (staffId) => {
          const count = await SheetRow.countDocuments({
            primaryAssignee: staffId,
            status: { $in: ['draft', 'pending_review'] }
          })
          return { staffId, count }
        })
      )
      
      const leastLoaded = staffWithCounts.reduce((min, current) =>
        current.count < min.count ? current : min
      )
      
      return leastLoaded.staffId
      
    case 'by_role':
      // Find staff member with specific role
      const Admin2 = mongoose.model('Admin')
      const staff = await Admin2.findOne({ role: strategy.targetRole, status: 'active' })
      return staff?._id || null
      
    case 'manual_pool':
      // Return first staff member from manual pool
      return strategy.assignToStaff?.[0] || null
      
    case 'creator':
      // Will be handled by caller
      return null
      
    default:
      return null
  }
}

// Static method to get applicable rules for a row
assignmentRuleSchema.statics.getApplicableRules = async function(sheetId, event = 'on_create') {
  const rules = await this.find({
    sheetId,
    status: 'active',
    'trigger.event': event
  })
    .sort({ priority: -1 })
    .populate('assignmentStrategy.staffPool', 'name email')
    .populate('assignmentStrategy.assignToStaff', 'name email')
  
  return rules
}

// Static method to apply rules to a row
assignmentRuleSchema.statics.applyRulesToRow = async function(sheetId, row, event = 'on_create') {
  const rules = await this.getApplicableRules(sheetId, event)
  
  for (const rule of rules) {
    if (rule.appliesToRow(row)) {
      const assignee = await rule.getNextAssignee()
      
      if (assignee) {
        row.primaryAssignee = assignee
        if (!row.assignedTo.includes(assignee)) {
          row.assignedTo.push(assignee)
        }
        
        // Update statistics
        rule.statistics.totalAssignments += 1
        rule.statistics.lastApplied = new Date()
        await rule.save()
        
        return { applied: true, rule: rule._id, assignee }
      }
    }
  }
  
  return { applied: false }
}

export default mongoose.model('AssignmentRule', assignmentRuleSchema)
