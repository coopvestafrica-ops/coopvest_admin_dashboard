import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Admin from '../models/Admin.js'

dotenv.config()

const initSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coopvest_admin')
    console.log('✓ MongoDB connected')

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ email: 'ayanlowo89@gmail.com' })
    
    if (existingAdmin) {
      console.log('✓ Super Admin already exists')
      await mongoose.connection.close()
      return
    }

    // Create super admin
    const superAdmin = new Admin({
      name: 'Super Admin',
      email: 'ayanlowo89@gmail.com',
      password: 'Temiloluwa@1963',
      role: 'super_admin',
      permissions: ['read', 'write', 'approve', 'manage_admins'],
      status: 'active',
      mfaEnabled: false
    })

    await superAdmin.save()
    console.log('✓ Super Admin created successfully')
    console.log('  Email: ayanlowo89@gmail.com')
    console.log('  Password: Temiloluwa@1963')
    console.log('  Role: super_admin')

    // Create finance admin for testing
    const financeAdmin = new Admin({
      name: 'Finance Admin',
      email: 'finance@coopvest.com',
      password: 'password',
      role: 'finance',
      permissions: ['read', 'write', 'approve'],
      status: 'active',
      mfaEnabled: false
    })

    await financeAdmin.save()
    console.log('✓ Finance Admin created successfully')
    console.log('  Email: finance@coopvest.com')
    console.log('  Password: password')
    console.log('  Role: finance')

    await mongoose.connection.close()
    console.log('\n✓ Admin initialization complete!')
  } catch (error) {
    console.error('✗ Error initializing super admin:', error.message)
    process.exit(1)
  }
}

initSuperAdmin()
