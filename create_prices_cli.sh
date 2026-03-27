#!/bin/bash
KEY=$1

if [ -z "$KEY" ]; then
  echo "Usage: ./create_prices_cli.sh <STRIPE_API_KEY>"
  exit 1
fi

echo "--- Starting Price Creation ---"

# Base
echo "Creating Base Product..."
BASE_PROD=$(stripe products create --name "Adaptive Startup Pro Base" --api-key "$KEY" --json | jq -r .id)
if [ "$BASE_PROD" == "null" ]; then echo "Failed to create Base Product"; exit 1; fi

echo "Creating Base Price..."
BASE_PRICE=$(stripe prices create --product "$BASE_PROD" --unit-amount 16000 --currency usd --recurring interval=month --nickname "Base Subscription" --api-key "$KEY" --json | jq -r .id)
echo "STRIPE_BASE_PRICE_ID=$BASE_PRICE"

echo "Creating Yearly Price..."
YEARLY_PRICE=$(stripe prices create --product "$BASE_PROD" --unit-amount 172800 --currency usd --recurring interval=year --nickname "Yearly Subscription" --api-key "$KEY" --json | jq -r .id)
echo "STRIPE_YEARLY_PRICE_ID=$YEARLY_PRICE"

# Seat
echo "Creating Seat Product..."
SEAT_PROD=$(stripe products create --name "Adaptive Startup Pro Seat" --api-key "$KEY" --json | jq -r .id)

echo "Creating Seat Price (Monthly)..."
SEAT_PRICE=$(stripe prices create --product "$SEAT_PROD" --unit-amount 3500 --currency usd --recurring interval=month --nickname "Seat Add-on (Monthly)" --api-key "$KEY" --json | jq -r .id)
echo "STRIPE_SEAT_PRICE_ID=$SEAT_PRICE"

echo "Creating Seat Price (Yearly)..."
SEAT_PRICE_YEARLY=$(stripe prices create --product "$SEAT_PROD" --unit-amount 37800 --currency usd --recurring interval=year --nickname "Seat Add-on (Yearly)" --api-key "$KEY" --json | jq -r .id)
echo "STRIPE_SEAT_PRICE_ID_YEARLY=$SEAT_PRICE_YEARLY"

# Tokens
echo "Creating Token Product..."
TOKEN_PROD=$(stripe products create --name "1M Token Pack" --api-key "$KEY" --json | jq -r .id)

echo "Creating Token Price..."
TOKEN_PRICE=$(stripe prices create --product "$TOKEN_PROD" --unit-amount 1000 --currency usd --nickname "1M Tokens" --api-key "$KEY" --json | jq -r .id)
echo "STRIPE_TOKEN_PACK_PRICE_ID=$TOKEN_PRICE"

echo "--- Done ---"
