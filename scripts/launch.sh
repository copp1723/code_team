#!/bin/bash

# Multi-Agent Orchestrator - Production Launch Script
# This script handles the complete setup and launch of the system

set -e  # Exit on any error

echo "🚀 Multi-Agent Orchestrator - Production Launch"
echo "=============================================="
echo ""

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_INTERFACE_DIR="$PROJECT_ROOT/web-interface"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.orchestrator.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    warning "Running as root is not recommended for development"
fi

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 14 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        error "Node.js version 14 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        warning "Git is not installed. Some features may not work."
    fi
    
    log "✓ System requirements met"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Setup .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log "Creating .env from .env.example..."
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            warning "Please edit .env file with your API keys before continuing"
            echo ""
            echo "Required API keys:"
            echo "  - OPENROUTER_API_KEY: Get from https://openrouter.ai/keys"
            echo "  - SUPERMEMORY_API_KEY: Get from https://supermemory.ai"
            echo ""
            read -p "Press Enter after you've updated the .env file..."
        else
            error ".env.example not found"
            exit 1
        fi
    fi
    
    # Load environment variables
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    
    # Validate required environment variables
    if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "sk-or-v1-your-actual-key-here" ]; then
        error "OPENROUTER_API_KEY is not configured in .env file"
        exit 1
    fi
    
    log "✓ Environment configured"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Main project dependencies
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log "Installing main project dependencies..."
        cd "$PROJECT_ROOT"
        npm install
    fi
    
    # Web interface dependencies
    if [ ! -d "$WEB_INTERFACE_DIR/node_modules" ]; then
        log "Installing web interface dependencies..."
        cd "$WEB_INTERFACE_DIR"
        npm install
    fi
    
    log "✓ Dependencies installed"
}

# Kill existing processes
cleanup_processes() {
    log "Cleaning up existing processes..."
    
    # Kill process by PID file
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            log "Stopping existing orchestrator (PID: $PID)"
            kill "$PID"
            sleep 2
            if ps -p "$PID" > /dev/null; then
                warning "Force killing process $PID"
                kill -9 "$PID"
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill processes on web interface port
    WEB_PORT=${WEB_PORT:-8080}
    if lsof -ti:$WEB_PORT > /dev/null 2>&1; then
        log "Killing process on port $WEB_PORT"
        lsof -ti:$WEB_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    log "✓ Cleanup completed"
}

# Start the web interface
start_web_interface() {
    log "Starting web interface on port ${WEB_PORT:-8080}..."
    
    cd "$WEB_INTERFACE_DIR"
    
    # Start the web server in background
    nohup node server-real.js > "$LOG_DIR/web-interface.log" 2>&1 &
    WEB_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Check if server is running
    if ps -p "$WEB_PID" > /dev/null; then
        log "✓ Web interface started (PID: $WEB_PID)"
        echo "$WEB_PID" > "$PROJECT_ROOT/.web.pid"
        
        # Test the connection
        if command -v curl &> /dev/null; then
            if curl -s "http://localhost:${WEB_PORT:-8080}" > /dev/null; then
                log "✓ Web interface is responding"
            else
                warning "Web interface may not be fully ready yet"
            fi
        fi
    else
        error "Failed to start web interface"
        cat "$LOG_DIR/web-interface.log"
        exit 1
    fi
}

# Start the orchestrator
start_orchestrator() {
    log "Starting main orchestrator..."
    
    cd "$PROJECT_ROOT"
    
    # Start the orchestrator in background
    nohup node src/index.js > "$LOG_DIR/orchestrator.log" 2>&1 &
    ORCH_PID=$!
    
    # Wait for orchestrator to start
    sleep 3
    
    # Check if orchestrator is running
    if ps -p "$ORCH_PID" > /dev/null; then
        log "✓ Orchestrator started (PID: $ORCH_PID)"
        echo "$ORCH_PID" > "$PID_FILE"
    else
        error "Failed to start orchestrator"
        cat "$LOG_DIR/orchestrator.log"
        exit 1
    fi
}

# Display status
show_status() {
    echo ""
    echo -e "${BLUE}🎉 Multi-Agent Orchestrator is now running!${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo "📊 Dashboard: http://localhost:${WEB_PORT:-8080}"
    echo "📁 Project Root: $PROJECT_ROOT"
    echo "📝 Logs Directory: $LOG_DIR"
    echo ""
    echo "📋 Running Processes:"
    if [ -f "$PROJECT_ROOT/.web.pid" ]; then
        WEB_PID=$(cat "$PROJECT_ROOT/.web.pid")
        echo "  • Web Interface: PID $WEB_PID"
    fi
    if [ -f "$PID_FILE" ]; then
        ORCH_PID=$(cat "$PID_FILE")
        echo "  • Orchestrator: PID $ORCH_PID"
    fi
    echo ""
    echo "🛠️  Management Commands:"
    echo "  • View logs: tail -f $LOG_DIR/*.log"
    echo "  • Stop all: $PROJECT_ROOT/scripts/stop.sh"
    echo "  • Restart: $PROJECT_ROOT/scripts/restart.sh"
    echo ""
    echo "Press Ctrl+C to view real-time logs or run in background..."
}

# Monitor logs
monitor_logs() {
    echo ""
    log "Monitoring system logs (Ctrl+C to exit)..."
    echo ""
    
    # Monitor both log files
    tail -f "$LOG_DIR/web-interface.log" "$LOG_DIR/orchestrator.log" 2>/dev/null || {
        log "Log files not ready yet, waiting..."
        sleep 5
        tail -f "$LOG_DIR/web-interface.log" "$LOG_DIR/orchestrator.log" 2>/dev/null || true
    }
}

# Signal handlers
cleanup() {
    echo ""
    log "Shutting down..."
    cleanup_processes
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
main() {
    check_requirements
    setup_environment
    install_dependencies
    cleanup_processes
    start_web_interface
    start_orchestrator
    show_status
    
    # Ask user if they want to monitor logs
    echo ""
    read -p "Monitor logs in real-time? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        monitor_logs
    else
        log "Running in background. Check logs at $LOG_DIR/"
    fi
}

# Run main function
main "$@"
