#!/bin/bash

# Master Dashboard Launch Script
# Launches the complete Multi-Agent Orchestrator system with Master Dashboard

set -e

echo "🚀 Launching Multi-Agent Orchestrator Master Dashboard"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    print_error "Please run this script from the web-interface directory"
    exit 1
fi

# Check Node.js installation
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 14+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js version 14+ required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check npm installation
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_success "npm $(npm --version) detected"

# Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "package.json" ]; then
    print_status "Installing dependencies..."
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "multi-agent-orchestrator-dashboard",
  "version": "2.0.0",
  "description": "Master Dashboard for Multi-Agent Orchestrator",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "author": "Multi-Agent Orchestrator",
  "license": "MIT"
}
EOF
        print_success "Created package.json"
    fi
    
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Check environment configuration
print_status "Checking environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example"
        print_warning "Please edit .env and add your OpenRouter API key!"
        print_warning "Get your API key from: https://openrouter.ai/keys"
    else
        print_warning "No .env file found. Creating basic configuration..."
        cat > .env << EOF
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=8080
NODE_ENV=production

# Dashboard Configuration
AUTO_REFRESH_INTERVAL=5000
EOF
        print_warning "Created basic .env file. Please add your OpenRouter API key!"
    fi
else
    print_success "Environment configuration found"
fi

# Check for API key
if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
    print_warning "OpenRouter API key not configured!"
    print_warning "Edit .env and replace 'your_openrouter_api_key_here' with your actual API key"
    print_warning "Get your API key from: https://openrouter.ai/keys"
fi

# Create master dashboard HTML file if it doesn't exist
print_status "Setting up Master Dashboard..."
if [ ! -f "master-dashboard.html" ]; then
    print_warning "master-dashboard.html not found. Please ensure the dashboard file is present."
fi

# Check if parent directory has the agent system files
print_status "Checking multi-agent system files..."
PARENT_DIR="../"
REQUIRED_FILES=("src/index.js" "package.json")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "${PARENT_DIR}${file}" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_warning "Some multi-agent system files are missing:"
    for file in "${MISSING_FILES[@]}"; do
        print_warning "  - $file"
    done
    print_warning "The dashboard will still work, but some agent features may be limited."
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p ../logs
mkdir -p ../.agent-checkpoints
mkdir -p ../temp

# Set up log files
touch ../logs/system.log
touch ../logs/agents.log
touch ../logs/dashboard.log

print_success "Directory structure ready"

# Check port availability
print_status "Checking port availability..."
PORT=${PORT:-8080}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $PORT is already in use. The server may not start properly."
    print_warning "Stop any existing servers or change the PORT in .env"
else
    print_success "Port $PORT is available"
fi

# Final setup checks
print_status "Running final setup checks..."

# Check if we can write to log directory
if [ ! -w "../logs" ]; then
    print_warning "Cannot write to logs directory. Some logging features may not work."
fi

# Display configuration summary
echo ""
echo -e "${PURPLE}=============================================="
echo -e "  🤖 MASTER DASHBOARD CONFIGURATION"
echo -e "==============================================\n"
echo -e "${CYAN}Server Configuration:${NC}"
echo -e "  Port: $PORT"
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo ""
echo -e "${CYAN}API Configuration:${NC}"
if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
    echo -e "  OpenRouter: ${RED}❌ Not configured${NC}"
else
    echo -e "  OpenRouter: ${GREEN}✅ Configured${NC}"
fi
echo ""
echo -e "${CYAN}Dashboard Features:${NC}"
echo -e "  🎯 Real-time agent monitoring"
echo -e "  📊 System metrics and health"
echo -e "  🤖 AI-powered Master Agent chat"
echo -e "  📋 Ticket management and tracking"
echo -e "  ⚡ Workflow orchestration"
echo -e "  💻 Terminal integration"
echo -e "  📈 Resource monitoring"
echo -e "  📄 System logging"
echo ""
echo -e "${PURPLE}=============================================="

# Ask user if they want to start the server
echo ""
read -p "$(echo -e ${CYAN}"Start the Master Dashboard server? (y/n): "${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting Master Dashboard server..."
    echo ""
    echo -e "${GREEN}🚀 LAUNCHING MASTER DASHBOARD${NC}"
    echo -e "${GREEN}📊 Dashboard: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🔌 WebSocket: ws://localhost:$PORT${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    
    # Start the server
    npm start
else
    echo ""
    print_success "Setup complete! To start the server manually, run:"
    echo -e "${CYAN}  npm start${NC}"
    echo ""
    print_success "Or use nodemon for development:"
    echo -e "${CYAN}  npm run dev${NC}"
    echo ""
fi
