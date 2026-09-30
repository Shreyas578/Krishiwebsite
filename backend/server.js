const originalExit = process.exit.bind(process);
process.exit = (code) => {
  console.trace('>>> process.exit() called with code:', code);
  return originalExit(code);
};
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import db from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import ipfsRoutes from './routes/ipfs.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Import all routes
import weatherRoutes from './routes/weather.routes.js';
import priceRoutes from './routes/price.routes.js';
import marketRoutes from './routes/market.routes.js';
import farmReportRoutes from './routes/farmReport.routes.js';
import governmentSchemesRoutes from './routes/governmentSchemes.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import ttsRoutes from './routes/tts.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import diseaseRoutes from './routes/disease.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import orderRoutes from './routes/order.routes.js';
import inputRoutes from './routes/input.routes.js';
import farmRoutes from './routes/farm.routes.js';
import cropsRoutes from './routes/crops.routes.js';
import farmProfileRoutes from './routes/farmProfile.routes.js';
import reportRoutes from './routes/report.routes.js';
import marketIntelligenceRoutes from './routes/marketIntelligence.routes.js';
import registrationRoutes from './routes/registration.routes.js';
import farmReportGenerationRoutes from './routes/farm-report-generation.routes.js';
import newsRoutes from './routes/news.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import satelliteRoutes from './routes/satellite.routes.js';
import web3PurchaseRoutes from './routes/web3Purchase.routes.js';

// Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GROQ_API_KEY',
  'OPENWEATHER_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingEnvVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease configure these variables in .env file');
  process.exit(1);
}

// Warn about optional but important services
const optionalButImportantEnvVars = [
  { name: 'FIREBASE_SERVICE_ACCOUNT', service: 'Push Notifications' },
  { name: 'AGMARKNET_API_KEY', service: 'Market Prices (AGMARKNET)' },
  { name: 'CLOUDINARY_API_KEY', service: 'Image Upload' },
  { name: 'PINATA_API_KEY', service: 'IPFS Storage' },
  { name: 'SMTP_HOST', service: 'Email Notifications' },
  { name: 'TWILIO_ACCOUNT_SID', service: 'SMS Notifications' }
];

console.log('\n📋 Service Configuration Status:');
optionalButImportantEnvVars.forEach(({ name, service }) => {
  if (process.env[name]) {
    console.log(`   ✅ ${service} - Configured`);
  } else {
    console.log(`   ⚠️  ${service} - NOT configured (optional but recommended)`);
  }
});
console.log('');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the uploads directory for local IPFS fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Kisan AI API is running' });
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/registration', registrationRoutes);
// app.use('/api/farm-report', farmReportGenerationRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/market-intelligence', marketIntelligenceRoutes);
app.use('/api/farm-report', farmReportRoutes);
app.use('/api/government-schemes', governmentSchemesRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/input', inputRoutes);
app.use('/api/farm', farmRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/farm-profile', farmProfileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/web3-purchase', web3PurchaseRoutes);

// Global error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
