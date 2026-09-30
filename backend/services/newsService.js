import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { Groq } from 'groq-sdk';
import { parseStringPromise } from 'xml2js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

function parseGroqJSON(raw, fallback) {
  try {
    let text = (raw || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const first = Math.min(text.indexOf('{') === -1 ? Infinity : text.indexOf('{'), text.indexOf('[') === -1 ? Infinity : text.indexOf('['));
    const last = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (first !== Infinity && last !== -1) text = text.slice(first, last + 1);
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

/**
 * Get agricultural news from free sources
 */
export async function getAgriculturalNews(commodity = null) {
  try {
    const news = [];

    // Try NewsAPI (free tier: 100/day)
    if (process.env.NEWSAPI_KEY) {
      try {
        const query = commodity ? `${commodity} price OR farming` : 'agriculture farming India';
        const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&apiKey=${process.env.NEWSAPI_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.articles) {
          data.articles.forEach(article => {
            news.push({
              title: article.title,
              summary: article.description,
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt
            });
          });
        }
      } catch (err) {
        console.warn('NewsAPI failed:', err.message);
      }
    }

    // Try GNews (free tier: 100/day)
    if (process.env.GNEWS_API_KEY && news.length < 10) {
      try {
        const query = commodity ? `${commodity} price` : 'agriculture India';
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&apikey=${process.env.GNEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.articles) {
          data.articles.forEach(article => {
            news.push({
              title: article.title,
              summary: article.description,
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt
            });
          });
        }
      } catch (err) {
        console.warn('GNews API failed:', err.message);
      }
    }

    // Try Google News RSS (Free, no key needed) if we still need news
    if (news.length < 10) {
      try {
        const query = commodity ? `${commodity} agriculture India` : 'agriculture farming India';
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
        const response = await fetch(url);
        const xmlData = await response.text();
        const result = await parseStringPromise(xmlData);
        
        if (result.rss && result.rss.channel && result.rss.channel[0] && result.rss.channel[0].item) {
          const items = result.rss.channel[0].item;
          items.forEach(item => {
            news.push({
              title: item.title ? item.title[0] : 'No Title',
              summary: item.description ? item.description[0].replace(/<[^>]+>/g, '') : '', // Strip HTML
              url: item.link ? item.link[0] : '',
              source: item.source && item.source[0] && item.source[0]._ ? item.source[0]._ : 'Google News',
              publishedAt: item.pubDate ? new Date(item.pubDate[0]).toISOString() : new Date().toISOString()
            });
          });
        }
      } catch (err) {
        console.warn('Google News RSS failed:', err.message);
      }
    }

    // If APIs fail, throw error instead of returning mock data
    if (news.length === 0) {
      console.warn(`No news found for commodity: ${commodity}`);
      // Return empty array with proper indication
      return []; 
    }

    // Remove duplicates based on URL
    const uniqueNews = [];
    const urls = new Set();
    for (const item of news) {
      if (!urls.has(item.url)) {
        urls.add(item.url);
        uniqueNews.push(item);
      }
    }

    return uniqueNews.slice(0, 20); // Return top 20
  } catch (error) {
    console.error('Error fetching agricultural news:', error);
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

/**
 * Analyze news sentiment for commodity
 */
export async function analyzeNewsSentiment(commodity, news = null) {
  try {
    const newsItems = news || await getAgriculturalNews(commodity);

    if (newsItems.length === 0) {
      return { score: 0, summary: 'No news available', headlines: [] };
    }

    // Prepare news summary for AI
    const newsText = newsItems.map(n => `${n.title}: ${n.summary}`).join('\n');

    const prompt = `Analyze the sentiment of these agricultural news items about ${commodity} and provide:
1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
2. Summary of sentiment in 1 sentence
3. List of 3 key headlines

News:
${newsText}

Respond as JSON:
{
  "sentimentScore": 0.3,
  "summary": "Market sentiment is moderately positive due to rising prices",
  "keyHeadlines": ["headline1", "headline2", "headline3"],
  "impact": "high/medium/low"
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = response.choices[0]?.message?.content || '';
    const sentiment = parseGroqJSON(responseText, {
      sentimentScore: 0,
      summary: 'Unable to determine sentiment',
      keyHeadlines: [],
      impact: 'medium'
    });

    return sentiment;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return { score: 0, summary: 'Error analyzing sentiment', headlines: [] };
  }
}

/**
 * Cache news articles
 */
export async function cacheNews(commodity, newsItems, sentimentScore) {
  const connection = await db.getConnection();
  try {
    for (const item of newsItems) {
      const newsId = uuidv4();
      await connection.query(
        `INSERT INTO news_cache (id, title, summary, url, commodity_tags, sentiment_score, published_at, source, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          newsId,
          item.title,
          item.summary,
          item.url,
          commodity,
          sentimentScore,
          new Date(item.publishedAt),
          item.source
        ]
      );
    }
    connection.release();
  } catch (error) {
    connection.release();
    console.error('Error caching news:', error);
  }
}

/**
 * Get cached news
 */
export async function getCachedNews(commodity) {
  const connection = await db.getConnection();
  try {
    const [cached] = await connection.query(
      `SELECT title, summary, url, sentiment_score, published_at, source
       FROM news_cache WHERE commodity_tags LIKE ? 
       ORDER BY published_at DESC LIMIT 20`,
      [`%${commodity}%`]
    );
    connection.release();
    return cached;
  } catch (error) {
    connection.release();
    throw error;
  }
}
