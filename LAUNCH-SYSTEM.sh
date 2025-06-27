#!/bin/bash

# Complete Multi-Agent Orchestrator Launch Script
echo "🚀 Multi-Agent Orchestrator - Complete Launch"
echo "============================================="

# Set project root
PROJECT_ROOT="/Users/copp1723/Desktop/multi-agent-orchestrator"
cd "$PROJECT_ROOT" || exit 1

echo "📁 Working directory: $PROJECT_ROOT"

# Function to check if port is in use
check_port() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to kill processes on port
kill_port() {
    if check_port $1; then
        echo "🔪 Killing processes on port $1..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Step 1: Cleanup
echo ""
echo "🧹 Step 1: Cleanup existing processes"
kill_port 8080
kill_port 3000

# Kill any node processes that might be running our servers
pkill -f "server-real.js" 2>/dev/null || true
pkill -f "multi-agent" 2>/dev/null || true

echo "✅ Cleanup complete"

# Step 2: Environment check
echo ""
echo "🔍 Step 2: Environment verification"

if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "sk-or-v1-your-actual-key-here" ]; then
    echo "❌ OPENROUTER_API_KEY not configured properly"
    exit 1
fi

echo "✅ Environment configured"
echo "🔑 API Key: ${OPENROUTER_API_KEY:0:20}..."
echo "🌐 Web Port: ${WEB_PORT:-8080}"

# Step 3: Dependencies
echo ""
echo "📦 Step 3: Dependency check"

if [ ! -d "web-interface/node_modules" ]; then
    echo "📥 Installing web interface dependencies..."
    cd web-interface
    npm install --silent
    cd ..
fi

if [ ! -d "node_modules" ]; then
    echo "📥 Installing main dependencies..."
    npm install --silent
fi

echo "✅ Dependencies ready"

# Step 4: Create directories
echo ""
echo "📁 Step 4: Setting up directories"
mkdir -p logs
mkdir -p .agent-checkpoints
echo "✅ Directories created"

# Step 5: Start web interface
echo ""
echo "🚀 Step 5: Starting web interface"

cd web-interface

# Start the web server
echo "🌐 Launching web server..."
nohup node server-real.js > ../logs/web-interface.log 2>&1 &
WEB_PID=$!

# Save PID
echo $WEB_PID > ../web.pid

echo "📊 Web server started (PID: $WEB_PID)"

# Wait for startup
echo "⏳ Waiting for server to start..."
sleep 5

# Verify it's running
if ! kill -0 $WEB_PID 2>/dev/null; then
    echo "❌ Web server failed to start"
    echo "📝 Log output:"
    cat ../logs/web-interface.log
    exit 1
fi

echo "✅ Web server is running"

# Step 6: Test connectivity
echo ""
echo "🔗 Step 6: Testing connectivity"

WEB_PORT=${WEB_PORT:-8080}

# Test the web interface
if command -v curl >/dev/null 2>&1; then
    for i in {1..10}; do
        if curl -s "http://localhost:$WEB_PORT" >/dev/null 2>&1; then
            echo "✅ Web interface responding on port $WEB_PORT"
            break
        else
            echo "⏳ Attempt $i/10: Waiting for web interface..."
            sleep 2
        fi
    done
else
    echo "⚠️  curl not available, cannot test connectivity"
fi

# Step 7: Start orchestrator (optional)
echo ""
echo "🤖 Step 7: Starting orchestrator (optional)"

cd "$PROJECT_ROOT"

nohup node src/index.js > logs/orchestrator.log 2>&1 &
ORCH_PID=$!
echo $ORCH_PID > orchestrator.pid

echo "🎛️  Orchestrator started (PID: $ORCH_PID)"

# Final status
echo ""
echo "🎉 LAUNCH COMPLETE!"
echo "=================="
echo ""
echo "📊 Multi-Agent Orchestrator Dashboard:"
echo "   🌐 URL: http://localhost:$WEB_PORT"
echo "   📱 Open this in your web browser"
echo ""
echo "📈 System Status:"
echo "   🌐 Web Interface: Running (PID: $WEB_PID)"
echo "   🤖 Orchestrator:  Running (PID: $ORCH_PID)"
echo "   📍 Port:          $WEB_PORT"
echo ""
echo "📝 Log Files:"
echo "   📄 Web:     tail -f $PROJECT_ROOT/logs/web-interface.log"
echo "   📄 System:  tail -f $PROJECT_ROOT/logs/orchestrator.log"
echo ""
echo "🛠️  Management:"
echo "   🛑 Stop Web:    kill $WEB_PID"
echo "   🛑 Stop Orch:   kill $ORCH_PID"
echo "   🛑 Stop All:    kill $WEB_PID $ORCH_PID"
echo "   🔄 Restart:     $0"
echo ""
echo "✅ System is ready! Access the dashboard now."

# Optional: Show live logs
echo ""
read -p "📝 Show live logs? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Live logs (Ctrl+C to exit):"
    echo "=============================="
    tail -f logs/*.log
fi
