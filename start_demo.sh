#!/bin/bash
set -e

echo "🚀 Starting Virtual Chip Signature System for Demo..."

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f node || true
pkill -f serve || true

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Start backend with simple server
echo "🔧 Starting backend server..."
cd backend
nohup node server_simple.js > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Check if backend is running
if curl -s http://localhost:4000/ > /dev/null; then
    echo "✅ Backend is running on http://localhost:4000"
else
    echo "❌ Backend failed to start. Check backend/backend.log for errors."
    exit 1
fi

# Start frontend
echo "🌐 Starting frontend..."
nohup npx serve . -l 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

echo ""
echo "🎉 Demo is ready!"
echo "📱 Frontend: http://localhost:8000"
echo "🔧 Backend: http://localhost:4000"
echo ""
echo "To stop all services:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "- Backend: backend/backend.log"
echo "- Frontend: frontend.log" 