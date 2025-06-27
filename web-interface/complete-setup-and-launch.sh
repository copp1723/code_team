#!/bin/bash

# Complete Integration and Launch Script
# Sets up OpenRouter API, Supermemory integration, and launches the Master Dashboard

set -e

echo "🚀 MULTI-AGENT ORCHESTRATOR - COMPLETE SETUP & LAUNCH"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the web-interface directory
if [ ! -f "server.js" ]; then
    print_error "Please run this script from the web-interface directory"
    print_status "Current directory: $(pwd)"
    print_status "Expected files: server.js, package.json"
    exit 1
fi

print_header "🔧 ENVIRONMENT SETUP"

# Install dependencies
print_status "Installing dependencies..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi

npm install --production
print_success "Dependencies installed"

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from template"
    else
        print_warning "No .env.example found, creating basic .env"
        cat > .env << 'EOF'
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Supermemory API Configuration (Optional)
SUPERMEMORY_API_KEY=your_supermemory_api_key_here

# Server Configuration
PORT=8080
NODE_ENV=production

# Dashboard Configuration
AUTO_REFRESH_INTERVAL=5000
EOF
    fi
fi

print_header "🔑 API CONFIGURATION"

# Check for OpenRouter API key
if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
    print_warning "OpenRouter API key not configured!"
    echo ""
    echo -e "${CYAN}To enable AI chat functionality:${NC}"
    echo "1. Get your API key from: https://openrouter.ai/keys"
    echo "2. Edit .env and replace 'your_openrouter_api_key_here' with your actual key"
    echo ""
    
    read -p "$(echo -e ${YELLOW}"Do you want to configure your OpenRouter API key now? (y/n): "${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Please enter your OpenRouter API key:${NC}"
        read -p "API Key: " API_KEY
        
        if [ ! -z "$API_KEY" ]; then
            # Replace the placeholder with the actual API key
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/your_openrouter_api_key_here/$API_KEY/" .env
            else
                # Linux
                sed -i "s/your_openrouter_api_key_here/$API_KEY/" .env
            fi
            print_success "OpenRouter API key configured!"
        else
            print_warning "No API key entered. You can configure it later in .env"
        fi
    fi
else
    print_success "OpenRouter API key is configured"
fi

# Optional Supermemory setup
if grep -q "your_supermemory_api_key_here" .env 2>/dev/null; then
    echo ""
    read -p "$(echo -e ${CYAN}"Do you want to configure Supermemory for conversation persistence? (y/n): "${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Please enter your Supermemory API key (or press Enter to skip):${NC}"
        read -p "Supermemory API Key: " SUPER_KEY
        
        if [ ! -z "$SUPER_KEY" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/your_supermemory_api_key_here/$SUPER_KEY/" .env
            else
                sed -i "s/your_supermemory_api_key_here/$SUPER_KEY/" .env
            fi
            print_success "Supermemory API key configured!"
        else
            print_warning "Supermemory not configured - conversations won't be persisted"
        fi
    fi
fi

print_header "📁 DIRECTORY STRUCTURE"

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p ../logs
mkdir -p ../.agent-checkpoints
mkdir -p ../temp

# Create log files
touch ../logs/system.log 2>/dev/null || true
touch ../logs/agents.log 2>/dev/null || true
touch ../logs/dashboard.log 2>/dev/null || true

print_success "Directory structure ready"

print_header "🔍 SYSTEM CHECKS"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js version 14+ required. Current: $(node --version)"
    exit 1
fi
print_success "Node.js $(node --version) ✓"

# Check port availability
PORT=${PORT:-8080}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $PORT is in use. Attempting to find alternative..."
    for port in 8081 8082 8083; do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            PORT=$port
            echo "PORT=$PORT" >> .env
            print_success "Using alternative port: $PORT"
            break
        fi
    done
else
    print_success "Port $PORT is available ✓"
fi

# Check if master dashboard HTML exists
if [ ! -f "master-dashboard.html" ]; then
    print_error "master-dashboard.html not found!"
    print_status "The dashboard file should be in the current directory"
    exit 1
fi
print_success "Master Dashboard HTML found ✓"

print_header "🧪 CONNECTIVITY TESTS"

# Test OpenRouter API if key is configured
if ! grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
    print_status "Testing OpenRouter API connection..."
    
    # Get API key from .env
    API_KEY=$(grep "OPENROUTER_API_KEY=" .env | cut -d'=' -f2)
    
    if [ ! -z "$API_KEY" ]; then
        # Test API connection
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            "https://openrouter.ai/api/v1/models" || echo "000")
        
        if [ "$RESPONSE" = "200" ]; then
            print_success "OpenRouter API connection successful ✓"
        else
            print_warning "OpenRouter API test failed (HTTP $RESPONSE)"
            print_warning "Chat functionality may be limited"
        fi
    fi
