
import PriceService from '../services/priceService.js';
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
// Note: In a real implementation, you would integrate with a FCM service or similar
// For now, we'll just log the alerts that would be sent

class PriceSpikeAlertJob {
  constructor() {
    this.jobName = 'PriceSpikeAlertJob';
    this.isRunning = false;
    // Threshold for price spike alert (percentage increase)
    this.priceSpikeThreshold = 20; // 20% increase
    // How often to check for price spikes (in hours)
    this.checkIntervalHours = 6;
  }

  /**
   * Check for significant price increases in commodities and send alerts to interested farmers
   */
  async checkAndSendAlerts() {
    if (this.isRunning) {
      console.log(${this.jobName}: Already running, skipping);
      return;
    }

    this.isRunning = true;
    const connection = await getConnection();
    
    try {
      console.log(${this.jobName}: Starting price spike alert check...);
      
      // Get farmers who have opted in for price alerts and their crops of interest
      // In a real implementation, you'd have a table for user preferences
      const [farmers] = await connection.query(
        SELECT DISTINCT
          u.id as user_id,
          u.phone,
          c.crop_name as commodity
        FROM users u
        JOIN farmer_profiles fp ON u.id = fp.user_id
        JOIN crops c ON fp.id = c.farmer_profile_id
        WHERE u.role = 'farmer' 
          AND c.status = 'active'
      );

      const alertsSent = [];
      
      // Group farmers by commodity to avoid redundant API calls
      const farmersByCommodity = {};
      for (const farmer of farmers) {
        if (!farmersByCommodity[farmer.commodity]) {
          farmersByCommodity[farmer.commodity] = [];
        }
        farmersByCommodity[farmer.commodity].push(farmer);
      }

      // Check each commodity for price spikes
      for (const [commodity, farmersList] of Object.entries(farmersByCommodity)) {
        try {
          // We need to get prices for each state where farmers are located
          // For simplicity, we'll check a few major agricultural states
          const majorStates = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Madhya Pradesh'];
          
          for (const state of majorStates) {
            try {
              // Get current price
              const currentPriceData = await PriceService.getPrice(commodity, state);
              
              if (!currentPriceData.success || !currentPriceData.data) {
                continue;
              }
              
              const currentPrice = currentPriceData.data.modal_price;
              
              // Get historical price (yesterday or day before) - in production you'd query your price_cache table
              // For this example, we'll simulate by getting a slightly older price
              // In reality, you'd query: SELECT * FROM price_cache WHERE commodity = ? AND state = ? AND price_date < ? ORDER BY price_date DESC LIMIT 1
              
              // For demonstration, we'll assume we have a way to get yesterday's price
              // This would come from your price_cache table which stores historical data
              const yesterdayPrice = currentPrice * (1 - (Math.random() * 0.3)); // Simulate some variation
              
              // Calculate percentage change
              const priceChangePercent = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
              
              // Check if it's a significant spike
              if (priceChangePercent >= this.priceSpikeThreshold) {
                // Send alert to all farmers interested in this commodity in this state
                const relevantFarmers = farmersList.filter(farmer => 
                  // In reality, you'd check if the farmer's state matches
                  true // Simplified - all farmers get alert for now
                );
                
                for (const farmer of relevantFarmers) {
                  const alert = {
                    id: uuidv4(),
                    user_id: farmer.user_id,
                    phone: farmer.phone,
                    type: 'price_spike_alert',
                    message: Price Alert:  prices in  have increased by %! Current modal price: ?/quintal. Consider selling your produce.,
                    commodity: commodity,
                    state: state,
                    price_change_percent: priceChangePercent,
                    current_price: currentPrice,
                    sent_at: new Date().toISOString()
                  };
                  
                  alertsSent.push(alert);
                  console.log(${this.jobName}: Would send price spike alert to  for  in );
                  
                  // Log the alert (in production, you'd store this in a notifications table)
                  await connection.query(
                    INSERT INTO pending_actions (id, user_id, action_type, message, created_at)
                    VALUES (?, ?, ?, ?, ?)
                  , [
                    alert.id,
                    farmer.user_id,
                    'price_spike_alert',
                    alert.message,
                    new Date()
                  ]);
                }
              }
            } catch (stateError) {
              console.error(${this.jobName}: Error checking prices for  in :, stateError.message);
              // Continue with other states
            }
          }
        } catch (commodityError) {
          console.error(${this.jobName}: Error processing commodity :, commodityError.message);
          // Continue with other commodities
        }
      }

      console.log(${this.jobName}: Completed. Sent  price spike alerts.);
      
    } catch (error) {
      console.error(${this.jobName}: Error checking price spikes:, error);
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
    console.log(${this.jobName}: Starting price spike alert job...);
    // For demonstration, we'll run it once
    // In production, you'd schedule it to run every few hours
    await this.checkAndSendAlerts();
  }
}

export default new PriceSpikeAlertJob();


