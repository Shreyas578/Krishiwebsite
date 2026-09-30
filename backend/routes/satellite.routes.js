import express from 'express';
const router = express.Router();

router.get('/ndvi', (req, res) => {
  // Mocking satellite NDVI data for the crop health monitoring
  // In a real scenario, this would call Open-Meteo or AgroAPI
  res.json({
    status: 'success',
    data: {
      location: 'Current Farm',
      date: new Date().toISOString().split('T')[0],
      ndvi: 0.75, // Healthy vegetation
      health_status: 'Good',
      recommendation: 'Crop vegetation looks healthy. Continue normal irrigation.',
      satellite_source: 'ESA Sentinel-2 (Mocked)'
    }
  });
});

export default router;
