// services/piperTtsService.js
import { spawn } from 'node:child_process';
import path from 'path'
import fs from 'fs'
import util from 'util'
import 'dotenv/config';

/**
 * Piper TTS Service - Local, offline text-to-speech using Piper
 * Provides text-to-speech functionality without requiring internet connectivity
 */
class PiperTtsService {
  constructor() {
    // Check if Piper is available
    this.piperPath = process.env.PIPER_PATH || this.findPiperExecutable();
    this.modelPath = process.env.PIPER_MODEL_PATH || this.findDefaultModel();
    this.isAvailable = this.checkPiperAvailability();
    
    // Piper TTS is optional - only warn if explicitly needed
    // if (!this.isAvailable) {
    //   console.warn('Warning: Piper TTS is not properly configured. Please set PIPER_PATH and PIPER_MODEL_PATH in .env');
    // }
  }

  /**
   * Find Piper executable in common locations
   * @returns {string|null} Path to Piper executable or null if not found
   */
  findPiperExecutable() {
    const possiblePaths = [
      // Common installation locations
      '/usr/local/bin/piper',
      '/usr/bin/piper',
      './node_modules/.bin/piper',
      // Relative to project
      './piper',
      './piper.exe',
      // Windows locations
      'C:\\Program Files\\Piper\\piper.exe',
      'C:\\piper\\piper.exe'
    ];
    
    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path) && fs.statSync(path).isFile()) {
          return path;
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
    return null;
  }

  /**
   * Find a default model file
   * @returns {string|null} Path to model file or null if not found
   */
  findDefaultModel() {
    // Look for common model locations
    const possibleModelPaths = [
      './models/en_US-lessac-medium.onnx',
      './models/en_US-lessac-medium.onnx.json',
      './models/en_US-lessac-medium.onnx',
      './models/en-US-lessac-medium.onnx',
      './models/en-US-lessac-medium.onnx.json'
    ];
    
    for (const modelPath of possibleModelPaths) {
      try {
        if (fs.existsSync(modelPath)) {
          return modelPath;
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
    return null;
  }

  /**
   * Check if Piper TTS is available and properly configured
   * @returns {boolean} True if Piper is available
   */
  checkPiperAvailability() {
    if (!this.piperPath || !this.modelPath) {
      return false;
    }
    
    try {
      // Check if both files exist and are accessible
      return fs.existsSync(this.piperPath) && 
             fs.statSync(this.piperPath).isFile() &&
             fs.existsSync(this.modelPath) && 
             (fs.statSync(this.modelPath).isFile() || 
              fs.existsSync(`${this.modelPath}.json`));
    } catch (e) {
      return false;
    }
  }

  /**
   * Convert text to speech using Piper TTS
   * @param {string} text - Text to convert to speech
   * @param {Object} options - Voice and audio configuration options
   * @returns {Promise<Object>} Result containing audio content and metadata
   */
  async synthesizeSpeech(text, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Piper TTS is not available. Please check your installation and configuration.');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    // Set default options
    const opts = {
      speaker: options.speaker || 0,
      length_scale: options.length_scale || 1.0,
      noise_scale: options.noise_scale || 0.667,
      noise_w: options.noise_w || 0.8,
      sample_rate: options.sample_rate || 22050,
      ...options
    };

    return new Promise((resolve, reject) => {
      try {
        // Create temporary file for output
        const outputPath = `/tmp/tts_output_${Date.now()}.wav`;
        
        // Build Piper command
        const args = [
          '--model', this.modelPath,
          '--output_file', outputPath,
          '--speaker', opts.speaker.toString(),
          '--length-scale', opts.length_scale.toString(),
          '--noise-scale', opts.noise_scale.toString(),
          '--noise-w', opts.noise_w.toString()
        ];

        // Add sample rate if specified and different from default
        if (opts.sample_rate && opts.sample_rate !== 22050) {
          args.push('--sample-rate');
          args.push(opts.sample_rate.toString());
        }

        // Spawn Piper process
        const piperProcess = spawn(this.piperPath, args);
        
        let stdoutData = '';
        let stderrData = '';

        // Handle stdout
        piperProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });

        // Handle stderr
        piperProcess.stderr.on('data', (data) => {
          stderrData += data.toString();
        });

        // Handle process completion
        piperProcess.on('close', (code) => {
          if (code !== 0) {
            // Clean up temp file on error
            try { fs.unlinkSync(outputPath); } catch (e) {}
            reject(new Error(`Piper TTS process failed with code ${code}: ${stderrData}`));
            return;
          }

          // Read the generated audio file
          fs.readFile(outputPath, (err, audioData) => {
            // Clean up temp file
            try { 
              fs.unlinkSync(outputPath); 
            } catch (e) {
              // Ignore cleanup errors
            }
            
            if (err) {
              reject(new Error(`Failed to read generated audio file: ${err.message}`));
              return;
            }

            // Determine MIME type based on sample rate
            const mimeType = `audio/wav`; // WAV format
            
            resolve({
              success: true,
              audioContent: audioData, // Binary audio data (WAV format)
              mimeType: mimeType,
              sampleRate: opts.sample_rate || 22050,
              duration: Math.ceil((audioData.length - 44) / (2 * (opts.sample_rate || 22050))), // Rough estimate for 16-bit mono
              text: text
            });
          });
        });

        // Handle process errors
        piperProcess.on('error', (err) => {
          // Clean up temp file on error
          try { 
            fs.unlinkSync(outputPath); 
          } catch (e) {}
          reject(new Error(`Failed to start Piper TTS process: ${err.message}`));
        });

        // Write text to stdin
        piperProcess.stdin.write(text);
        piperProcess.stdin.end();

      } catch (err) {
        reject(new Error(`Failed to initiate TTS synthesis: ${err.message}`));
      }
    });
  }

  /**
   * Save audio content to file (helper method)
   * @param {Buffer} audioContent - Binary audio data
   * @param {string} filePath - Path to save the audio file
   * @returns {Promise<void>}
   */
  async saveAudioToFile(audioContent, filePath) {
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(filePath, audioContent, 'binary');
  }

  /**
   * Check if Piper TTS service is properly configured
   * @returns {boolean} True if configured
   */
  isConfigured() {
    return this.isAvailable;
  }
}

export default new PiperTtsService();

