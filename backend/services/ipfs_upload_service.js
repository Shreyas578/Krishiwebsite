/**
 * KISAN AI - IPFS Upload Service with Pinata Integration
 * Handles image uploads to IPFS via Pinata API
 * 
 * Features:
 * - Image upload with compression
 * - Automatic IPFS hash generation
 * - Caching of IPFS hashes
 * - Support for batch uploads
 * - Fallback to local storage if Pinata fails
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class IPFSUploadService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud';
    this.isConfigured = !!this.pinataApiKey && !!this.pinataSecretKey;
    this.uploadedHashes = new Map(); // Cache for uploaded file hashes
    this.localStoragePath = './uploads/ipfs';

    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  /**
   * Upload image buffer to IPFS via Pinata
   * 
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {Object} options - Upload options
   * @param {String} options.filename - Original filename
   * @param {String} options.farmId - Farm ID (for organizing)
   * @param {String} options.uploadType - Type of upload (disease, marketplace, crop, etc.)
   * @returns {Promise<Object>} - { ipfsHash, gatewayUrl, localPath, uploadedAt }
   */
  async uploadImage(imageBuffer, options = {}) {
    try {
      const {
        filename = `image_${uuidv4()}.jpg`,
        farmId = 'unknown',
        uploadType = 'general',
      } = options;

      console.log(`[IPFS] Starting image upload: ${filename}`);

      // Try Pinata first if configured
      if (this.isConfigured) {
        try {
          const result = await this._uploadToPinata(imageBuffer, filename, uploadType);
          console.log(`[IPFS] ✅ Image uploaded to Pinata: ${result.ipfsHash}`);
          return result;
        } catch (pinataErr) {
          console.warn(`[IPFS] Pinata upload failed, falling back to local storage:`, pinataErr.message);
        }
      }

      // Fallback to local storage
      const result = await this._uploadToLocal(imageBuffer, filename, farmId, uploadType);
      console.log(`[IPFS] ✅ Image uploaded locally: ${result.localPath}`);
      return result;

    } catch (err) {
      console.error('[IPFS] Error uploading image:', err.message);
      throw err;
    }
  }

  /**
   * Upload multiple images
   * 
   * @param {Array<Buffer>} imageBuffers - Array of image buffers
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultipleImages(imageBuffers, options = {}) {
    try {
      console.log(`[IPFS] Starting batch upload of ${imageBuffers.length} images`);

      const uploadPromises = imageBuffers.map((buffer, index) =>
        this.uploadImage(buffer, {
          ...options,
          filename: options.filename 
            ? `${options.filename.split('.')[0]}_${index}.jpg`
            : `batch_${index}_${uuidv4()}.jpg`,
        })
      );

      const results = await Promise.all(uploadPromises);
      console.log(`[IPFS] ✅ Batch upload completed: ${results.length} images`);
      return results;

    } catch (err) {
      console.error('[IPFS] Error uploading multiple images:', err.message);
      throw err;
    }
  }

  /**
   * Upload to Pinata IPFS
   * @private
   */
  async _uploadToPinata(imageBuffer, filename, uploadType) {
    try {
      const form = new FormData();
      form.append('file', imageBuffer, filename);

      // Add metadata
      const metadata = {
        name: filename,
        keyvalues: {
          uploadType,
          uploadedAt: new Date().toISOString(),
          app: 'kisan-ai',
        },
      };

      form.append('pinataMetadata', JSON.stringify(metadata));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (!response.data.IpfsHash) {
        throw new Error('No IPFS hash in response');
      }

      const ipfsHash = response.data.IpfsHash;
      const gatewayUrl = `${this.ipfsGateway}/ipfs/${ipfsHash}`;

      // Cache the hash
      this.uploadedHashes.set(ipfsHash, {
        filename,
        uploadType,
        uploadedAt: new Date(),
        pinned: true,
      });

      return {
        ipfsHash,
        gatewayUrl,
        uploadedAt: new Date(),
        source: 'pinata',
        filename,
      };

    } catch (err) {
      console.error('[IPFS/Pinata] Error:', err.message);
      throw err;
    }
  }

  /**
   * Fallback upload to local storage
   * @private
   */
  async _uploadToLocal(imageBuffer, filename, farmId, uploadType) {
    try {
      const uploadDir = path.join(this.localStoragePath, uploadType, farmId);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const localFilename = `${Date.now()}_${filename}`;
      const localPath = path.join(uploadDir, localFilename);
      const relativePath = path.relative('./backend', localPath);

      fs.writeFileSync(localPath, imageBuffer);

      // Generate a pseudo-IPFS hash for local storage reference
      const pseudoHash = `local_${uploadType}_${farmId}_${Date.now()}`;

      // Cache the local reference
      this.uploadedHashes.set(pseudoHash, {
        filename: localFilename,
        uploadType,
        uploadedAt: new Date(),
        localPath: relativePath,
        pinned: false,
      });

      return {
        ipfsHash: pseudoHash,
        localPath: relativePath,
        uploadedAt: new Date(),
        source: 'local',
        filename: localFilename,
        absolutePath: localPath,
      };

    } catch (err) {
      console.error('[IPFS/Local] Error:', err.message);
      throw err;
    }
  }

  /**
   * Get image from IPFS or local storage
   */
  async getImage(ipfsHash) {
    try {
      const cached = this.uploadedHashes.get(ipfsHash);

      if (!cached) {
        throw new Error(`Image hash not found in cache: ${ipfsHash}`);
      }

      if (cached.pinned) {
        // Return Pinata gateway URL
        return {
          url: `${this.ipfsGateway}/ipfs/${ipfsHash}`,
          source: 'pinata',
          hash: ipfsHash,
        };
      } else {
        // Return local path
        return {
          path: cached.localPath,
          source: 'local',
          hash: ipfsHash,
        };
      }

    } catch (err) {
      console.error('[IPFS] Error retrieving image:', err.message);
      throw err;
    }
  }

  /**
   * Upload and create metadata JSON to IPFS
   * For storing receipts, reports, etc.
   */
  async uploadJSON(jsonData, options = {}) {
    try {
      const {
        filename = `data_${uuidv4()}.json`,
        uploadType = 'metadata',
      } = options;

      console.log(`[IPFS] Uploading JSON metadata: ${filename}`);

      const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2));

      // Upload via Pinata if configured
      if (this.isConfigured) {
        try {
          const form = new FormData();
          form.append('file', jsonBuffer, filename);

          const metadata = {
            name: filename,
            keyvalues: {
              uploadType,
              uploadedAt: new Date().toISOString(),
              app: 'kisan-ai',
            },
          };

          form.append('pinataMetadata', JSON.stringify(metadata));

          const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            form,
            {
              headers: {
                ...form.getHeaders(),
                'pinata_api_key': this.pinataApiKey,
                'pinata_secret_api_key': this.pinataSecretKey,
              },
              timeout: 30000,
            }
          );

          const ipfsHash = response.data.IpfsHash;
          console.log(`[IPFS] ✅ JSON uploaded to Pinata: ${ipfsHash}`);

          return {
            ipfsHash,
            gatewayUrl: `${this.ipfsGateway}/ipfs/${ipfsHash}`,
            uploadedAt: new Date(),
            source: 'pinata',
          };

        } catch (pinataErr) {
          console.warn('[IPFS] Pinata JSON upload failed, using local fallback');
        }
      }

      // Local fallback
      const uploadDir = path.join(this.localStoragePath, uploadType);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const localFilename = `${Date.now()}_${filename}`;
      const localPath = path.join(uploadDir, localFilename);
      const relativePath = path.relative('./backend', localPath);

      fs.writeFileSync(localPath, jsonBuffer);

      const pseudoHash = `local_json_${Date.now()}`;

      return {
        ipfsHash: pseudoHash,
        localPath: relativePath,
        uploadedAt: new Date(),
        source: 'local',
      };

    } catch (err) {
      console.error('[IPFS] Error uploading JSON:', err.message);
      throw err;
    }
  }

  /**
   * Get upload status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      provider: this.isConfigured ? 'pinata' : 'local',
      uploadedCount: this.uploadedHashes.size,
      gateway: this.ipfsGateway,
    };
  }

  /**
   * Get all cached uploads
   */
  getCachedUploads(uploadType = null) {
    if (!uploadType) {
      return Array.from(this.uploadedHashes.entries());
    }

    return Array.from(this.uploadedHashes.entries()).filter(
      ([, data]) => data.uploadType === uploadType
    );
  }
}

export default new IPFSUploadService();
