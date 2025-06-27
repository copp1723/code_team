#!/bin/bash

# Multi-Agent Orchestrator - Stop Script
# Gracefully stops all running services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/.orchestrator.pid"
WEB_PID_FILE="$PROJECT_ROOT/.web.pid"

echo "🛑 Stopping Multi-Agent Orchestrator..."
echo "====================================="

# Stop orchestrator
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
        echo "Stopping orchestrator (PID: $PID)..."
        kill "$PID"
        sleep 3
        if ps -p "$PID" > /dev/null; then
            echo "Force stopping orchestrator..."
            kill -9 "$PID"
        fi
        echo "✓ Orchestrator stopped"
    fi
    rm -f "$PID_FILE"
else
    echo "• No orchestrator PID file found"
fi

# Stop web interface
if [ -f "$WEB_PID_FILE" ]; then
    WEB_PID=$(cat "$WEB_PID_FILE")
    if ps -p "$WEB_PID" > /dev/null; then
        echo "Stopping web interface (PID: $WEB_PID)..."
        kill "$WEB_PID"
        sleep 2
        if ps -p "$WEB_PID" > /dev/null; then
            echo "Force stopping web interface..."
            kill -9 "$WEB_PID"
        fi
        echo "✓ Web interface stopped"
    fi
    rm -f "$WEB_PID_FILE"
else
    echo "• No web interface PID file found"
fi

# Kill any remaining processes on web port
WEB_PORT=${WEB_PORT:-8080}
if lsof -ti:$WEB_PORT > /dev/null 2>&1; then
    echo "Killing remaining processes on port $WEB_PORT..."
    lsof -ti:$WEB_PORT | xargs kill -9 2>/dev/null || true
fi

echo ""
echo "✅ All services stopped successfully"
