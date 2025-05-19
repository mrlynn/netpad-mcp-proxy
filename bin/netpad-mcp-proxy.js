#!/usr/bin/env node

/**
 * NetPad MCP Proxy Server
 * 
 * This script creates a proxy server that implements the Model-Component-Property (mCP) 
 * protocol for NetPad, enabling integration with code assistants like Cursor.
 * 
 * The proxy forwards requests to a running NetPad instance, adding authentication
 * and caching functionality.
 */

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { program } from 'commander';
import Conf from 'conf';
import axios from 'axios';
import open from 'open';
import prompts from 'prompts';
import process from 'process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name for import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure commander
program
  .name('netpad-mcp-proxy')
  .description('NetPad MCP proxy server for code assistant integration')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port to run the server on', '7777')
  .option('-n, --netpad-url <url>', 'URL of the NetPad server', 'http://localhost:3000')
  .option('-k, --api-key <key>', 'NetPad API key (if not provided, will use stored key or prompt)')
  .option('-c, --configure', 'Configure API key and NetPad URL')
  .option('-d, --debug', 'Enable debug logging')
  .option('--reset', 'Reset configuration')
  .parse();

// Get options from CLI
const options = program.opts();

// Set up configuration storage
const config = new Conf({
  projectName: 'netpad-mcp-proxy',
  defaults: {
    netpadUrl: 'http://localhost:3000',
    apiKey: '',
    port: 7777
  }
});

// Reset config if requested
if (options.reset) {
  config.clear();
  console.log('✅ Configuration reset successfully');
  process.exit(0);
}

// Configure if requested
if (options.configure) {
  (async () => {
    // Prompt for environment selection
    const envResponse = await prompts({
      type: 'select',
      name: 'environment',
      message: 'Which environment do you want to connect to?',
      choices: [
        { title: 'Production (NetPad SaaS)', value: 'production' },
        { title: 'Development (Custom/Local)', value: 'development' }
      ],
      initial: config.get('netpadUrl') && config.get('netpadUrl').includes('localhost') ? 1 : 0
    });

    let netpadUrl = config.get('netpadUrl');
    if (envResponse.environment === 'production') {
      netpadUrl = 'https://api.netpad.ai';
      console.log('\nℹ️  Production selected. The proxy will connect to the NetPad SaaS instance at https://api.netpad.ai.');
      console.log('\u26a0\ufe0f  When using production, keep your API key secure. Do not share it or commit it to source control.');
      console.log('   For best security, use a dedicated API key with the minimum required permissions.');
    } else if (envResponse.environment === 'development') {
      // Prompt for custom URL
      const devUrlResponse = await prompts({
        type: 'text',
        name: 'netpadUrl',
        message: 'Enter the URL of your local or custom NetPad server:',
        initial: netpadUrl || 'http://localhost:3000'
      });
      netpadUrl = devUrlResponse.netpadUrl;
    }

    // Prompt for API key and port
    const responses = await prompts([
      {
        type: 'text',
        name: 'apiKey',
        message: 'NetPad API Key:',
        initial: config.get('apiKey')
      },
      {
        type: 'number',
        name: 'port',
        message: 'Proxy Server Port:',
        initial: config.get('port')
      }
    ]);

    if (netpadUrl) {
      config.set('netpadUrl', netpadUrl);
    }
    if (responses.apiKey) {
      config.set('apiKey', responses.apiKey);
    }
    if (responses.port) {
      config.set('port', responses.port);
    }

    console.log('✅ Configuration saved successfully');
    process.exit(0);
  })();
} else {
  // Update config from command line options if provided
  if (options.netpadUrl) {
    config.set('netpadUrl', options.netpadUrl);
  }
  if (options.apiKey) {
    config.set('apiKey', options.apiKey);
  }
  if (options.port) {
    config.set('port', options.port);
  }

  // Start the proxy server
  startServer();
}

