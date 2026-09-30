import db from '../config/db.js';

// Get all crops list
async function getAllCrops(req, res) {
  try {
    // Query database for crops
    const [crops] = await db.query(
      'SELECT id, name FROM crop_master ORDER BY name'
    );

    if (!crops || crops.length === 0) {
      // If database is empty, return hardcoded list as fallback
      const fallbackCrops = [
        // Cereals
        { id: 1, name: 'Rice', hindi: 'चावल', marathi: 'तांदूळ', season: 'Kharif', water_needed: 'High' },
        { id: 2, name: 'Wheat', hindi: 'गेहूं', marathi: 'गहू', season: 'Rabi', water_needed: 'Medium' },
        { id: 3, name: 'Maize', hindi: 'मक्का', marathi: 'मक्याचे', season: 'Kharif', water_needed: 'Medium' },
        { id: 4, name: 'Bajra', hindi: 'बाजरा', marathi: 'बाजरा', season: 'Kharif', water_needed: 'Low' },
        { id: 5, name: 'Jowar', hindi: 'ज्वार', marathi: 'ज्वार', season: 'Kharif', water_needed: 'Low' },
        { id: 6, name: 'Barley', hindi: 'जौ', marathi: 'जव', season: 'Rabi', water_needed: 'Low' },

        // Pulses
        { id: 7, name: 'Chickpea', hindi: 'चने', marathi: 'हरभरा', season: 'Rabi', water_needed: 'Low' },
        { id: 8, name: 'Lentil', hindi: 'मसूर', marathi: 'मसूर', season: 'Rabi', water_needed: 'Low' },
        { id: 9, name: 'Pigeonpea', hindi: 'अरहर', marathi: 'तूर', season: 'Kharif', water_needed: 'Low' },
        { id: 10, name: 'Moong', hindi: 'मूंग', marathi: 'मूग', season: 'Kharif', water_needed: 'Medium' },
        { id: 11, name: 'Urad', hindi: 'उड़द', marathi: 'उडीद', season: 'Kharif', water_needed: 'Medium' },

        // Oilseeds
        { id: 12, name: 'Soybean', hindi: 'सोयाबीन', marathi: 'सोयाबीन', season: 'Kharif', water_needed: 'Medium' },
        { id: 13, name: 'Groundnut', hindi: 'मूंगफली', marathi: 'शेंगदाणे', season: 'Kharif', water_needed: 'Low' },
        { id: 14, name: 'Sesame', hindi: 'तिल', marathi: 'तीळ', season: 'Kharif', water_needed: 'Low' },
        { id: 15, name: 'Sunflower', hindi: 'सूरजमुखी', marathi: 'सूरजमुखी', season: 'Rabi', water_needed: 'Medium' },
        { id: 16, name: 'Safflower', hindi: 'कुसुम', marathi: 'कुसुम', season: 'Rabi', water_needed: 'Low' },

        // Cash Crops
        { id: 17, name: 'Cotton', hindi: 'कपास', marathi: 'कापूस', season: 'Kharif', water_needed: 'High' },
        { id: 18, name: 'Sugarcane', hindi: 'गन्ना', marathi: 'ऊख', season: 'Year-round', water_needed: 'High' },
        { id: 19, name: 'Tobacco', hindi: 'तम्बाकू', marathi: 'तंबाखू', season: 'Rabi', water_needed: 'Medium' },
        { id: 20, name: 'Jute', hindi: 'पटसन', marathi: 'पेट', season: 'Kharif', water_needed: 'High' },

        // Vegetables
        { id: 21, name: 'Tomato', hindi: 'टमाटर', marathi: 'टोमॅटो', season: 'Year-round', water_needed: 'High' },
        { id: 22, name: 'Onion', hindi: 'प्याज', marathi: 'कांदा', season: 'Rabi', water_needed: 'Medium' },
        { id: 23, name: 'Potato', hindi: 'आलू', marathi: 'बटाटा', season: 'Rabi', water_needed: 'Medium' },
        { id: 24, name: 'Brinjal', hindi: 'बैंगन', marathi: 'वांग', season: 'Year-round', water_needed: 'Medium' },
        { id: 25, name: 'Cabbage', hindi: 'पत्तागोभी', marathi: 'कोबी', season: 'Rabi', water_needed: 'Medium' },
        { id: 26, name: 'Cauliflower', hindi: 'फूलगोभी', marathi: 'फुलकोबी', season: 'Rabi', water_needed: 'Medium' },
        { id: 27, name: 'Carrot', hindi: 'गाजर', marathi: 'गाजर', season: 'Rabi', water_needed: 'Medium' },
        { id: 28, name: 'Beet', hindi: 'चुकंदर', marathi: 'बीट', season: 'Rabi', water_needed: 'Medium' },
        { id: 29, name: 'Pumpkin', hindi: 'कद्दू', marathi: 'भोपळा', season: 'Kharif', water_needed: 'Medium' },
        { id: 30, name: 'Bottle Gourd', hindi: 'लौकी', marathi: 'भोपळा', season: 'Kharif', water_needed: 'Medium' },
        { id: 31, name: 'Bitter Gourd', hindi: 'करेला', marathi: 'करळे', season: 'Kharif', water_needed: 'Medium' },
        { id: 32, name: 'Cucumber', hindi: 'खीरा', marathi: 'काकडी', season: 'Kharif', water_needed: 'High' },
        { id: 33, name: 'Chilli', hindi: 'मिर्च', marathi: 'मिरच', season: 'Year-round', water_needed: 'Medium' },
        { id: 34, name: 'Okra', hindi: 'भिंडी', marathi: 'भेंडी', season: 'Kharif', water_needed: 'Medium' },
        { id: 35, name: 'Peas', hindi: 'मटर', marathi: 'मटार', season: 'Rabi', water_needed: 'Low' },

        // Fruits
        { id: 36, name: 'Mango', hindi: 'आम', marathi: 'आंबा', season: 'Year-round', water_needed: 'Medium' },
        { id: 37, name: 'Banana', hindi: 'केला', marathi: 'केळी', season: 'Year-round', water_needed: 'High' },
        { id: 38, name: 'Apple', hindi: 'सेब', marathi: 'सफरचंद', season: 'Year-round', water_needed: 'Medium' },
        { id: 39, name: 'Grapes', hindi: 'अंगूर', marathi: 'द्राक्ष', season: 'Year-round', water_needed: 'Medium' },
        { id: 40, name: 'Citrus', hindi: 'खट्टे फल', marathi: 'लिंबू', season: 'Year-round', water_needed: 'Medium' },
        { id: 41, name: 'Papaya', hindi: 'पपीता', marathi: 'पपई', season: 'Year-round', water_needed: 'Medium' },
        { id: 42, name: 'Pineapple', hindi: 'अनानास', marathi: 'अनारस', season: 'Year-round', water_needed: 'High' },
        { id: 43, name: 'Watermelon', hindi: 'तरबूज', marathi: 'टरबूज', season: 'Kharif', water_needed: 'High' },
        { id: 44, name: 'Muskmelon', hindi: 'खरबूजा', marathi: 'खरबूज', season: 'Kharif', water_needed: 'High' },
        { id: 45, name: 'Guava', hindi: 'अमरूद', marathi: 'पेरू', season: 'Year-round', water_needed: 'Low' },

        // Spices
        { id: 46, name: 'Turmeric', hindi: 'हल्दी', marathi: 'हळद', season: 'Kharif', water_needed: 'Medium' },
        { id: 47, name: 'Black Pepper', hindi: 'काली मिर्च', marathi: 'मिरी', season: 'Year-round', water_needed: 'High' },
        { id: 48, name: 'Cardamom', hindi: 'इलायची', marathi: 'इलायची', season: 'Year-round', water_needed: 'High' },
        { id: 49, name: 'Cinnamon', hindi: 'दालचीनी', marathi: 'दालचिनी', season: 'Year-round', water_needed: 'Medium' },
        { id: 50, name: 'Clove', hindi: 'लौंग', marathi: 'लवंग', season: 'Year-round', water_needed: 'High' },
        { id: 51, name: 'Garlic', hindi: 'लहसुन', marathi: 'लसूण', season: 'Rabi', water_needed: 'Medium' },
        { id: 52, name: 'Ginger', hindi: 'अदरक', marathi: 'आले', season: 'Kharif', water_needed: 'High' },
        { id: 53, name: 'Coriander', hindi: 'धनिया', marathi: 'कोथिंबीर', season: 'Rabi', water_needed: 'Low' },
        { id: 54, name: 'Cumin', hindi: 'जीरा', marathi: 'जिरे', season: 'Rabi', water_needed: 'Low' },

        // Herbs
        { id: 55, name: 'Mint', hindi: 'पुदीना', marathi: 'फुदीना', season: 'Year-round', water_needed: 'Medium' },
        { id: 56, name: 'Basil', hindi: 'तुलसी', marathi: 'तुळसी', season: 'Year-round', water_needed: 'Medium' },

        // Fodder
        { id: 57, name: 'Alfalfa', hindi: 'रिजका', marathi: 'रिजका', season: 'Year-round', water_needed: 'Medium' },
        { id: 58, name: 'Clover', hindi: 'क्लोवर', marathi: 'क्लोव्हर', season: 'Rabi', water_needed: 'Low' },
      ];

      return res.status(200).json({
        success: true,
        data: fallbackCrops,
        note: 'Returning fallback crops. Database is empty. Run schema initialization.'
      });
    }

    res.status(200).json({
      success: true,
      data: crops
    });
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get crop details
async function getCropDetails(req, res) {
  try {
    const { cropId } = req.params;

    const cropDetails = {
      1: { name: 'Rice', hindi: 'चावल', temp: '20-30°C', rainfall: '1500-2250mm', growth_period: '120-150 days', varieties: ['Basmati', 'Jasmine', 'Sona Masuri', 'PR-106'] },
      2: { name: 'Wheat', hindi: 'गेहूं', temp: '10-22°C', rainfall: '750-1000mm', growth_period: '120-150 days', varieties: ['HD-2329', 'PBW-343', 'WH-1105', 'C-306'] },
      3: { name: 'Maize', hindi: 'मक्का', temp: '21-27°C', rainfall: '500-750mm', growth_period: '80-120 days', varieties: ['Hybrid', 'DHM-117', 'Arjun', 'Pratap'] },
      4: { name: 'Bajra', hindi: 'बाजरा', temp: '25-35°C', rainfall: '300-600mm', growth_period: '70-80 days', varieties: ['HB-226', 'Kaveri', 'Sukanya'] },
      5: { name: 'Jowar', hindi: 'ज्वार', temp: '20-30°C', rainfall: '500-900mm', growth_period: '90-110 days', varieties: ['CSH-25', 'M-35-1', 'Narendra Jowar'] },
    };

    const details = cropDetails[cropId] || {
      error: 'Crop details not found',
      cropId
    };

    res.status(200).json({
      success: !!cropDetails[cropId],
      data: details
    });
  } catch (error) {
    console.error('Error fetching crop details:', error);
    res.status(500).json({ error: error.message });
  }
}

export {
  getAllCrops,
  getCropDetails
};
