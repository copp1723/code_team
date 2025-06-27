#!/bin/bash

echo "🛑 Stopping existing server..."
# Kill the process using port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Wait a moment for port to be released
sleep 1

echo "✅ Port cleared"
echo ""
echo "🚀 Starting Multi-Agent Orchestrator..."
echo ""

# Set working directory
cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface

# Export API key
export OPENROUTER_API_KEY="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"

# Open browser
echo "🌐 Opening browser..."
open http://localhost:8080

echo ""
echo "🖥️  Starting server..."
echo "===================================="
echo "Web interface: http://localhost:8080"
echo "Press Ctrl+C to stop"
echo "===================================="
echo ""

# Start the server
node server-real.js
