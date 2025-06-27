#!/bin/bash

# Launch Workflow UI
# This script starts the new workflow-based interface

echo "🚀 Starting AI Task Processor Workflow UI..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check if node_modules exists
if [ ! -d "web-interface/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd web-interface
    npm install
    cd ..
fi

# Kill any existing server on port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Stopping existing server on port 8080...${NC}"
    lsof -ti:8080 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start the server
echo -e "${BLUE}Starting backend server...${NC}"
cd web-interface
node server.js &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}Waiting for server to start...${NC}"
sleep 3

# Check if server started successfully
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Server started successfully on port 8080${NC}"
else
    echo -e "${RED}✗ Failed to start server${NC}"
    echo "Check the logs above for errors"
    exit 1
fi

# Open the workflow UI
echo -e "${BLUE}Opening Workflow UI...${NC}"

URL="http://localhost:8080/workflow-ui.html"

# Detect OS and open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$URL" 2>/dev/null || firefox "$URL" 2>/dev/null || google-chrome "$URL" 2>/dev/null
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start "$URL"
fi

echo ""
echo -e "${GREEN}✅ Workflow UI is ready!${NC}"
echo ""
echo "📝 Quick Guide:"
echo "  1. Upload your task files (PDF, DOC, TXT)"
echo "  2. Click 'Start AI Agents' to begin processing"
echo "  3. Watch progress in real-time"
echo "  4. Chat with AI for help"
echo "  5. Download results when complete"
echo ""
echo "🔗 URL: $URL"
echo "🔗 Dashboard: http://localhost:8080"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping server...${NC}"
    kill $SERVER_PID 2>/dev/null
    echo -e "${GREEN}Server stopped${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running and show server output
wait $SERVER_PID