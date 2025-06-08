#!/bin/bash

# Set script to exit immediately if any command fails
set -e

# Color definitions for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}   Dating App Development Server    ${NC}"
echo -e "${GREEN}====================================${NC}"

# Function to check if a program exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}Error: $1 is required but not installed.${NC}"
    exit 1
  fi
}

# Check for required commands
check_command python3
check_command npm

# Check if directories exist
BACKEND_DIR="."
FRONTEND_DIR="dating_app_frontend"

if [ ! -f "${BACKEND_DIR}/run.py" ]; then
  echo -e "${RED}Error: run.py not found in ${BACKEND_DIR}. Are you in the right directory?${NC}"
  exit 1
fi

if [ ! -d "${FRONTEND_DIR}" ]; then
  echo -e "${RED}Error: ${FRONTEND_DIR} directory not found.${NC}"
  exit 1
fi

# Kill any existing servers
echo -e "${YELLOW}Stopping any existing servers...${NC}"
pkill -f "python3 run.py" &>/dev/null || true
lsof -ti:3000 | xargs kill -9 &>/dev/null || true
lsof -ti:5001 | xargs kill -9 &>/dev/null || true

# Get the absolute paths
WORKSPACE_DIR=$(pwd)
BACKEND_FULL_PATH="${WORKSPACE_DIR}/${BACKEND_DIR}"
FRONTEND_FULL_PATH="${WORKSPACE_DIR}/${FRONTEND_DIR}"

# Start backend server
start_backend() {
  echo -e "${CYAN}Starting Backend Server...${NC}"
  cd "${BACKEND_FULL_PATH}"
  
  # Check for virtual environment
  if [ -d ".venv" ]; then
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null || echo "Could not activate venv"
  fi
  
  # Run the backend server
  echo -e "${GREEN}Backend server starting at http://localhost:5001${NC}"
  python3 run.py &
  BACKEND_PID=$!
  echo $BACKEND_PID > "${WORKSPACE_DIR}/backend.pid"
}

# Start frontend server
start_frontend() {
  echo -e "${CYAN}Starting Frontend Server...${NC}"
  cd "${FRONTEND_FULL_PATH}"
  
  # Run the frontend server
  echo -e "${GREEN}Frontend server starting at http://localhost:3000${NC}"
  npm run dev &
  FRONTEND_PID=$!
  echo $FRONTEND_PID > "${WORKSPACE_DIR}/frontend.pid"
}

# Register cleanup function
cleanup() {
  echo -e "${YELLOW}Stopping servers...${NC}"
  
  # Kill backend process
  if [ -f "${WORKSPACE_DIR}/backend.pid" ]; then
    BACKEND_PID=$(cat "${WORKSPACE_DIR}/backend.pid")
    kill $BACKEND_PID &>/dev/null || true
    rm "${WORKSPACE_DIR}/backend.pid"
  fi
  
  # Kill frontend process
  if [ -f "${WORKSPACE_DIR}/frontend.pid" ]; then
    FRONTEND_PID=$(cat "${WORKSPACE_DIR}/frontend.pid")
    kill $FRONTEND_PID &>/dev/null || true
    rm "${WORKSPACE_DIR}/frontend.pid"
  fi
  
  # Additional cleanup for any stray processes
  pkill -f "python3 run.py" &>/dev/null || true
  lsof -ti:3000 | xargs kill -9 &>/dev/null || true
  lsof -ti:5001 | xargs kill -9 &>/dev/null || true
  
  echo -e "${GREEN}Servers stopped.${NC}"
  
  exit 0
}

# Trap Ctrl+C and EXIT to clean up
trap cleanup INT TERM EXIT

# Start both servers
start_backend
start_frontend

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}   Both servers are now running     ${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "Backend: ${CYAN}http://localhost:5001${NC}"
echo -e "Frontend: ${CYAN}http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Keep script running to manage the child processes
while true; do
  sleep 1
done 