import admin from 'firebase-admin';
import dotenv from 'dotenv';
import db from '../config/db.js';

dotenv.config();

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccount) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not configured. Push notifications will not work.');
    return;
  }

  try {
    const serviceAccountObj = JSON.parse(serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountObj)
    });
    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification object with title, body, data
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendPushNotification(userId, notification) {
  try {
    // Initialize Firebase if not already done
    initializeFirebase();

    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized. Configure FIREBASE_SERVICE_ACCOUNT in .env');
    }

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!notification || !notification.title || !notification.body) {
      throw new Error('Notification must have title and body');
    }

    // Get user's FCM device tokens from database
    const [tokens] = await db.query(
      `SELECT device_token FROM user_device_tokens 
       WHERE user_id = ? AND is_active = TRUE AND device_token IS NOT NULL`,
      [userId]
    );

    if (!tokens || tokens.length === 0) {
      console.warn(`No active device tokens found for user ${userId}`);
      // Store notification in database even if no device token
      await storeNotificationInDB(userId, notification);
      return { 
        success: false, 
        message: 'No active device tokens found. Notification stored in database.' 
      };
    }

    const deviceTokens = tokens.map(t => t.device_token);
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'kisan_ai_notifications'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            'content-available': 1
          }
        }
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/logo.png'
        }
      }
    };

    // Send to all devices
    const responses = await Promise.allSettled(
      deviceTokens.map(token => admin.messaging().send({ ...message, token }))
    );

    // Track successful sends
    let successCount = 0;
    const failedTokens = [];

    responses.forEach((response, index) => {
      if (response.status === 'fulfilled') {
        successCount++;
      } else {
        failedTokens.push(deviceTokens[index]);
        console.error(`Failed to send to token: ${deviceTokens[index]}`, response.reason);
      }
    });

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      await db.query(
        `UPDATE user_device_tokens SET is_active = FALSE 
         WHERE device_token IN (${failedTokens.map(() => '?').join(',')})`,
        failedTokens
      );
    }

    // Store notification in database
    await storeNotificationInDB(userId, notification);

    return {
      success: true,
      message: `Notification sent to ${successCount} of ${deviceTokens.length} devices`,
      successful: successCount,
      failed: failedTokens.length
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Store failed notification in database for retry
    try {
      await storeNotificationInDB(userId, notification, false);
    } catch (dbError) {
      console.error('Failed to store notification in database:', dbError);
    }

    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Store notification in database
 * @private
 */
async function storeNotificationInDB(userId, notification, sent = true) {
  const { v4: uuidv4 } = await import('uuid');
  
  await db.query(
    `INSERT INTO notifications (id, user_id, title, message, type, sent_status, read_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
    [
      uuidv4(),
      userId,
      notification.title,
      notification.body,
      notification.type || 'general',
      sent ? 'sent' : 'pending'
    ]
  );
}

/**
 * Send email notification using nodemailer (requires setup)
 * @param {string} email - Email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @returns {Promise<Object>} Result of email sending
 */
export async function sendEmailNotification(email, subject, htmlContent) {
  try {
    // Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Valid email address is required');
    }

    if (!subject || !htmlContent) {
      throw new Error('Subject and content are required');
    }

    // Check if nodemailer is configured in .env
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    };

    if (!Object.values(smtpConfig).every(v => v)) {
      console.warn('⚠️  Email service not configured. Skipping email notification.');
      return {
        success: false,
        message: 'Email service not configured. Configure SMTP settings in .env'
      };
    }

    // Import nodemailer dynamically
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport(smtpConfig);

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@kisanai.com',
      to: email,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${email}`);
    return {
      success: true,
      message: `Email sent to ${email}`
    };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send SMS notification using Twilio (requires setup)
 * @param {string} phone - Phone number with country code
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Result of SMS sending
 */
export async function sendSmsNotification(phone, message) {
  try {
    // Validate inputs
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new Error('Valid phone number is required (E.164 format)');
    }

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (message.length > 160) {
      throw new Error('SMS message must be 160 characters or less');
    }

    // Check if Twilio is configured
    const twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    };

    if (!Object.values(twilioConfig).every(v => v)) {
      console.warn('⚠️  Twilio SMS service not configured. Skipping SMS notification.');
      return {
        success: false,
        message: 'SMS service not configured. Configure Twilio settings in .env'
      };
    }

    // Import Twilio dynamically
    const twilio = await import('twilio');
    const client = twilio.default(twilioConfig.accountSid, twilioConfig.authToken);

    await client.messages.create({
      body: message,
      from: twilioConfig.phoneNumber,
      to: phone
    });

    console.log(`✅ SMS sent to ${phone}`);
    return {
      success: true,
      message: `SMS sent to ${phone}`
    };
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
