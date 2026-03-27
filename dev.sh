#!/bin/bash
# Local dev for whitelabel app
# Usage: ./dev.sh [--no-convex]
#   --no-convex  Skip Convex dev (use existing deployment)

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SKIP_CONVEX=0
for arg in "$@"; do
  [ "$arg" == "--no-convex" ] && SKIP_CONVEX=1
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Whitelabel App — Local Dev${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check .env.local ────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ No .env.local found.${NC}"
  echo "   Create one with at minimum:"
  echo "   VITE_CONVEX_URL=https://your-deployment.convex.cloud"
  echo "   VITE_WORKOS_CLIENT_ID=client_..."
  exit 1
fi

# ── Install deps if needed ──────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  pnpm install
fi

# ── Launch Convex + Vite in parallel ────────────────────────
if [ "$SKIP_CONVEX" -eq 1 ]; then
  echo -e "${YELLOW}⚡ Skipping Convex dev (--no-convex)${NC}"
  echo -e "${GREEN}🚀 Starting Vite at http://localhost:5173${NC}"
  echo ""
  pnpm dev
else
  echo -e "${GREEN}🚀 Starting Convex dev + Vite${NC}"
  echo -e "${YELLOW}   Ctrl+C to stop both${NC}"
  echo ""
  # Run Convex dev in background, Vite in foreground
  npx convex dev &
  CONVEX_PID=$!
  # Give Convex a moment to connect
  sleep 2
  pnpm dev
  # Cleanup Convex on exit
  kill $CONVEX_PID 2>/dev/null || true
fi
