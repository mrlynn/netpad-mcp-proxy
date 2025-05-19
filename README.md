# NetPad MCP Proxy

A standalone Model-Component-Property (mCP) proxy server for NetPad that enables easy integration with code assistants like Cursor.

## Overview

This package provides a command-line proxy server that connects to a running NetPad instance and exposes its functionality through the mCP protocol. This makes it easy to use NetPad with code assistants like Cursor without directly exposing your NetPad server.

## Features

- **Easy Integration**: Works out-of-the-box with Cursor and other mCP-compatible tools
- **API Key Management**: Securely stores and manages your NetPad API key
- **Proxy Functionality**: Forwards requests to NetPad with proper authentication
- **Compatibility**: Supports OpenAI function calling format
- **Configuration**: Simple setup with interactive prompts or command-line options

## Installation

```bash
# Install globally
npm install -g netpad-mcp-proxy

# Or use directly with npx
npx netpad-mcp-proxy
```

## Usage

### Starting the Proxy Server

```bash
# Start with default settings (NetPad at localhost:3000, proxy on port 7777)
netpad-mcp-proxy

# Specify port and NetPad URL
netpad-mcp-proxy --port 8888 --netpad-url http://localhost:4000

# Provide API key
netpad-mcp-proxy --api-key mcp_your_api_key_here

# Enable debug logging
netpad-mcp-proxy --debug
```

### Configuration

You can configure the proxy server interactively:

```bash
netpad-mcp-proxy --configure
```

During configuration, you will be prompted to select an environment:
- **Production (NetPad SaaS):** Connects to the official NetPad cloud service at https://api.netpad.ai
- **Development (Custom/Local):** Allows you to specify a custom or local NetPad server URL

Or reset the configuration:

```bash
netpad-mcp-proxy --reset
```

## Production Usage

When using the proxy with the NetPad SaaS (production) environment:
- The proxy will connect to `https://api.netpad.ai` by default.
- **Keep your API key secure!** Do not share it or commit it to source control.
- For best security, use a dedicated API key with the minimum required permissions for your use case.
- If you encounter authentication errors, re-run `netpad-mcp-proxy --configure` to update your API key, or generate a new one in the NetPad UI.
- If you have connectivity issues, ensure your network allows outbound HTTPS connections to `api.netpad.ai`.

## Integrating with Cursor

Add the following to your Cursor mCP configuration:

```json
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
```

Cursor will automatically start the proxy server when needed.

## API Endpoints

The proxy server provides the following endpoints:

- `GET /` - Root endpoint providing API information
- `GET /tools` - List available tools
- `GET /tools/:id` - Get details for a specific tool
- `GET /schema` - Get schema information
- `POST /command` - Execute commands
- `GET /api/openai-functions` - OpenAI function calling compatibility endpoint

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <number>` | Port to run the server on | 7777 |
| `-n, --netpad-url <url>` | URL of the NetPad server | http://localhost:3000 |
| `-k, --api-key <key>` | NetPad API key | (stored value) |
| `-c, --configure` | Configure API key and NetPad URL | |
| `-d, --debug` | Enable debug logging | |
| `--reset` | Reset configuration | |

## Programmatic Usage

You can also use the proxy server programmatically in your Node.js applications:

```javascript
import { startServer, configure, reset } from 'netpad-mcp-proxy';

// Start the server
const server = startServer({
  port: 7777,
  netpadUrl: 'http://localhost:3000',
  apiKey: 'mcp_your_api_key_here',
  debug: true
});

// Stop the server
server.stop();

// Configure the server
await configure({
  netpadUrl: 'http://localhost:3000',
  apiKey: 'mcp_your_api_key_here'
});

// Reset configuration
await reset();
```

## Requirements

- Node.js 16 or higher
- A running NetPad instance
- A valid NetPad API key with EXECUTE permission

## License

MIT