else
    print_warning "OpenRouter API key not configured - skipping test"
fi

print_header "📊 FINAL CONFIGURATION SUMMARY"

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗"
echo -e "║                  🤖 MASTER DASHBOARD                  ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 Server Configuration:${NC}"
echo -e "   📍 URL: http://localhost:$PORT"
echo -e "   🔌 WebSocket: ws://localhost:$PORT"
echo -e "   📦 Node.js: $(node --version)"
echo ""
echo -e "${CYAN}🔑 API Integration:${NC}"
if ! grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
    echo -e "   🤖 OpenRouter: ${GREEN}✅ Configured${NC}"
else
    echo -e "   🤖 OpenRouter: ${RED}❌ Not configured${NC}"
fi

if ! grep -q "your_supermemory_api_key_here" .env 2>/dev/null; then
    echo -e "   💾 Supermemory: ${GREEN}✅ Configured${NC}"
else
    echo -e "   💾 Supermemory: ${YELLOW}⚠️  Optional${NC}"
fi
echo ""
echo -e "${CYAN}🚀 Dashboard Features:${NC}"
echo -e "   📊 Real-time system monitoring"
echo -e "   🤖 AI-powered Master Agent chat"
echo -e "   ⚡ Multi-agent workflow orchestration"
echo -e "   📋 Intelligent ticket management"
echo -e "   📈 Resource usage tracking"
echo -e "   💻 Integrated terminal interface"
echo -e "   📄 Comprehensive system logging"
echo ""

# Final launch confirmation
echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
echo ""
read -p "$(echo -e ${GREEN}"🚀 Launch the Master Dashboard now? (y/n): "${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_header "🎉 LAUNCHING MASTER DASHBOARD"
    echo ""
    echo -e "${GREEN}🌟 Multi-Agent Orchestrator Master Dashboard Starting...${NC}"
    echo -e "${GREEN}📊 Dashboard URL: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🔌 WebSocket URL: ws://localhost:$PORT${NC}"
    echo ""
    
    if ! grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
        echo -e "${GREEN}🤖 AI Chat: Enabled with OpenRouter integration${NC}"
    else
        echo -e "${YELLOW}⚠️  AI Chat: Limited (configure OpenRouter key for full functionality)${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}💡 Quick Start Tips:${NC}"
    echo -e "   • Use the chat to ask the Master Agent about system status"
    echo -e "   • Monitor agents in real-time on the dashboard"
    echo -e "   • Click the floating action buttons for quick operations"
    echo -e "   • Check system logs for detailed activity information"
    echo ""
    echo -e "${YELLOW}⚠️  Press Ctrl+C to stop the server${NC}"
    echo ""
    echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Launch the server
    exec npm start
else
    echo ""
    print_success "✅ Setup complete! Your Master Dashboard is ready to launch."
    echo ""
    echo -e "${CYAN}To start the dashboard later, run:${NC}"
    echo -e "   ${GREEN}npm start${NC}  (production mode)"
    echo -e "   ${GREEN}npm run dev${NC}  (development mode with auto-restart)"
    echo ""
    echo -e "${CYAN}Dashboard URL:${NC} http://localhost:$PORT"
    echo ""
    print_success "🎉 Multi-Agent Orchestrator Master Dashboard is ready!"
fi
