# NetPad mCP Proxy Implementation Context

This document provides context for continuing development on the NetPad mCP Proxy package.

## Project Overview

We've implemented an mCP (Model-Component-Property) API for NetPad, allowing integration with code assistants like Cursor. The API provides access to NetPad's diagram editing, workflow execution, and AI capabilities.

The project consists of two main components:

1. **NetPad mCP API**: API endpoints in the main NetPad application
2. **NetPad mCP Proxy**: A standalone npm package that serves as a proxy server for the API

## Current State

### NetPad mCP API

We've implemented the following API endpoints in NetPad:

- `/api/mcp` - Root endpoint providing API information
- `/api/mcp/tools` - List available tools
- `/api/mcp/tools/[id]` - Get details for a specific tool
- `/api/mcp/schema` - Get schema information
- `/api/mcp/command` - Execute commands

Authentication is handled via API keys, which can be created in the NetPad UI under Preferences > API Keys.

### NetPad mCP Proxy

We've created a standalone npm package that serves as a proxy server for the NetPad mCP API. This allows Cursor to start the proxy on demand using its command-based integration.

The proxy:
- Connects to a NetPad instance (default: localhost:3000)
- Forwards requests to the mCP API
- Manages API key storage and authentication
- Provides improved error handling and user experience

The package has been published to npm as `netpad-mcp-proxy`.

## Current Challenges

The proxy is currently configured to connect to a local NetPad instance (localhost:3000) by default. We need to enhance it to better support the production NetPad SaaS instance.

## Next Steps

The following improvements are needed for the proxy:

1. **Production Support**:
   - Update the proxy to connect to the production NetPad instance by default
   - Add configuration options for development vs. production environment
   - Improve error handling specific to production use cases

2. **Initialization Flow**:
   - Add an environment selection prompt during configuration
   - Provide better guidance for users based on their environment

3. **Security Enhancements**:
   - Improve API key handling for production use
   - Add support for HTTPS connections
   - Implement better error messages for authentication issues

4. **Documentation**:
   - Update documentation to clearly explain production vs. development usage
   - Add examples for different configurations

## Technical Implementation Details

### API Authentication

API keys have three permission levels:
- `READ_ONLY`: Can access schema and tool information
- `EXECUTE`: Can execute commands and tools
- `ADMIN`: Full access (reserved for admins)

The proxy stores the user's API key securely using the `conf` package.

### Command Processing

Commands sent to the API are processed by the `commandProcessor.js` module, which supports:
- Tool execution
- LLM prompts (OpenAI, Anthropic, Ollama)
- JavaScript code execution
- Memory operations
- Vector search operations

### Integration with Cursor

Cursor can be configured to use the proxy in its mCP configuration:

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

## File Structure

The proxy package has the following structure:

```
netpad-mcp-proxy/
├── README.md            - Documentation for the package
├── bin/
│   └── netpad-mcp-proxy.js  - Main executable script
├── index.js             - Module exports for programmatic usage
├── package.json         - Package configuration
└── LICENSE              - License file
```

## Key Dependencies

- `axios`: For making HTTP requests to the NetPad API
- `commander`: For command-line argument parsing
- `conf`: For secure configuration storage
- `cors`: For handling cross-origin requests
- `express`: For the proxy server
- `prompts`: For interactive configuration

## Related Changes in NetPad

The NetPad UI has been updated with an API Key Manager component that allows users to create and manage API keys. This is available in the Preferences page under the "API Keys" tab.