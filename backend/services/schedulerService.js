import cron from 'node-cron';
import Member from '../models/Member.js';
import Loan from '../models/Loan.js';
import Contribution from '../models/Contribution.js';

/**
 * Initialize all scheduled tasks
 */
export const initScheduler = () => {
  console.log('✓ Scheduler initialized');

  // 1. Daily Interest Accrual (Runs at 00:00 every day)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running Daily Interest Accrual...');
    try {
      const activeLoans = await Loan.find({ status: 'active' });
      for (const loan of activeLoans) {
        // Simple daily interest accrual logic
        const dailyRate = (loan.interestRate || 0) / 100 / 365;
        const interest = loan.amount * dailyRate;
        loan.accruedInterest = (loan.accruedInterest || 0) + interest;
        await loan.save();
      }
      console.log(`Accrued interest for ${activeLoans.length} loans`);
    } catch (error) {
      console.error('Error in Daily Interest Accrual:', error);
    }
  });

  // 1.1 Daily Rollover Monitoring (Runs at 00:30 every day)
  cron.schedule('30 0 * * *', async () => {
    console.log('Running Daily Rollover Monitoring...');
    try {
      const today = new Date();
      const dueRollovers = await Loan.find({
        'rollover.status': 'pending',
        'rollover.dueDate': { $lte: today }
      });

      for (const loan of dueRollovers) {
        loan.rollover.status = 'due';
        await loan.save();
        // Notification logic would go here
      }
      console.log(`Updated ${dueRollovers.length} rollovers to due status`);
    } catch (error) {
      console.error('Error in Rollover Monitoring:', error);
    }
  });

  // 2. Overdue Loan Check (Runs at 01:00 every day)
  cron.schedule('0 1 * * *', async () => {
    console.log('Checking for overdue loans...');
    try {
      const today = new Date();
      const overdueLoans = await Loan.find({
        status: 'active',
        dueDate: { $lt: today }
      });

      for (const loan of overdueLoans) {
        loan.status = 'overdue';
        await loan.save();
        // Trigger notification logic here
      }
      console.log(`Updated ${overdueLoans.length} loans to overdue status`);
    } catch (error) {
      console.error('Error in Overdue Loan Check:', error);
    }
  });

  // 3. Monthly Contribution Reminder (Runs at 09:00 on the 1st of every month)
  cron.schedule('0 9 1 * *', async () => {
    console.log('Sending monthly contribution reminders...');
    try {
      const activeMembers = await Member.find({ status: 'active' });
      // In a real app, use nodemailer here
      console.log(`Sent reminders to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error in Monthly Contribution Reminder:', error);
    }
  });

  // 4. Weekly Report Generation (Runs at 23:00 every Sunday)
  cron.schedule('0 23 * * 0', async () => {
    console.log('Generating weekly summary reports...');
    try {
      // Logic to aggregate weekly stats and send email
      const stats = {
        newMembers: await Member.countDocuments({ createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        totalLoans: await Loan.countDocuments({ status: 'active' }),
        totalContributions: await Contribution.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
      };
      console.log('Weekly stats generated:', stats);
      // Send email using nodemailer
    } catch (error) {
      console.error('Error in Weekly Report Generation:', error);
    }
  });
};
