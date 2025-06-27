#!/bin/bash

echo "🚀 Starting Multi-Agent Orchestrator..."
echo ""

# Navigate to the correct directory
cd "$(dirname "$0")/web-interface"

# Start the server
echo "Starting server on port 8080..."
node server.js