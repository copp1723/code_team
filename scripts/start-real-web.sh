#!/bin/bash

# Start the real web interface server

echo "🚀 Starting Multi-Agent Orchestrator Web Interface (Real Mode)"
echo "=================================================="
echo ""
echo "This will start the web interface with REAL command execution"
echo "Make sure you have backed up your repositories before running!"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

cd "$(dirname "$0")/web-interface"

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start the real server
echo "Starting real server on http://localhost:8080"
node server-real.js
