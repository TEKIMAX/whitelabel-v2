#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🚀 Syncing Environment Variables (No Deploy)"
echo "=========================================="
echo ""

# Check environment argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./sync_env.sh [dev|prod]${NC}"
    exit 1
fi

ENV=$1
ENV_FILE=".env.local"

if [ "$ENV" == "prod" ]; then
    ENV_FILE=".env.production"
    echo -e "${GREEN}🔧 Using PRODUCTION environment ($ENV_FILE)${NC}"
else
    echo -e "${GREEN}🔧 Using DEVELOPMENT environment ($ENV_FILE)${NC}"
fi

# Load variables from the selected file
if [ -f "$ENV_FILE" ]; then
    # Export variables ignoring comments and empty lines
    export $(grep -v '^#' "$ENV_FILE" | xargs)
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
echo "   Target: $CONVEX_DEPLOYMENT"
# echo "   Host:   $HOST_URL" # Optional debug
echo ""

# ============================================
# Set Convex Environment Variables
# ============================================

echo -e "${YELLOW}📦 Setting Convex environment variables...${NC}"

# Explicitly ensure correct deployment target
export CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT

# Sync keys
# Function to sync variable only if set
sync_var() {
    local key=$1
    local value=$2
    if [ -n "$value" ]; then
        npx convex env set "$key" "$value"
    else
        echo -e "${YELLOW}⚠️  Skipping $key (not set locally)${NC}"
    fi
}

# Sync keys
sync_var "WORKOS_CLIENT_ID" "$WORKOS_CLIENT_ID"
sync_var "WORKOS_API_KEY" "$WORKOS_API_KEY"
sync_var "WORKOS_REDIRECT_URI" "$WORKOS_REDIRECT_URI"
sync_var "WORKOS_WEBHOOK_SECRET" "$WORKOS_WEBHOOK_SECRET"
sync_var "HOST_URL" "$HOST_URL"
sync_var "GEMINI_API_KEY" "$GEMINI_API_KEY"
sync_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
sync_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
sync_var "STRIPE_BASE_PRICE_ID" "$STRIPE_BASE_PRICE_ID"
sync_var "STRIPE_YEARLY_PRICE_ID" "$STRIPE_YEARLY_PRICE_ID"
sync_var "STRIPE_SEAT_PRICE_ID" "$STRIPE_SEAT_PRICE_ID"
sync_var "STRIPE_SEAT_PRICE_ID_YEARLY" "$STRIPE_SEAT_PRICE_ID_YEARLY"
sync_var "PIXABAY_API_KEY" "$PIXABAY_API_KEY"
sync_var "STRIPE_CLIENT_ID" "$STRIPE_CLIENT_ID"
sync_var "STRIPE_TOKEN_PACK_PRICE_ID" "$STRIPE_TOKEN_PACK_PRICE_ID"
sync_var "API_KEY" "$API_KEY"
sync_var "PRICE_ID" "$PRICE_ID"
sync_var "OLLAMA_BASE_URL" "$OLLAMA_BASE_URL"
sync_var "OLLAMA_MODEL" "$OLLAMA_MODEL"
sync_var "EXTERNAL_AI_KEY" "$EXTERNAL_AI_KEY"
sync_var "CLOUDFLARE_ACCESS_ID" "$CLOUDFLARE_ACCESS_ID"
sync_var "CLOUDFLARE_ACCESS_SECRET" "$CLOUDFLARE_ACCESS_SECRET"

echo -e "${GREEN}✅ Convex environment variables synced${NC}"
