#!/bin/bash

# Immediate process cleanup and system launch
set -e

PROJECT_ROOT="/Users/copp1723/Desktop/multi-agent-orchestrator"
cd "$PROJECT_ROOT"

echo "🛑 Killing existing processes..."

# Kill processes on ports 8080 and 3000
for port in 8080 3000; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Killing processes on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done

# Kill any node processes related to our project
pkill -f "server-real.js" 2>/dev/null || true
pkill -f "src/index.js" 2>/dev/null || true
pkill -f "multi-agent-orchestrator" 2>/dev/null || true

echo "✅ Process cleanup complete"

# Check .env
if [ ! -f ".env" ]; then
  echo "📄 Creating .env from example..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your API keys!"
fi

# Load environment
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Create logs directory
mkdir -p logs

# Install dependencies if needed
if [ ! -d "web-interface/node_modules" ]; then
  echo "📦 Installing web interface dependencies..."
  cd web-interface
  npm install
  cd ..
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing main dependencies..."
  npm install
fi

echo "🚀 Starting Multi-Agent Orchestrator..."

# Start web interface in background
cd web-interface
echo "🌐 Starting web interface on port ${WEB_PORT:-8080}..."
nohup node server-real.js > ../logs/web-interface.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > ../web.pid

# Wait for web interface to start
sleep 3

# Check if web interface is running
if ! kill -0 $WEB_PID 2>/dev/null; then
  echo "❌ Web interface failed to start"
  cat ../logs/web-interface.log
  exit 1
fi

echo "✅ Web interface started (PID: $WEB_PID)"

# Start main orchestrator
cd "$PROJECT_ROOT"
echo "🤖 Starting orchestrator..."
nohup node src/index.js > logs/orchestrator.log 2>&1 &
ORCH_PID=$!
echo $ORCH_PID > orchestrator.pid

# Wait for orchestrator to start
sleep 3

# Check if orchestrator is running
if ! kill -0 $ORCH_PID 2>/dev/null; then
  echo "❌ Orchestrator failed to start"
  cat logs/orchestrator.log
  exit 1
fi

echo "✅ Orchestrator started (PID: $ORCH_PID)"

echo ""
echo "🎉 Multi-Agent Orchestrator is now running!"
echo "=========================================="
echo ""
echo "📊 Dashboard: http://localhost:${WEB_PORT:-8080}"
echo "📝 Web Logs: tail -f logs/web-interface.log"
echo "📝 Orchestrator Logs: tail -f logs/orchestrator.log"
echo ""
echo "🛑 To stop: ./scripts/stop.sh"
echo ""

# Test the web interface
sleep 2
if command -v curl >/dev/null 2>&1; then
  if curl -s "http://localhost:${WEB_PORT:-8080}" >/dev/null; then
    echo "✅ Web interface is responding"
  else
    echo "⚠️  Web interface may not be ready yet"
  fi
fi

echo ""
echo "System is ready! 🚀"
