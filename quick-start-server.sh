#!/bin/bash

echo "🔧 Setting up Multi-Agent Orchestrator..."
echo ""

cd "$(dirname "$0")/web-interface"

# Install missing dependency
echo "📦 Installing dependencies..."
npm install dotenv

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "PORT=8080" > .env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting server..."
echo ""

# Start the server
node server.js