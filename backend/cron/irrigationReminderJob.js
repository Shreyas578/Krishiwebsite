
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
// Note: In a real implementation, you would integrate with a FCM service or similar
// For now, we'll just log the reminders that would be sent

class IrrigationReminderJob {
  constructor() {
    this.jobName = 'IrrigationReminderJob';
    this.isRunning = false;
  }

  /**
   * Check farmers who need irrigation reminders based on weather data and crop types
   * This is a simplified version - in production you'd use more sophisticated logic
   */
  async checkAndSendReminders() {
    if (this.isRunning) {
      console.log(${this.jobName}: Already running, skipping);
      return;
    }

    this.isRunning = true;
    const connection = await getConnection();
    
    try {
      console.log(${this.jobName}: Starting irrigation reminder check...);
      
      // Get farmers with their crops and locations
      // This query would join farmer_profiles, crops, and possibly weather data
      const [farmers] = await connection.query(
        SELECT 
          fp.id as farmer_profile_id,
          u.id as user_id,
          u.phone,
          c.crop_name,
          c.planting_date,
          c.field_location,
          c.irrigation_frequency_days
        FROM farmer_profiles fp
        JOIN users u ON fp.user_id = u.id
        JOIN crops c ON fp.id = c.farmer_profile_id
        WHERE c.status = 'active'
      );

      const remindersSent = [];
      
      for (const farmer of farmers) {
        // Simplified logic: check if it's time for irrigation based on planting date and frequency
        // In reality, you'd use weather data, soil moisture, crop type, etc.
        
        const plantingDate = new Date(farmer.planting_date);
        const today = new Date();
        const daysSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24));
        
        // Check if it's time for irrigation (simplified)
        if (farmer.irrigation_frequency_days > 0 && daysSincePlanting > 0) {
          const daysSinceLastIrrigation = daysSincePlanting % farmer.irrigation_frequency_days;
          
          // If today is irrigation day (or day before to give advance notice)
          if (daysSinceLastIrrigation === 0 || daysSinceLastIrrigation === farmer.irrigation_frequency_days - 1) {
            // In a real implementation, you would send a FCM push notification here
            const reminder = {
              id: uuidv4(),
              farmer_profile_id: farmer.farmer_profile_id,
              user_id: farmer.user_id,
              phone: farmer.phone,
              type: 'irrigation_reminder',
              message: Time to irrigate your  crop! Based on your planting date and irrigation schedule, your crop needs water today.,
              crop_name: farmer.crop_name,
              field_location: farmer.field_location,
              sent_at: new Date().toISOString()
            };
            
            remindersSent.push(reminder);
            console.log(${this.jobName}: Would send irrigation reminder to  for );
            
            // Log the reminder (in production, you'd store this in a notifications table)
            await connection.query(
              INSERT INTO pending_actions (id, user_id, action_type, message, created_at)
              VALUES (?, ?, ?, ?, ?)
            , [
              reminder.id,
              farmer.user_id,
              'irrigation_reminder',
              reminder.message,
              new Date()
            ]);
          }
        }
      }

      console.log(${this.jobName}: Completed. Sent  irrigation reminders.);
      
    } catch (error) {
      console.error(${this.jobName}: Error checking irrigation reminders:, error);
    } finally {
      this.isRunning = false;
      connection.release();
    }
  }

  /**
   * Start the job to run on a schedule
   * In production, you'd use node-cron or similar to schedule this
   */
  async start() {
    console.log(${this.jobName}: Starting irrigation reminder job...);
    // For demonstration, we'll run it once
    // In production, you'd schedule it to run every few hours
    await this.checkAndSendReminders();
  }
}

export default new IrrigationReminderJob();


