#!/bin/bash

# Multi-Agent Orchestrator Launcher
# This script launches the web interface automatically

echo "🚀 Multi-Agent Orchestrator Launcher"
echo "===================================="
echo ""

# Set working directory
cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface

# Export API key
export OPENROUTER_API_KEY="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"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup - installing dependencies..."
    npm install
    echo ""
fi

# Open browser automatically (macOS)
echo "🌐 Opening browser..."
sleep 2 && open http://localhost:8080 &

# Start the server
echo "🖥️  Starting server..."
echo ""
echo "The web interface will open in your browser automatically."
echo "If it doesn't, go to: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Use the real server for actual functionality
node server-real.js
