
import IrrigationReminderJob from './irrigationReminderJob.js';
import PriceSpikeAlertJob from './priceSpikeAlertJob.js';

// Initialize all cron jobs
const irrigationJob = new IrrigationReminderJob();
const priceSpikeJob = new PriceSpikeAlertJob();

/**
 * Start all scheduled jobs
 * In production, you would use node-cron to schedule these at specific intervals
 */
async function startAllJobs() {
  console.log('Starting background jobs...');
  
  // For demonstration purposes, we're running them once on startup
  // In production, you'd use something like:
  // import cron from 'node-cron';
  // 
  // // Run irrigation check every 6 hours
  // cron.schedule('0 */6 * * *', () => irrigationJob.checkAndSendReminders());
  // 
  // // Run price spike check every 6 hours  
  // cron.schedule('0 */6 * * *', () => priceSpikeJob.checkAndSendAlerts());
  // 
  // // Run daily summary at 8 AM
  // cron.schedule('0 8 * * *', () => dailySummaryJob.sendSummary());
  
  // For now, run once to demonstrate functionality
  await irrigationJob.checkAndSendReminders();
  await priceSpikeJob.checkAndSendAlerts();
  
  console.log('Background jobs initialization complete.');
}

export default {
  startAllJobs,
  irrigationJob,
  priceSpikeJob
};


