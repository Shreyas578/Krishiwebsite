
import axios from 'axios'
import dotenv from 'dotenv';
dotenv.config();

/**
 * Weather Service for OpenWeatherMap integration
 * Provides current weather and forecast data for agricultural planning
 */
class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    
    // Validate configuration
    if (!this.apiKey) {
      console.warn('Warning: OPENWEATHER_API_KEY not configured in .env');
    }
  }

  /**
   * Get current weather data for coordinates
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} Weather data
   */
  async getCurrentWeather(latitude, longitude) {
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured. Please set OPENWEATHER_API_KEY in .env');
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      throw new Error('Invalid latitude or longitude values');
    }

    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric' // Use metric units (Celsius, m/s, etc.)
        }
      });

      const data = response.data;
      
      return {
        success: true,
        data: {
          temperature: data.main.temp,
          feels_like: data.main.feels_like,
          temp_min: data.main.temp_min,
          temp_max: data.main.temp_max,
          pressure: data.main.pressure,
          humidity: data.main.humidity,
          visibility: data.visibility ? data.visibility / 1000 : null, // Convert to km
          wind_speed: data.wind.speed,
          wind_deg: data.wind.deg,
          weather_main: data.weather[0].main,
          weather_description: data.weather[0].description,
          weather_icon: data.weather[0].icon,
          clouds: data.clouds.all,
          rain_1h: data.rain ? data.rain['1h'] : 0,
          snow_1h: data.snow ? data.snow['1h'] : 0,
          dt: data.dt, // Unix timestamp
          sunrise: data.sys.sunrise,
          sunset: data.sys.sunset,
          timezone: data.timezone,
          city_name: data.name,
          country_code: data.sys.country
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Handle specific API errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401) throw new Error('Invalid OpenWeatherMap API key');
        if (status === 404) throw new Error('Weather data not found for given coordinates');
        if (status === 429) throw new Error('API rate limit exceeded');
        throw new Error('OpenWeatherMap API error: ' + error.response.statusText);
      }
      throw new Error('Failed to fetch weather data: ' + error.message);
    }
  }

  /**
   * Get weather forecast for coordinates
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {number} days - Number of days to forecast (1-5 for free tier)
   * @returns {Promise<Object>} Forecast data
   */
  async getForecast(latitude, longitude, days = 5) {
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured. Please set OPENWEATHER_API_KEY in .env');
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      throw new Error('Invalid latitude or longitude values');
    }

    // Validate days parameter
    if (typeof days !== 'number' || isNaN(days) || days < 1 || days > 5) {
      throw new Error('Days must be a number between 1 and 5');
    }

    try {
      // Use the regular forecast endpoint (5 day / 3 hour forecast) - available on free tier
      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const data = response.data;
      
      // Group forecast data by day
      const groupedByDay = {};
      data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!groupedByDay[date]) {
          groupedByDay[date] = [];
        }
        groupedByDay[date].push(item);
      });

      // Create daily forecast from 3-hour data
      const forecastList = Object.entries(groupedByDay).slice(0, days).map(([date, items]) => {
        // Find min/max temps for the day
        const temps = items.map(i => i.main.temp);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        
        // Get weather from middle of day (noon-ish)
        const middayItem = items[Math.floor(items.length / 2)];
        
        return {
          date: date,
          temp_min: minTemp,
          temp_max: maxTemp,
          temp_day: middayItem.main.temp,
          pressure: middayItem.main.pressure,
          humidity: middayItem.main.humidity,
          weather_main: middayItem.weather[0].main,
          weather_description: middayItem.weather[0].description,
          weather_icon: middayItem.weather[0].icon,
          speed: middayItem.wind.speed,
          deg: middayItem.wind.deg,
          clouds: middayItem.clouds.all,
          rain: middayItem.rain ? middayItem.rain['3h'] : 0,
          snow: middayItem.snow ? middayItem.snow['3h'] : 0,
          pop: (items.reduce((sum, i) => sum + (i.pop || 0), 0) / items.length) * 100
        };
      });

      // Extract hourly data for the first day (next 24 hours)
      const hourlyData = data.list.slice(0, 8).map(item => ({
        dt: new Date(item.dt * 1000),
        temp: item.main.temp,
        weather: item.weather[0].main,
        icon: item.weather[0].icon,
        pop: item.pop * 100
      }));

      return {
        success: true,
        hourly: hourlyData.map(h => ({
          dt: Math.floor(h.dt.getTime() / 1000),
          temp: h.temp,
          feelsLike: h.temp,
          pressure: 0,
          humidity: 0,
          windSpeed: 0,
          windDeg: 0,
          windGust: 0,
          weather: [{
            id: 0,
            main: h.weather,
            description: h.weather,
            icon: h.icon
          }],
          clouds: 0,
          pop: h.pop / 100,
          rain: 0,
          snow: 0
        })),
        daily: forecastList.map(f => ({
          dt: f.date,
          sunrise: 0,
          sunset: 0,
          moonrise: 0,
          moonset: 0,
          temp: {
            day: f.temp_day,
            min: f.temp_min,
            max: f.temp_max,
            night: f.temp_min,
            eve: f.temp_day,
            morn: f.temp_day
          },
          feelsLike: {
            day: f.temp_day,
            night: f.temp_min,
            eve: f.temp_day,
            morn: f.temp_day
          },
          pressure: f.pressure,
          humidity: f.humidity,
          windSpeed: f.speed,
          windDeg: f.deg,
          weather: [{
            id: 0,
            main: f.weather_main,
            description: f.weather_description,
            icon: f.weather_icon
          }],
          clouds: f.clouds,
          pop: f.pop / 100,
          rain: f.rain,
          snow: f.snow
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Handle specific API errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401) throw new Error('Invalid OpenWeatherMap API key');
        if (status === 404) throw new Error('Forecast data not available for given coordinates');
        if (status === 429) throw new Error('API rate limit exceeded');
        throw new Error('OpenWeatherMap API error: ' + error.response.statusText);
      }
      throw new Error('Failed to fetch weather forecast: ' + error.message);
    }
  }

  /**
   * Get weather data by city name (alternative to coordinates)
   * @param {string} cityName - Name of the city
   * @param {string} stateCode - State code (optional, for US)
   * @param {string} countryCode - Country code (optional)
   * @returns {Promise<Object>} Weather data
   */
  async getWeatherByCity(cityName, stateCode = '', countryCode = '') {
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured. Please set OPENWEATHER_API_KEY in .env');
    }

    if (!cityName || typeof cityName !== 'string') {
      throw new Error('City name is required and must be a string');
    }

    // Build query string
    let query = cityName.trim();
    if (stateCode) query += ",";
    if (countryCode) query += ",";

    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          q: query,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const data = response.data;
      
      return {
        success: true,
        data: {
          temperature: data.main.temp,
          feels_like: data.main.feels_like,
          temp_min: data.main.temp_min,
          temp_max: data.main.temp_max,
          pressure: data.main.pressure,
          humidity: data.main.humidity,
          wind_speed: data.wind.speed,
          wind_deg: data.wind.deg,
          weather_main: data.weather[0].main,
          weather_description: data.weather[0].description,
          weather_icon: data.weather[0].icon,
          clouds: data.clouds.all,
          rain_1h: data.rain ? data.rain['1h'] : 0,
          snow_1h: data.snow ? data.snow['1h'] : 0,
          dt: data.dt,
          sunrise: data.sys.sunrise,
          sunset: data.sys.sunset,
          timezone: data.timezone,
          city_name: data.name,
          country_code: data.sys.country
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401) throw new Error('Invalid OpenWeatherMap API key');
        if (status === 404) throw new Error('City not found');
        if (status === 429) throw new Error('API rate limit exceeded');
        throw new Error('OpenWeatherMap API error: ' + error.response.statusText);
      }
      throw new Error('Failed to fetch weather data for city: ' + error.message);
    }
  }

  /**
   * Check if weather service is properly configured
   * @returns {boolean} True if configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

export default new WeatherService();


