#!/bin/bash
# start backend and frontend for local dev
# usage: ./dev.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"

# kill anything already on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "starting backend on :8000 ..."
cd "$ROOT/backend"
source venv/bin/activate
python manage.py runserver &
BACKEND_PID=$!

echo "starting frontend on :3000 ..."
cd "$ROOT/frontend"
npm start &
FRONTEND_PID=$!

echo ""
echo "  backend  → http://localhost:8000"
echo "  frontend → http://localhost:3000"
echo ""
echo "press Ctrl+C to stop both"

# kill both when the script exits
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
