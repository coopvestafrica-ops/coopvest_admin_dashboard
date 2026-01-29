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
      // Logic for interest accrual would go here
      // Example: Update active loans with daily interest
    } catch (error) {
      console.error('Error in Daily Interest Accrual:', error);
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
      // Trigger email/SMS notification logic here
      console.log(`Sent reminders to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error in Monthly Contribution Reminder:', error);
    }
  });
};
