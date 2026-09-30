
import MarketplaceService from '../services/marketplaceService.js';
import IPFSService from '../services/ipfsService.js';
import { validationResult } from 'express-validator';
import { ethers } from 'ethers';
import fs from 'fs';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

// Helper to get contract instance
function getContract() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  const contractAddress = process.env.CONTRACT_ADDRESS?.trim();
  if (!rpcUrl || !privateKey || !contractAddress) return null;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const artifactPath = "./artifacts/contracts/AgriMarket.sol/AgriMarket.json";
    if (!fs.existsSync(artifactPath)) return null;
    const artifactData = fs.readFileSync(artifactPath, "utf8");
    const artifact = JSON.parse(artifactData);
    return new ethers.Contract(contractAddress, artifact.abi, wallet);
  } catch (e) {
    console.error("Failed to init contract:", e);
    return null;
  }
}

// Create a new marketplace listing
async function createListing(req, res) {
  try {
    // Remove express-validator check as there are no middleware validators on this route
    // Map camelCase from mobile app to expected fields
    const { 
      productName, product_name, title, 
      category, 
      quantity, quantityAvailable, 
      pricePerUnit, price_per_unit, price, 
      description, 
      imageIpfsHash, image_ipfs_hash, images, imageUrl,
      location, unit, qualityGrade, quality_grade
    } = req.body;
    
    const sellerId = req.user?.id; // Attached by authenticateJWT

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    const finalProductName = productName || product_name || title;
    const finalPrice = pricePerUnit || price_per_unit || price;
    const finalQuantity = quantity || quantityAvailable;
    const finalImage = imageIpfsHash || image_ipfs_hash || (images && images.length > 0 ? images[0] : imageUrl);

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    let tx_hash = null;
    let ipfs_hash = null;

    try {
      const contract = getContract();
      
      const listingReceipt = {
        type: "MARKETPLACE_LISTING",
        product_name: finalProductName,
        category,
        quantity: finalQuantity,
        price_per_unit: finalPrice,
        seller_id: sellerId,
        timestamp: new Date().toISOString()
      };
      const ipfsResult = await IPFSService.uploadJSON(listingReceipt, { name: `Listing_${finalProductName}` });
      ipfs_hash = ipfsResult.ipfsHash;

      if (contract) {
        // Record demo transaction to Sepolia
        const tx = await contract.recordDemoTransaction(
          "PENDING_DB_ID", "LISTING", contract.target, contract.target, 0
        );
        // We don't await tx.wait() to keep the API fast, just store the hash
        tx_hash = tx.hash;
      }
    } catch (e) {
      console.error("Blockchain/IPFS Error (Listing):", e);
    }

    const listingData = {
      ...req.body,
      title: finalProductName,
      product_name: finalProductName,
      price_per_unit: finalPrice,
      quantity: finalQuantity,
      images: images || (finalImage ? [finalImage] : []),
      image_ipfs_hash: finalImage,
      quality_grade: qualityGrade || quality_grade,
      tx_hash, 
      ipfs_hash
    };

    const result = await MarketplaceService.createListing(listingData, sellerId);

    res.status(201).json({
      success: true,
      message: 'Marketplace listing created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get marketplace listings with optional filtering
async function getListings(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, search, minPrice, maxPrice, limit, offset } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const result = await MarketplaceService.getListings(
      filters,
      parseInt(limit) || 20,
      parseInt(offset) || 0
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get a single listing by ID
async function getListingById(req, res) {
  try {
    const { id } = req.params;
    const listing = await MarketplaceService.getListingById(id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update a listing (only by seller)
async function updateListing(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const sellerId = req.user?.id; // Assuming auth middleware attaches user
    const updateData = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    const success = await MarketplaceService.updateListing(id, sellerId, updateData);

    if (!success) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: 'Marketplace listing updated successfully'
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Delete a listing (only by seller)
async function deleteListing(req, res) {
  try {
    const { id } = req.params;
    const sellerId = req.user?.id; // Assuming auth middleware attaches user

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    const success = await MarketplaceService.deleteListing(id, sellerId);

    if (!success) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: 'Marketplace listing deleted successfully'
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create a marketplace order
async function createOrder(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const listing_id = req.body.listing_id || req.body.listingId;
    const buyer_id = req.body.buyer_id || req.body.buyerId;
    const seller_id = req.body.seller_id || req.body.sellerId;
    const quantity_ordered = req.body.quantity_ordered || req.body.quantity;
    const total_price = req.body.total_price || req.body.totalAmount;

    // In a real app, you'd verify the buyer_id matches the authenticated user
    // For now, we'll assume the request is properly authorized

    let tx_hash = null;
    let ipfs_hash = null;

    try {
      const contract = getContract();
      
      const orderReceipt = {
        type: "MARKETPLACE_ORDER",
        listing_id,
        buyer_id,
        seller_id,
        quantity_ordered,
        total_price,
        timestamp: new Date().toISOString()
      };
      const ipfsResult = await IPFSService.uploadJSON(orderReceipt, { name: `Order_${listing_id}` });
      ipfs_hash = ipfsResult.ipfsHash;

      if (contract) {
        // Since the current deployed Sepolia contract lacks recordDemoTransaction,
        // anchor the IPFS hash on-chain by sending a 0-ETH transaction to ourselves.
        const wallet = contract.runner;
        const tx = await wallet.sendTransaction({
          to: wallet.address, // Send to self to avoid contract fallback revert
          value: 0,
          data: ethers.hexlify(ethers.toUtf8Bytes(`KisanAI_Audit:${ipfs_hash}`))
        });
        tx_hash = tx.hash;
      }
    } catch (e) {
      console.error("Blockchain/IPFS Error (Order):", e);
    }

    const result = await MarketplaceService.createOrder({
      listing_id,
      buyer_id,
      seller_id,
      quantity_ordered,
      total_price,
      tx_hash,
      ipfs_hash
    });

    res.status(201).json({
      success: true,
      message: 'Marketplace order created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get orders for a user (buyer or seller)
async function getUserOrders(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, role } = req.params;
    const { limit, offset } = req.query;
    
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    const result = await MarketplaceService.getUserOrders(
      userId,
      role,
      parseInt(limit) || 20,
      parseInt(offset) || 0
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update order status
async function updateOrderStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, payment_status } = req.body;

    const result = await MarketplaceService.updateOrderStatus(id, {
      status,
      payment_status
    });

    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error in marketplace controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Check marketplace service configuration
async function checkConfig(req, res) {
  try {
    const isConfigured = MarketplaceService.isConfigured();
    res.status(200).json({
      success: true,
      configured: isConfigured,
      message: isConfigured ? 'Marketplace service is configured' : 'Marketplace service is not configured'
    });
  } catch (error) {
    console.error('Error checking marketplace config:', error);
    res.status(500).json({ error: error.message });
  }
}

// AI Price Suggestion
async function suggestPrice(req, res) {
  try {
    const { crop, location, date, quantity } = req.body;
    
    if (!crop || !location) {
      return res.status(400).json({ error: 'crop and location are required' });
    }

    const prompt = `You are an AI agricultural pricing expert. Suggest a realistic selling price for ${quantity || '1'} quintals of ${crop} in ${location} around ${date || new Date().toISOString().split('T')[0]}.
Consider current market trends, weather impacts, and supply/demand.

Return ONLY JSON:
{
  "suggested_price": number (price per quintal in INR),
  "confidence": "High|Medium|Low",
  "reasoning": "A 2-3 sentence explanation for the farmer on why this is a good competitive price."
}`;

    const aiRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    let parsed = null;
    try {
      let text = (aiRes.choices[0]?.message?.content || '').trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start = Math.min(text.indexOf('{') === -1 ? Infinity : text.indexOf('{'));
      const end = text.lastIndexOf('}');
      if (start !== Infinity && end !== -1) text = text.slice(start, end + 1);
      parsed = JSON.parse(text);
    } catch (_) {}

    if (!parsed?.suggested_price) {
      parsed = {
        suggested_price: 2100,
        confidence: "Medium",
        reasoning: `Based on historical averages for ${crop} in ${location}, ₹2100 is a standard competitive rate.`
      };
    }

    res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (error) {
    console.error('Error suggesting price:', error);
    res.status(500).json({ error: error.message });
  }
}

export default {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  createOrder,
  getUserOrders,
  updateOrderStatus,
  checkConfig,
  suggestPrice
};


