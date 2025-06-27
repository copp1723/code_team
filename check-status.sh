#!/bin/bash

# Final verification and system status
PROJECT_ROOT="/Users/copp1723/Desktop/multi-agent-orchestrator"
cd "$PROJECT_ROOT"

echo "🔍 Multi-Agent Orchestrator - System Status"
echo "=========================================="

# Check processes
echo ""
echo "📊 Process Status:"
if pgrep -f "server-real.js" > /dev/null; then
  WEB_PID=$(pgrep -f "server-real.js")
  echo "  ✅ Web Interface: Running (PID: $WEB_PID)"
else
  echo "  ❌ Web Interface: Not running"
fi

if pgrep -f "src/index.js" > /dev/null; then
  ORCH_PID=$(pgrep -f "src/index.js")
  echo "  ✅ Orchestrator: Running (PID: $ORCH_PID)"
else
  echo "  ❌ Orchestrator: Not running"
fi

# Check ports
echo ""
echo "🌐 Port Status:"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "  ✅ Port 8080: In use (Web Interface)"
else
  echo "  ❌ Port 8080: Available (Web Interface not running)"
fi

# Check files
echo ""
echo "📁 File Status:"
for file in .env src/index.js web-interface/server-real.js; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

# Check configuration
echo ""
echo "⚙️  Configuration:"
if [ -f ".env" ]; then
  if grep -q "OPENROUTER_API_KEY=sk-or-v1-" .env; then
    echo "  ✅ API Key configured"
  else
    echo "  ❌ API Key not configured"
  fi
  
  WEB_PORT=$(grep "WEB_PORT=" .env | cut -d'=' -f2)
  echo "  📍 Web Port: ${WEB_PORT:-8080}"
fi

# Test connectivity
echo ""
echo "🔗 Connectivity Test:"
WEB_PORT=${WEB_PORT:-8080}
if command -v curl >/dev/null 2>&1; then
  if curl -s "http://localhost:$WEB_PORT" >/dev/null; then
    echo "  ✅ Dashboard responding at http://localhost:$WEB_PORT"
  else
    echo "  ❌ Dashboard not responding"
  fi
else
  echo "  ⚠️  curl not available for testing"
fi

# Show logs if available
echo ""
echo "📝 Recent Log Activity:"
if [ -d "logs" ]; then
  echo "  Log directory exists"
  ls -la logs/ 2>/dev/null | grep "\.log" | while read line; do
    echo "    $line"
  done
  
  if [ -f "logs/web-interface.log" ]; then
    echo ""
    echo "  Last 5 lines from web-interface.log:"
    tail -5 logs/web-interface.log | sed 's/^/    /'
  fi
else
  echo "  ❌ No logs directory"
fi

echo ""
echo "🎯 Quick Actions:"
echo "  Access Dashboard: http://localhost:${WEB_PORT:-8080}"
echo "  View Logs: tail -f logs/*.log"
echo "  Restart System: ./scripts/implement-and-launch.sh"
echo "  Stop System: pkill -f 'server-real.js'; pkill -f 'src/index.js'"
echo ""
