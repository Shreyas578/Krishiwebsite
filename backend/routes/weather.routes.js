
import express from 'express';
const router = express.Router();
import { getCurrentWeather, getForecast, checkConfig } from '../controllers/weatherController.js';

router.get('/current', getCurrentWeather);
router.get('/forecast', getForecast);
router.get('/status', checkConfig);

export default router;

