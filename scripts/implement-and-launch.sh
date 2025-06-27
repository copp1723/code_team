#!/bin/bash

# Multi-Agent Orchestrator - Complete Implementation & Launch
echo "🚀 Multi-Agent Orchestrator - Complete Implementation"
echo "===================================================="

PROJECT_ROOT="/Users/copp1723/Desktop/multi-agent-orchestrator"
cd "$PROJECT_ROOT"

# Kill any existing processes
echo "🛑 Cleaning up existing processes..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "server-real.js" 2>/dev/null || true
pkill -f "multi-agent" 2>/dev/null || true

# Create necessary directories
mkdir -p logs
mkdir -p config

# Install dependencies
echo "📦 Checking dependencies..."
if [ ! -d "web-interface/node_modules" ]; then
  echo "Installing web interface dependencies..."
  cd web-interface
  npm install --no-audit
  cd ..
fi

if [ ! -d "node_modules" ]; then
  echo "Installing main dependencies..."
  npm install --no-audit
fi

# Verify environment
echo "🔍 Verifying environment..."
if [ ! -f ".env" ]; then
  echo "❌ .env file missing"
  exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Verify API key
if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "sk-or-v1-your-actual-key-here" ]; then
  echo "❌ OPENROUTER_API_KEY not configured"
  exit 1
fi

echo "✅ Environment configured"

# Start web interface
echo "🌐 Starting web interface..."
cd web-interface

# Start in background with proper logging
nohup node server-real.js > ../logs/web-interface.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > ../web.pid

# Wait for startup
sleep 5

# Verify web interface is running
if ! kill -0 $WEB_PID 2>/dev/null; then
  echo "❌ Web interface failed to start"
  cat ../logs/web-interface.log
  exit 1
fi

echo "✅ Web interface started (PID: $WEB_PID)"

# Test web interface
if curl -s "http://localhost:${WEB_PORT:-8080}" >/dev/null 2>&1; then
  echo "✅ Web interface responding"
else
  echo "⚠️  Web interface may still be starting up"
fi

cd "$PROJECT_ROOT"

# Start main orchestrator (optional, web interface can work standalone)
echo "🤖 Starting orchestrator..."
nohup node src/index.js > logs/orchestrator.log 2>&1 &
ORCH_PID=$!
echo $ORCH_PID > orchestrator.pid

sleep 3

if kill -0 $ORCH_PID 2>/dev/null; then
  echo "✅ Orchestrator started (PID: $ORCH_PID)"
else
  echo "⚠️  Orchestrator startup in progress"
fi

# Display status
echo ""
echo "🎉 Multi-Agent Orchestrator is now running!"
echo "==========================================="
echo ""
echo "📊 Dashboard: http://localhost:${WEB_PORT:-8080}"
echo "📁 Project: $PROJECT_ROOT"
echo "📝 Logs: $PROJECT_ROOT/logs/"
echo ""
echo "🔍 Process Status:"
echo "  Web Interface: PID $WEB_PID"
echo "  Orchestrator:  PID $ORCH_PID"
echo ""
echo "🛠️  Management:"
echo "  Stop all: kill $WEB_PID $ORCH_PID"
echo "  Logs: tail -f logs/*.log"
echo "  Restart: ./scripts/implement-and-launch.sh"
echo ""
echo "✅ System ready! Access the dashboard in your browser."

# Keep script alive to show logs (optional)
read -p "Press Enter to view live logs, or Ctrl+C to exit: "
echo ""
echo "📝 Showing live logs (Ctrl+C to exit):"
tail -f logs/*.log