// Function to check configuration and start the server
async function startServer() {
  const netpadUrl = config.get('netpadUrl');
  const apiKey = config.get('apiKey');
  const port = config.get('port');
  
  // Check if we have an API key
  if (!apiKey) {
    console.log('⚠️  No API key found. Please configure an API key:');
    const responses = await prompts({
      type: 'text',
      name: 'apiKey',
      message: 'NetPad API Key:'
    });
    
    if (responses.apiKey) {
      config.set('apiKey', responses.apiKey);
      console.log('✅ API key saved successfully');
    } else {
      console.error('❌ API key is required to start the proxy server');
      process.exit(1);
    }
  }

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Middleware for logging
  if (options.debug) {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });
  }

  // Middleware to add authentication to all requests
  app.use((req, res, next) => {
    req.headers['x-api-key'] = config.get('apiKey');
    next();
  });

  // MCP root endpoint
  app.get('/', async (req, res) => {
    try {
      const response = await axios.get(`${netpadUrl}/api/mcp`, {
        headers: { 'x-api-key': config.get('apiKey') }
      });
      res.json(response.data);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // Tools endpoint
  app.get('/tools', async (req, res) => {
    try {
      const response = await axios.get(`${netpadUrl}/api/mcp/tools${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`, {
        headers: { 'x-api-key': config.get('apiKey') }
      });
      res.json(response.data);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // Tool detail endpoint
  app.get('/tools/:id', async (req, res) => {
    try {
      const response = await axios.get(`${netpadUrl}/api/mcp/tools/${req.params.id}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`, {
        headers: { 'x-api-key': config.get('apiKey') }
      });
      res.json(response.data);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // Schema endpoint
  app.get('/schema', async (req, res) => {
    try {
      const response = await axios.get(`${netpadUrl}/api/mcp/schema${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`, {
        headers: { 'x-api-key': config.get('apiKey') }
      });
      res.json(response.data);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // Command endpoint
  app.post('/command', async (req, res) => {
    try {
      // Inject API key if not present
      const requestBody = req.body;
      if (!requestBody.auth || !requestBody.auth.apiKey) {
        if (!requestBody.auth) requestBody.auth = {};
        requestBody.auth.apiKey = config.get('apiKey');
      }
      
      // Add client info if not present
      if (!requestBody.clientInfo) {
        requestBody.clientInfo = {
          clientId: 'netpad-mcp-proxy',
          platform: 'cursor'
        };
      }
      
      const response = await axios.post(`${netpadUrl}/api/mcp/command`, requestBody, {
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': config.get('apiKey')
        }
      });
      res.json(response.data);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // OpenAI function discovery - compatibility endpoint
  app.get('/api/openai-functions', async (req, res) => {
    try {
      // Get tools from NetPad
      const response = await axios.get(`${netpadUrl}/api/mcp/tools?schema=true`, {
        headers: { 'x-api-key': config.get('apiKey') }
      });
      
      // Transform to OpenAI function format
      const functions = response.data.data.map(tool => ({
        type: 'function',
        function: {
          name: tool.invoke || tool.internalName,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: convertParamsToProperties(tool.parameters?.properties || {}),
            required: tool.parameters?.required || []
          }
        }
      }));
      
      res.json(functions);
    } catch (error) {
      handleProxyError(error, res);
    }
  });

  // Handle 404
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      status: 404,
      message: 'Endpoint not found',
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
      }
    });
  });

  // Create server
  const server = createServer(app);

  // Start listening
  server.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                NetPad MCP Proxy                   ║
╚═══════════════════════════════════════════════════╝

Server running at http://localhost:${port}
Connected to NetPad at ${netpadUrl}
API Key: ${apiKey.substring(0, 8)}...

To use with Cursor, add this to your MCP configuration:

{
  "mcpServers": {
    "NetPad": {
      "command": "npx",
      "args": [
        "-y",
        "netpad-mcp-proxy"
      ]
    }
  }
}

Press Ctrl+C to stop the server
    `);
  });
}

// Helper function to handle proxy errors
function handleProxyError(error, res) {
  console.error('Proxy Error:', error.message);
  
  // Check if this is an Axios error with a response
  if (error.response) {
    // Enhanced error handling for authentication/network issues
    if (error.response.status === 401 || error.response.status === 403) {
      res.status(error.response.status).json({
        success: false,
        status: error.response.status,
        message: 'Authentication failed: Invalid or missing API key. Please check your API key and permissions.',
        error: {
          code: 'AUTH_ERROR',
          details: error.response.data,
          suggestion: 'Re-run `netpad-mcp-proxy --configure` to update your API key, or generate a new one in the NetPad UI.'
        }
      });
      return;
    }
    if (error.response.status === 404) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'The requested resource was not found on the NetPad server.',
        error: {
          code: 'NOT_FOUND',
          details: error.response.data
        }
      });
      return;
    }
    // Return the error response from the actual API
    res.status(error.response.status).json(error.response.data);
  } else {
    // No response from the API (likely connection error)
    res.status(502).json({
      success: false,
      status: 502,
      message: 'Proxy Error: Could not connect to the NetPad server.',
      error: {
        code: 'NETPAD_CONNECTION_ERROR',
        message: `Could not connect to NetPad at ${config.get('netpadUrl')}`,
        details: error.message,
        suggestion: 'Check your internet connection, firewall settings, and ensure the NetPad server URL is correct. If using SaaS, verify https://api.netpad.ai is reachable.'
      }
    });
  }
}

// Helper to convert NetPad parameter format to OpenAI property format
function convertParamsToProperties(params) {
  const result = {};
  
  for (const [key, param] of Object.entries(params)) {
    result[key] = {
      type: param.type,
      description: param.description || key
    };
    
    if (param.enum) {
      result[key].enum = param.enum;
    }
    
    if (param.default !== undefined) {
      result[key].default = param.default;
    }
  }
  
  return result;
}