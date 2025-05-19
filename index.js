/**
 * NetPad MCP Proxy
 * 
 * This module exports utility functions for working with the NetPad MCP proxy.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

// Get the directory name for import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Start the NetPad MCP Proxy server
 * @param {Object} options - Server options
 * @param {number} options.port - Port to run the server on (default: 7777)
 * @param {string} options.netpadUrl - URL of the NetPad server (default: http://localhost:3000)
 * @param {string} options.apiKey - NetPad API key
 * @param {boolean} options.debug - Enable debug logging
 * @returns {Object} - Server process and methods to interact with it
 */
export function startServer(options = {}) {
  const binPath = join(__dirname, 'bin', 'netpad-mcp-proxy.js');
  
  const args = [];
  if (options.port) args.push('--port', options.port);
  if (options.netpadUrl) args.push('--netpad-url', options.netpadUrl);
  if (options.apiKey) args.push('--api-key', options.apiKey);
  if (options.debug) args.push('--debug');
  
  const serverProcess = spawn('node', [binPath, ...args], {
    stdio: ['inherit', 'inherit', 'inherit']
  });
  
  return {
    process: serverProcess,
    
    // Stop the server
    stop() {
      serverProcess.kill();
    },
    
    // Check if server is running
    isRunning() {
      return !serverProcess.killed;
    },
    
    // Get server info (port, URL)
    async getInfo() {
      const port = options.port || 7777;
      try {
        const response = await axios.get(`http://localhost:${port}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to get server info: ${error.message}`);
      }
    }
  };
}

/**
 * Configure the NetPad MCP Proxy
 * @param {Object} options - Configuration options
 * @param {string} options.netpadUrl - URL of the NetPad server
 * @param {string} options.apiKey - NetPad API key
 * @param {number} options.port - Port to run the server on
 * @returns {Promise<Object>} - Configuration result
 */
export async function configure(options = {}) {
  const binPath = join(__dirname, 'bin', 'netpad-mcp-proxy.js');
  
  const args = ['--configure'];
  if (options.netpadUrl) args.push('--netpad-url', options.netpadUrl);
  if (options.apiKey) args.push('--api-key', options.apiKey);
  if (options.port) args.push('--port', options.port);
  
  const configProcess = spawn('node', [binPath, ...args], {
    stdio: ['inherit', 'inherit', 'inherit']
  });
  
  return new Promise((resolve, reject) => {
    configProcess.on('close', code => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Configuration failed with code ${code}`));
      }
    });
  });
}

/**
 * Reset the NetPad MCP Proxy configuration
 * @returns {Promise<Object>} - Reset result
 */
export async function reset() {
  const binPath = join(__dirname, 'bin', 'netpad-mcp-proxy.js');
  
  const resetProcess = spawn('node', [binPath, '--reset'], {
    stdio: ['inherit', 'inherit', 'inherit']
  });
  
  return new Promise((resolve, reject) => {
    resetProcess.on('close', code => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Reset failed with code ${code}`));
      }
    });
  });
}