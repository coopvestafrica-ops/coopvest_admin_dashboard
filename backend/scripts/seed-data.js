import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Member from '../models/Member.js'
import Loan from '../models/Loan.js'
import Contribution from '../models/Contribution.js'
import Investment from '../models/Investment.js'

dotenv.config()

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coopvest_admin')
    console.log('✓ MongoDB connected')

    // Clear existing data
    await Member.deleteMany({})
    await Loan.deleteMany({})
    await Contribution.deleteMany({})
    await Investment.deleteMany({})
    console.log('✓ Cleared existing data')

    // Generate members
    const memberNames = [
      { first: 'Chioma', last: 'Okafor' },
      { first: 'Adebayo', last: 'Oluwaseun' },
      { first: 'Zainab', last: 'Mohammed' },
      { first: 'Emeka', last: 'Nwosu' },
      { first: 'Fatima', last: 'Hassan' },
      { first: 'Chukwu', last: 'Obi' },
      { first: 'Aisha', last: 'Ibrahim' },
      { first: 'Tunde', last: 'Adeyemi' },
      { first: 'Ngozi', last: 'Eze' },
      { first: 'Amara', last: 'Okonkwo' }
    ]

    const members = []
    for (let i = 0; i < memberNames.length; i++) {
      const member = new Member({
        firstName: memberNames[i].first,
        lastName: memberNames[i].last,
        email: `${memberNames[i].first.toLowerCase()}@coopvest.com`,
        phone: `+234${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        status: ['active', 'pending', 'suspended'][Math.floor(Math.random() * 3)],
        kycStatus: ['approved', 'pending', 'rejected'][Math.floor(Math.random() * 3)],
        employment: {
          employer: 'Company ' + (i + 1),
          position: ['Manager', 'Officer', 'Analyst', 'Coordinator'][Math.floor(Math.random() * 4)],
          salary: Math.floor(Math.random() * 500000 + 200000)
        },
        contributions: {
          total: Math.floor(Math.random() * 1000000 + 100000),
          monthly: Math.floor(Math.random() * 50000 + 10000)
        },
        wallet: {
          balance: Math.floor(Math.random() * 500000 + 50000)
        }
      })
      await member.save()
      members.push(member)
    }
    console.log(`✓ Created ${members.length} members`)

    // Generate loans
    for (let i = 0; i < 15; i++) {
      const member = members[Math.floor(Math.random() * members.length)]
      const amount = Math.floor(Math.random() * 500000 + 100000)
      const loan = new Loan({
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberEmail: member.email,
        amount,
        principalAmount: amount,
        interestRate: 5,
        status: ['pending', 'approved', 'disbursed', 'repaying', 'completed'][Math.floor(Math.random() * 5)],
        purpose: ['Business', 'Education', 'Medical', 'Housing'][Math.floor(Math.random() * 4)],
        outstandingBalance: amount * 0.7
      })
      await loan.save()
    }
    console.log('✓ Created 15 loans')

    // Generate contributions
    for (let i = 0; i < 50; i++) {
      const member = members[Math.floor(Math.random() * members.length)]
      const contribution = new Contribution({
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberEmail: member.email,
        amount: Math.floor(Math.random() * 100000 + 10000),
        type: ['regular', 'special', 'voluntary'][Math.floor(Math.random() * 3)],
        status: 'completed',
        month: new Date().toISOString().slice(0, 7),
        paymentMethod: ['bank_transfer', 'mobile_money'][Math.floor(Math.random() * 2)]
      })
      await contribution.save()
    }
    console.log('✓ Created 50 contributions')

    // Generate investments
    const investmentTypes = ['real_estate', 'agriculture', 'business', 'technology']
    for (let i = 0; i < 5; i++) {
      const targetAmount = Math.floor(Math.random() * 5000000 + 1000000)
      const investment = new Investment({
        name: `Investment Project ${i + 1}`,
        description: `A promising investment opportunity in ${investmentTypes[i]}`,
        type: investmentTypes[i],
        targetAmount,
        totalAmount: targetAmount,
        amountRaised: Math.floor(targetAmount * (Math.random() * 0.8 + 0.2)),
        expectedROI: Math.floor(Math.random() * 20 + 5),
        status: ['planning', 'active', 'completed'][Math.floor(Math.random() * 3)],
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      })
      await investment.save()
    }
    console.log('✓ Created 5 investments')

    console.log('\n✓ Data seeding completed successfully!')
    await mongoose.connection.close()
  } catch (error) {
    console.error('✗ Error seeding data:', error.message)
    process.exit(1)
  }
}

seedData()
