import PinataSDK from '@pinata/sdk';
import dotenv from 'dotenv';
dotenv.config();

/**
 * IPFS Pinata Service for storing agricultural data and metadata
 * Handles uploading files and JSON data to IPFS via Pinata
 */
class IPFSService {
  constructor() {
    // Initialize Pinata SDK with API keys from environment variables
    this.pinata = new PinataSDK({
      pinataApiKey: process.env.PINATA_API_KEY,
      pinataSecretApiKey: process.env.PINATA_API_SECRET || process.env.PINATA_SECRET_API_KEY
    });

    // Gateway options for accessing pinned content
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.ipfs.io/ipfs/';
  }

  /**
   * Upload a file to IPFS via Pinata
   * @param {Buffer|Stream|File} file - The file to upload
   * @param {Object} options - Pinata pinning options
   * @returns {Promise<Object>} Result containing IPFS hash (cid) and pin size
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate that Pinata is configured
      if (!process.env.PINATA_API_KEY || (!process.env.PINATA_API_SECRET && !process.env.PINATA_SECRET_API_KEY)) {
        throw new Error('Pinata API credentials not configured');
      }

      const result = await this.pinata.pinFileToIPFS(file, {
        pinataMetadata: {
          name: options.name || 'agricultural-file',
          keyvalues: {
            ...options.keyvalues,
            uploadedBy: options.uploadedBy || 'unknown',
            uploadDate: new Date().toISOString(),
            ...(options.category && { category: options.category })
          }
        },
        pinataOptions: {
          cidVersion: 0,
          ...options.pinataOptions
        }
      });

      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: new Date().toISOString(),
        gatewayUrl: `${this.gatewayUrl}${result.IpfsHash}`
      };
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON metadata to IPFS via Pinata
   * @param {Object} metadata - JSON object to upload
   * @param {Object} options - Pinata pinning options
   * @returns {Promise<Object>} Result containing IPFS hash (cid) and pin size
   */
  async uploadJSON(metadata, options = {}) {
    try {
      // Validate that Pinata is configured
      if (!process.env.PINATA_API_KEY || (!process.env.PINATA_API_SECRET && !process.env.PINATA_SECRET_API_KEY)) {
        throw new Error('Pinata API credentials not configured');
      }

      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: options.name || 'agricultural-metadata',
          keyvalues: {
            ...options.keyvalues,
            uploadedBy: options.uploadedBy || 'unknown',
            uploadDate: new Date().toISOString(),
            contentType: options.contentType || 'application/json',
            ...(options.category && { category: options.category })
          }
        },
        pinataOptions: {
          cidVersion: 0,
          ...options.pinataOptions
        }
      });

      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: new Date().toISOString(),
        gatewayUrl: `${this.gatewayUrl}${result.IpfsHash}`
      };
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
    }
  }

  /**
   * Get file information from IPFS using the hash
   * @param {string} ipfsHash - The IPFS hash (CID) to retrieve
   * @returns {Promise<Object>} File information from Pinata
   */
  async getFileInfo(ipfsHash) {
    try {
      if (!ipfsHash) {
        throw new Error('IPFS hash is required');
      }

      const result = await this.pinata.getPinByHash(ipfsHash);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting file info from IPFS:', error);
      throw new Error(`Failed to get file info from IPFS: ${error.message}`);
    }
  }

  /**
   * List pinned items with optional filtering
   * @param {Object} filters - Filter options (status, pinataMetadata keyvalues, etc.)
   * @returns {Promise<Array>} List of pinned items
   */
  async listPinnedItems(filters = {}) {
    try {
      const result = await this.pinata.getPinnedItems({
        pageLimit: 100,
        offset: 0,
        status: filters.status || 'pinned',
        ...(filters.metadataKeyValues && {
          metadataKeyValues: filters.metadataKeyValues
        })
      });

      return {
        success: true,
        count: result.count,
        rows: result.rows
      };
    } catch (error) {
      console.error('Error listing pinned items:', error);
      throw new Error(`Failed to list pinned items: ${error.message}`);
    }
  }

  /**
   * Unpin an item from IPFS (remove from Pinata storage)
   * @param {string} ipfsHash - The IPFS hash (CID) to unpin
   * @returns {Promise<Object>} Result of unpin operation
   */
  async unpin(ipfsHash) {
    try {
      if (!ipfsHash) {
        throw new Error('IPFS hash is required');
      }

      await this.pinata.unpin(ipfsHash);

      return {
        success: true,
        message: `Successfully unpinned ${ipfsHash}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error unpinning from IPFS:', error);
      throw new Error(`Failed to unpin from IPFS: ${error.message}`);
    }
  }

  /**
   * Get a gateway URL for accessing content via IPFS
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @param {Object} options - Gateway options (subdomain gateway, etc.)
   * @returns {string} Gateway URL
   */
  getGatewayUrl(ipfsHash, options = {}) {
    if (!ipfsHash) {
      throw new Error('IPFS hash is required');
    }

    const useSubdomain = options.useSubdomainGateway || false;
    const customGateway = options.customGateway || this.gatewayUrl;

    if (useSubdomain) {
      // Using subdomain gateway: https://{hash}.ipfs.dweb.link/
      return `https://${ipfsHash}.ipfs.dweb.link/`;
    } else {
      // Using path gateway: https://gateway.ipfs.io/ipfs/{hash}
      return `${customGateway.endsWith('/') ? customGateway.slice(0, -1) : customGateway}/ipfs/${ipfsHash}`;
    }
  }

  /**
   * Check if Pinata service is properly configured
   * @returns {boolean} True if configured correctly
   */
  isConfigured() {
    return !!(
      process.env.PINATA_API_KEY &&
      (process.env.PINATA_API_SECRET || process.env.PINATA_SECRET_API_KEY)
    );
  }
}

export default new IPFSService();

