import * as marketService from '../services/marketIntelligenceService.js';
import { sendPushNotification } from '../services/notificationService.js';

/**
 * Run price alert checks every 3 hours
 * Call this function in a cron job or scheduled task
 */
export async function checkPriceAlerts() {
  try {
    console.log('[Price Alerts] Checking price alerts...');
    
    const triggeredAlerts = await marketService.checkAndTriggerAlerts();

    for (const alert of triggeredAlerts) {
      try {
        // Send push notification to user
        await sendPushNotification(alert.userId, {
          title: '💰 Price Alert',
          body: alert.message,
          data: {
            alertId: alert.alertId,
            commodity: alert.commodity,
            currentPrice: alert.currentPrice
          }
        });

        console.log(`[Price Alerts] Triggered alert for user ${alert.userId}: ${alert.message}`);
      } catch (notifError) {
        console.error(`Failed to send notification for alert ${alert.alertId}:`, notifError);
      }
    }

    console.log(`[Price Alerts] Checked ${triggeredAlerts.length} alerts`);
    return { success: true, alertsTriggered: triggeredAlerts.length };
  } catch (error) {
    console.error('[Price Alerts] Error checking alerts:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in other cron systems
export default checkPriceAlerts;
