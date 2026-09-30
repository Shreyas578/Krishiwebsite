import express from 'express';
import db from '../config/db.js';
import { getAgriculturalNews } from '../services/newsService.js';

const router = express.Router();

// Get agricultural news
router.get('/', async (req, res) => {
  let connection;
  try {
    const { query = 'agricultural', limit = 20, offset = 0 } = req.query;
    
    connection = await db.getConnection();
    // Check if we have cached news
    const [cachedNews] = await connection.query(
      'SELECT * FROM news_cache ORDER BY published_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );

    if (cachedNews && cachedNews.length > 0) {
      return res.status(200).json({
        success: true,
        data: cachedNews,
        count: cachedNews.length,
        source: 'cache'
      });
    }

    // Return sample news if no cache and no live news
    const liveNews = await getAgriculturalNews(query);
    if (liveNews && liveNews.length > 0) {
      return res.status(200).json({
        success: true,
        data: liveNews,
        count: liveNews.length,
        source: 'live'
      });
    }

    res.status(200).json({
      success: true,
      data: [],
      count: 0,
      source: 'empty'
    });
  } catch (error) {
    console.error('News error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'News service configured but may need additional setup'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get news by commodity
router.get('/commodity/:commodity', async (req, res) => {
  let connection;
  try {
    const { commodity } = req.params;
    const { limit = 10 } = req.query;

    connection = await db.getConnection();
    const [news] = await connection.query(
      'SELECT * FROM news_cache WHERE commodity_tags LIKE ? ORDER BY published_at DESC LIMIT ?',
      [`%${commodity}%`, parseInt(limit)]
    );

    if (!news || news.length === 0) {
      const liveNews = await getAgriculturalNews(commodity);
      if (liveNews && liveNews.length > 0) {
        return res.status(200).json({
          success: true,
          data: liveNews,
          count: liveNews.length,
          commodity,
          source: 'live'
        });
      }

      return res.status(404).json({
        success: false,
        message: 'No news found for this commodity'
      });
    }

    res.status(200).json({
      success: true,
      data: news,
      count: news.length,
      commodity
    });
  } catch (error) {
    console.error('Commodity news error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Search news
router.get('/search', async (req, res) => {
  let connection;
  try {
    const { q = '', limit = 20 } = req.query;

    connection = await db.getConnection();
    const [news] = await connection.query(
      'SELECT * FROM news_cache WHERE title LIKE ? OR summary LIKE ? ORDER BY published_at DESC LIMIT ?',
      [`%${q}%`, `%${q}%`, parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      data: news || [],
      count: news ? news.length : 0,
      query: q
    });
  } catch (error) {
    console.error('News search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
