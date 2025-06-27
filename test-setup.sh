#!/bin/bash

echo "Testing Multi-Agent Orchestrator Setup"
echo "======================================"
echo ""

# Check Node.js
echo "1. Checking Node.js..."
which node || echo "❌ Node.js not found!"
node --version || echo "❌ Can't get Node version"
echo ""

# Check npm
echo "2. Checking npm..."
which npm || echo "❌ npm not found!"
npm --version || echo "❌ Can't get npm version"
echo ""

# Check directory
echo "3. Checking directories..."
if [ -d "/Users/copp1723/Desktop/multi-agent-orchestrator/web-interface" ]; then
    echo "✅ Web interface directory exists"
else
    echo "❌ Web interface directory not found!"
fi
echo ""

# Check if server file exists
echo "4. Checking server files..."
if [ -f "/Users/copp1723/Desktop/multi-agent-orchestrator/web-interface/server-real.js" ]; then
    echo "✅ server-real.js exists"
else
    echo "❌ server-real.js not found!"
fi
echo ""

# Try to run the server
echo "5. Testing server startup..."
cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface
export OPENROUTER_API_KEY="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"

# Check for port conflict
echo "6. Checking if port 8080 is already in use..."
lsof -i :8080 && echo "⚠️  Port 8080 is already in use!" || echo "✅ Port 8080 is available"
echo ""

echo "Press Enter to try starting the server..."
read

node server-real.js
