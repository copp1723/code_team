#!/bin/bash

echo "🚀 Starting Multi-Agent Orchestrator Web Interface..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Export API key if not set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "⚠️  OPENROUTER_API_KEY not set. Setting from parent .env..."
    export OPENROUTER_API_KEY="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"
fi

echo "✅ Environment ready"
echo ""
echo "🌐 Starting server..."
echo "   Web Interface: http://localhost:8080"
echo "   WebSocket: ws://localhost:8080"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the server (use real server for actual execution)
node server-real.js
