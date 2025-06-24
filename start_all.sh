#!/bin/bash
set -e

# Start backend
cd backend
if [ ! -d node_modules ]; then
  npm install
fi
nohup npm start &
BACKEND_PID=$!
cd ..

# Start frontend (static server on port 8000)
if ! command -v npx &> /dev/null; then
  echo "npx not found. Please install Node.js and npm."
  exit 1
fi
nohup npx serve . -l 8000 &
FRONTEND_PID=$!

# (Optional) Run Verilog simulation
if [ -f "6. Tools/Simulation/run_simulation.sh" ]; then
  bash "6. Tools/Simulation/run_simulation.sh" &
  SIM_PID=$!
fi

echo "All services started!"
echo "- Backend running (see backend logs)"
echo "- Frontend UI: http://localhost:8000 (open in your browser)"
echo "- Verilog simulation running (if applicable)"
echo "To stop all, run: kill $BACKEND_PID $FRONTEND_PID ${SIM_PID:-}" 