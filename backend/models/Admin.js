import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['super_admin', 'finance', 'operations', 'compliance', 'member_support', 'investment', 'technology'],
    required: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'approve', 'manage_admins', 'manage_members', 'manage_loans', 'manage_investments', 'manage_compliance']
  }],
  status: {
    type: String,
    enum: ['active', 'pending_approval', 'suspended', 'inactive'],
    default: 'pending_approval'
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: String,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  ipWhitelist: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to check if account is locked
adminSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now()
}

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    })
  }
  
  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } }
  
  // Lock account after 5 attempts
  const maxAttempts = 5
  const lockTime = 2 * 60 * 60 * 1000 // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime }
  }
  
  return this.updateOne(updates)
}

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  })
}

export default mongoose.model('Admin', adminSchema)
