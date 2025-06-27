#!/bin/bash

# Multi-Agent Orchestrator - Final Integration & Launch
# This script completes the setup and launches the entire system

set -e

echo "🚀 Multi-Agent Orchestrator - Final Integration"
echo "=============================================="
echo "Completing setup and launching the system..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make all scripts executable
echo "📁 Making scripts executable..."
chmod +x "$PROJECT_ROOT/scripts"/*.sh

# Check if .env exists, if not create from example
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "📄 Creating .env from example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo ""
    echo "⚠️  IMPORTANT: You need to edit the .env file with your API keys!"
    echo ""
    echo "Required API keys:"
    echo "  • OPENROUTER_API_KEY: Get from https://openrouter.ai/keys"
    echo "  • SUPERMEMORY_API_KEY: Get from https://supermemory.ai (optional)"
    echo ""
    
    # Ask if user wants to edit now
    read -p "Do you want to edit the .env file now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} "$PROJECT_ROOT/.env"
    else
        echo "⚠️  Remember to edit .env before running the system!"
        echo "   You can edit it with: nano .env"
    fi
fi

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Show menu
echo ""
echo "🎯 What would you like to do?"
echo ""
echo "1) 🚀 Launch Full System (Production Mode)"
echo "2) ⚡ Start Development Mode" 
echo "3) 🌐 Start Web Interface Only"
echo "4) 📊 Show System Status"
echo "5) 🛠️  Interactive Setup Menu"
echo "6) 📚 Show Documentation"
echo "7) 🚪 Exit"
echo ""

read -p "Select option (1-7): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Launching full system in production mode..."
        exec "$PROJECT_ROOT/scripts/launch.sh"
        ;;
    2)
        echo ""
        echo "⚡ Starting development mode..."
        exec "$PROJECT_ROOT/scripts/dev.sh"
        ;;
    3)
        echo ""
        echo "🌐 Starting web interface only..."
        exec "$PROJECT_ROOT/scripts/quick-start.sh"
        ;;
    4)
        echo ""
        echo "📊 System Status:"
        echo "================"
        
        # Check for running processes
        if pgrep -f "server-real.js" > /dev/null; then
            echo "✅ Web Interface: Running"
        else
            echo "❌ Web Interface: Not running"
        fi
        
        if pgrep -f "src/index.js" > /dev/null; then
            echo "✅ Orchestrator: Running"
        else
            echo "❌ Orchestrator: Not running"
        fi
        
        # Check ports
        if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
            echo "✅ Port 8080: In use"
        else
            echo "⚪ Port 8080: Available"
        fi
        
        # Check .env
        if [ -f "$PROJECT_ROOT/.env" ]; then
            echo "✅ Environment: Configured"
        else
            echo "❌ Environment: Not configured"
        fi
        
        echo ""
        echo "🌐 Dashboard: http://localhost:8080"
        echo "📁 Project: $PROJECT_ROOT"
        ;;
    5)
        echo ""
        echo "🛠️  Opening interactive setup menu..."
        exec "$PROJECT_ROOT/scripts/start.sh"
        ;;
    6)
        echo ""
        echo "📚 Multi-Agent Orchestrator Documentation"
        echo "========================================"
        echo ""
        echo "🎯 Quick Start:"
        echo "  1. Edit .env with your API keys"
        echo "  2. Run ./scripts/launch.sh for full system"
        echo "  3. Open http://localhost:8080 in your browser"
        echo ""
        echo "🛠️  Development:"
        echo "  • ./scripts/dev.sh - Development mode"
        echo "  • ./scripts/restart.sh - Restart services"
        echo "  • ./scripts/stop.sh - Stop all services"
        echo ""
        echo "📁 Important Files:"
        echo "  • .env - Environment configuration"
        echo "  • web-interface/ - Dashboard and UI"
        echo "  • src/ - Core orchestrator code"
        echo "  • logs/ - System logs"
        echo ""
        echo "🔗 Useful Links:"
        echo "  • OpenRouter API: https://openrouter.ai/keys"
        echo "  • Supermemory: https://supermemory.ai"
        echo "  • Documentation: README.md"
        echo ""
        ;;
    7)
        echo ""
        echo "👋 Goodbye! Remember to:"
        echo "  • Configure your .env file"
        echo "  • Run ./scripts/launch.sh to start the system"
        echo "  • Visit http://localhost:8080 for the dashboard"
        echo ""
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid option. Please select 1-7."
        exit 1
        ;;
esac
