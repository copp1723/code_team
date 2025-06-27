#!/bin/bash

# Development Quick Start Script
# For rapid development and testing

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚡ Multi-Agent Orchestrator - Dev Mode"
echo "====================================="

# Check for .env
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Setting up development environment..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "⚠️  Please update .env with your API keys"
    echo "Opening .env file..."
    ${EDITOR:-nano} "$PROJECT_ROOT/.env"
fi

# Load environment
set -a
source "$PROJECT_ROOT/.env"
set +a

# Quick dependency check
if [ ! -d "$PROJECT_ROOT/web-interface/node_modules" ]; then
    echo "Installing web interface dependencies..."
    cd "$PROJECT_ROOT/web-interface"
    npm install
fi

# Kill existing processes
pkill -f "server-real.js" 2>/dev/null || true
pkill -f "node src/index.js" 2>/dev/null || true

# Start in development mode
echo "Starting development servers..."

# Start web interface
cd "$PROJECT_ROOT/web-interface"
echo "🌐 Web interface: http://localhost:${WEB_PORT:-8080}"
node server-real.js &

# Wait and show status
sleep 2
echo ""
echo "✅ Development environment ready!"
echo "📊 Dashboard: http://localhost:${WEB_PORT:-8080}"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait
