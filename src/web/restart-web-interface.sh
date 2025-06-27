#!/bin/bash

echo "🔄 Restarting Multi-Agent Orchestrator Web Interface with fixes..."
echo ""

# Change to the web-interface directory
cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface

# Kill any existing node processes on port 8080
echo "🛑 Stopping existing server..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "✅ Fixed issues:"
echo "   - Added favicon.svg to prevent 404 error"
echo "   - Removed default repository selection"
echo "   - Updated server to handle favicon requests"
echo ""

# Start the server
./start.sh
