#!/bin/bash

# ============================================
# Adaptive Startup Deployment Script
# Best Practice: Separate dev/prod environments
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "🚀 Adaptive Startup Deployment Script"
echo "=============================="
echo ""

# Check environment argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./deploy.sh [dev|prod]${NC}"
    echo ""
    echo "  dev   → Push to development Convex deployment (uses .env.local)"
    echo "  prod  → Push to production Convex deployment (uses .env.production)"
    exit 1
fi

ENV=$1

# ============================================
# Select environment file & Convex flags
# ============================================

if [ "$ENV" == "prod" ]; then
    ENV_FILE=".env.production"
    CONVEX_CMD_FLAGS=""  # prod uses CONVEX_DEPLOY_KEY
    echo -e "${CYAN}🔒 PRODUCTION DEPLOYMENT${NC}"
    echo -e "${GREEN}🔧 Using PRODUCTION environment ($ENV_FILE)${NC}"
else
    ENV_FILE=".env.local"
    CONVEX_CMD_FLAGS=""
    echo -e "${GREEN}🔧 Using DEVELOPMENT environment ($ENV_FILE)${NC}"
fi

# Load variables from the selected file
if [ -f "$ENV_FILE" ]; then
    # Export variables ignoring comments and empty lines
    export $(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | xargs)
else
    echo -e "${RED}❌ Environment file $ENV_FILE not found!${NC}"
    exit 1
fi

# Validate Critical Variables
if [ -z "$CONVEX_DEPLOYMENT" ]; then
    echo -e "${RED}❌ Missing CONVEX_DEPLOYMENT in $ENV_FILE${NC}"
    exit 1
fi

echo ""
echo "📋 Configuration Loaded:"
echo "   Target:  $CONVEX_DEPLOYMENT"
echo "   Host:    $HOST_URL"
echo "   Convex:  $VITE_CONVEX_URL"
echo ""

# ============================================
# Set Convex Environment Variables
# ============================================

echo -e "${YELLOW}📦 Setting Convex environment variables...${NC}"

# Explicitly ensure correct deployment target
export CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT

# Function to sync variable only if set
sync_var() {
    local key=$1
    local value=$2
    if [ -n "$value" ]; then
        npx convex env set "$key" "$value"
    else
        echo -e "${YELLOW}⚠️  Skipping $key (not set)${NC}"
    fi
}

# --- Auth ---
sync_var "WORKOS_CLIENT_ID" "$WORKOS_CLIENT_ID"
sync_var "WORKOS_API_KEY" "$WORKOS_API_KEY"
sync_var "WORKOS_REDIRECT_URI" "$WORKOS_REDIRECT_URI"
sync_var "WORKOS_WEBHOOK_SECRET" "$WORKOS_WEBHOOK_SECRET"
sync_var "HOST_URL" "$HOST_URL"
sync_var "BRAIN_SHARED_SECRET" "$BRAIN_SHARED_SECRET"

# --- AI ---
sync_var "API_KEY" "$API_KEY"
sync_var "GEMINI_API_KEY" "$GEMINI_API_KEY"
sync_var "OLLAMA_BASE_URL" "$OLLAMA_BASE_URL"
sync_var "OLLAMA_MODEL" "$OLLAMA_MODEL"
sync_var "OLLAMA_API_KEY" "$OLLAMA_API_KEY"

# --- Stripe ---
sync_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
sync_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
sync_var "STRIPE_BASE_PRICE_ID" "$STRIPE_BASE_PRICE_ID"
sync_var "STRIPE_YEARLY_PRICE_ID" "$STRIPE_YEARLY_PRICE_ID"
sync_var "STRIPE_SEAT_PRICE_ID" "$STRIPE_SEAT_PRICE_ID"
sync_var "STRIPE_SEAT_PRICE_ID_YEARLY" "$STRIPE_SEAT_PRICE_ID_YEARLY"
sync_var "STRIPE_TOKEN_PACK_PRICE_ID" "$STRIPE_TOKEN_PACK_PRICE_ID"
sync_var "STRIPE_CLIENT_ID" "$STRIPE_CLIENT_ID"
sync_var "PRICE_ID" "$PRICE_ID"

# --- Media / External ---
sync_var "PIXABAY_API_KEY" "$PIXABAY_API_KEY"
sync_var "CLOUDFLARE_ACCESS_ID" "$CLOUDFLARE_ACCESS_ID"
sync_var "CLOUDFLARE_ACCESS_SECRET" "$CLOUDFLARE_ACCESS_SECRET"
sync_var "EXTERNAL_AI_KEY" "$EXTERNAL_AI_KEY"

echo -e "${GREEN}✅ Convex environment variables synced${NC}"

# ============================================
# Deploy Convex Functions + Schema
# ============================================

echo ""
echo -e "${YELLOW}🔄 Deploying Convex functions & schema...${NC}"
npx convex deploy --yes
echo -e "${GREEN}✅ Convex functions deployed${NC}"

# ============================================
# Build & Deploy Frontend (Production Only)
# ============================================

if [ "$ENV" == "prod" ]; then
    echo ""
    echo -e "${YELLOW}🏗️  Building frontend for production...${NC}"

    # Vite automatically loads .env.production when mode is production
    pnpm run build

    echo -e "${GREEN}✅ Frontend build complete${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Deploying to Cloudflare Pages...${NC}"

    npx wrangler pages deploy dist --project-name pillaros --branch main

    echo -e "${GREEN}🎉 Successfully deployed to Cloudflare!${NC}"
fi

echo ""
echo -e "${GREEN}✨ Deployment Pipeline Complete!${NC}"
echo ""
echo "📌 Summary:"
echo "   Environment:  $ENV"
echo "   Convex:       $CONVEX_DEPLOYMENT"
if [ "$ENV" == "prod" ]; then
    echo "   Frontend:     https://pillaros.pages.dev"
fi
echo ""
