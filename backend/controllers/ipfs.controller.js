/**
 * KISAN AI - IPFS Controller
 * Handles image uploads and IPFS management endpoints
 */

import ipfsService from '../services/ipfs_upload_service.js';
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload image(s) to IPFS
 * POST /api/ipfs/upload
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const { farmId = 'unknown', uploadType = 'general' } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Upload to IPFS
    const result = await ipfsService.uploadImage(req.file.buffer, {
      filename: req.file.originalname,
      farmId,
      uploadType,
    });

    // Store record in database
    const connection = await getConnection();
    const imageRecordId = uuidv4();

    try {
      await connection.execute(
        `INSERT INTO ipfs_uploads (
          id, user_id, farm_id, ipfs_hash, local_path, upload_type, 
          filename, file_size, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          imageRecordId,
          userId,
          farmId,
          result.ipfsHash,
          result.localPath || null,
          uploadType,
          result.filename,
          req.file.size,
          result.source,
        ]
      );
    } catch (dbErr) {
      console.warn('[IPFS] Database record failed, but IPFS upload succeeded:', dbErr.message);
      // Don't fail the request if DB record fails
    } finally {
      connection.release();
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        localPath: result.localPath,
        filename: result.filename,
        source: result.source,
        recordId: imageRecordId,
      },
    });

  } catch (err) {
    console.error('[IPFS] Upload error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      message: err.message,
    });
  }
}

/**
 * Upload multiple images
 * POST /api/ipfs/upload-batch
 */
async function uploadMultipleImages(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const { farmId = 'unknown', uploadType = 'general' } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Upload all files
    const uploadPromises = req.files.map(file =>
      ipfsService.uploadImage(file.buffer, {
        filename: file.originalname,
        farmId,
        uploadType,
      })
    );

    const results = await Promise.all(uploadPromises);

    // Store records in database
    const connection = await getConnection();

    const uploadedRecords = [];
    try {
      for (const result of results) {
        const imageRecordId = uuidv4();
        const fileSize = req.files[results.indexOf(result)]?.size || 0;

        await connection.execute(
          `INSERT INTO ipfs_uploads (
            id, user_id, farm_id, ipfs_hash, local_path, upload_type, 
            filename, file_size, source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            imageRecordId,
            userId,
            farmId,
            result.ipfsHash,
            result.localPath || null,
            uploadType,
            result.filename,
            fileSize,
            result.source,
          ]
        );

        uploadedRecords.push({
          ipfsHash: result.ipfsHash,
          gatewayUrl: result.gatewayUrl,
          localPath: result.localPath,
          filename: result.filename,
          source: result.source,
          recordId: imageRecordId,
        });
      }
    } catch (dbErr) {
      console.warn('[IPFS] Database records failed, but IPFS uploads succeeded:', dbErr.message);
    } finally {
      connection.release();
    }

    return res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: uploadedRecords,
    });

  } catch (err) {
    console.error('[IPFS] Batch upload error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      message: err.message,
    });
  }
}

/**
 * Upload JSON data to IPFS (for receipts, reports, etc.)
 * POST /api/ipfs/upload-json
 */
async function uploadJSON(req, res) {
  try {
    const { data, uploadType = 'metadata' } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
      });
    }

    // Upload JSON to IPFS
    const result = await ipfsService.uploadJSON(data, { uploadType });

    // Store record in database
    const connection = await getConnection();
    const recordId = uuidv4();

    try {
      await connection.execute(
        `INSERT INTO ipfs_uploads (
          id, user_id, ipfs_hash, local_path, upload_type, 
          filename, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          recordId,
          userId,
          result.ipfsHash,
          result.localPath || null,
          uploadType,
          `${uploadType}_${Date.now()}.json`,
          result.source,
        ]
      );
    } catch (dbErr) {
      console.warn('[IPFS] Database record failed, but IPFS upload succeeded');
    } finally {
      connection.release();
    }

    return res.status(200).json({
      success: true,
      message: 'JSON data uploaded successfully',
      data: {
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        localPath: result.localPath,
        source: result.source,
        recordId,
      },
    });

  } catch (err) {
    console.error('[IPFS] JSON upload error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload JSON',
      message: err.message,
    });
  }
}

/**
 * Get image by IPFS hash
 * GET /api/ipfs/get/:ipfsHash
 */
async function getImage(req, res) {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash required',
      });
    }

    const result = await ipfsService.getImage(ipfsHash);

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (err) {
    console.error('[IPFS] Get image error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve image',
      message: err.message,
    });
  }
}

/**
 * Get IPFS service status
 * GET /api/ipfs/status
 */
async function getStatus(req, res) {
  try {
    const status = ipfsService.getStatus();

    return res.status(200).json({
      success: true,
      data: status,
    });

  } catch (err) {
    console.error('[IPFS] Status error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: err.message,
    });
  }
}

/**
 * Get all uploads by user
 * GET /api/ipfs/uploads
 */
async function getUserUploads(req, res) {
  try {
    const userId = req.user?.id;
    const { uploadType } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const connection = await getConnection();

    let query = 'SELECT * FROM ipfs_uploads WHERE user_id = ?';
    const params = [userId];

    if (uploadType) {
      query += ' AND upload_type = ?';
      params.push(uploadType);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [uploads] = await connection.execute(query, params);
    connection.release();

    return res.status(200).json({
      success: true,
      data: uploads,
    });

  } catch (err) {
    console.error('[IPFS] Get uploads error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve uploads',
      message: err.message,
    });
  }
}

export default {
  uploadImage,
  uploadMultipleImages,
  uploadJSON,
  getImage,
  getStatus,
  getUserUploads,
};
