#!/bin/bash

echo "🎨 Setting up Multi-Agent Orchestrator Web Interface"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the web-interface directory"
    echo "Please run this from: /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the web interface:"
echo "  ./start.sh"
echo ""
echo "Or manually:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:8080"
