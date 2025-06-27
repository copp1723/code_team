#!/bin/bash

# Multi-Agent Orchestrator Startup Script

echo "🤖 Multi-Agent Orchestrator - Startup"
echo "====================================="
echo ""

# Check if setup has been run
if [ ! -f "package-lock.json" ]; then
    echo "📦 First time setup detected. Running setup..."
    node quick-setup.js
    echo ""
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    if [ -f ".env.example" ]; then
        echo "📄 Creating .env from .env.example..."
        cp .env.example .env
        echo ""
        echo "❗ IMPORTANT: Edit .env and add your OpenRouter API key!"
        echo "   Get your key from: https://openrouter.ai/keys"
        echo ""
        read -p "Press Enter after you've added your API key..."
    fi
fi

# Menu
echo "What would you like to do?"
echo ""
echo "1) Start Web Interface (Recommended)"
echo "2) Run AI Agent (Interactive)"
echo "3) Initialize Master Agent"
echo "4) Check System Status"
echo "5) Run Full Setup"
echo "6) Test AI Connection"
echo "7) Exit"
echo ""

read -p "Select option (1-7): " choice

case $choice in
    1)
        echo "🌐 Starting Web Interface..."
        cd web-interface && npm start
        ;;
    2)
        echo "🤖 Starting AI Agent..."
        node ai-agent.js interactive
        ;;
    3)
        echo "👑 Initializing Master Agent..."
        node master-agent.js init
        ;;
    4)
        echo "📊 System Status:"
        node orchestrator.js status
        ;;
    5)
        echo "🔧 Running full setup..."
        node quick-setup.js
        ;;
    6)
        echo "🧪 Testing AI connection..."
        node test-openrouter.js
        ;;
    7)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac
