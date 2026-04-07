#!/bin/bash
# Kong Admin API setup script
# Run this AFTER "docker compose up -d" and Kong is healthy
# Usage: bash kong/setup.sh

set -e

KONG_ADMIN=${KONG_ADMIN:-http://localhost:8001}

echo "Waiting for Kong Admin API at $KONG_ADMIN ..."
until curl -sf "$KONG_ADMIN" > /dev/null 2>&1; do
  sleep 3
done
echo "Kong is ready!"
echo ""

# Helper: create a Gateway Service + Route
# Usage: add_service <service-name> <upstream-url> <paths-json-array> [<methods-json-array>]
add_service() {
  local name=$1
  local upstream=$2
  local paths=$3
  local methods=${4:-'["GET","POST","PUT","PATCH","DELETE","OPTIONS"]'}

  echo ">>> Creating service: $name  →  $upstream"
  curl -sf -X POST "$KONG_ADMIN/services" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$name\", \"url\": \"$upstream\"}" > /dev/null

  echo "    Route paths: $paths"
  curl -sf -X POST "$KONG_ADMIN/services/$name/routes" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${name}-route\", \"paths\": $paths, \"methods\": $methods, \"strip_path\": false}" > /dev/null
  echo ""
}

# --------------------------------------------------------------------------
# Atomic Services
# --------------------------------------------------------------------------
add_service "card-service"   "http://card_ms:3001"    '["/getCard", "/addCard", "/updateCard"]'
add_service "wallet-service" "http://wallet_ms:3002"  '["/wallet", "/test", "/topup", "/deduct"]'
add_service "user-service"   "http://user_ms:3006"    '["/user", "/auth"]'
add_service "trip-service"   "http://trip_ms:3005"    '["/trip"]'
add_service "fare-service"   "http://fare_ms:5004"    '["/fare"]'

# --------------------------------------------------------------------------
# Legacy / External Services
# --------------------------------------------------------------------------
add_service "verify-service" "http://student-verification:3020" '["/verify", "/students"]'
add_service "lta-service"    "http://lta_ms:3007"               '["/lta"]'

# --------------------------------------------------------------------------
# Payment Gateway
# Note: /topup/intent, /topup/saved, /topup/auto are more specific than
# /topup (wallet), so Kong will correctly prefer them for those paths.
# --------------------------------------------------------------------------
add_service "payment-service" "http://payment_gateway:3010" \
  '["/setup-intent", "/payment-methods", "/charge", "/topup/intent", "/topup/saved", "/topup/auto", "/auto-topup", "/webhook"]'

# --------------------------------------------------------------------------
# Composite Services
# --------------------------------------------------------------------------
add_service "tapin-service"         "http://tapin_composite:4001"                    '["/tap-in"]'
add_service "tapout-service"        "http://tapout_composite:4003"                   '["/tap-out"]'
add_service "interim-refund-service" "http://process_interim_refund_composite:4006"  '["/interim-refund"]'
add_service "concession-service"    "http://process_concession_composite:4005"       '["/apply-concession"]'
add_service "lost-card-service"     "http://manage_lost_card_composite:4007"         '["/manage-lost-card"]'

# --------------------------------------------------------------------------
# Optional: Global CORS plugin (in case any service doesn't set it)
# --------------------------------------------------------------------------
echo ">>> Adding global CORS plugin"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cors",
    "config": {
      "origins": ["*"],
      "methods": ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
      "headers": ["Content-Type","Authorization","apikey"],
      "exposed_headers": ["Content-Type"],
      "max_age": 3600,
      "credentials": false
    }
  }' > /dev/null
echo ""

echo "=============================="
echo "Kong setup complete!"
echo "Proxy:   http://localhost:8000"
echo "Manager: http://localhost:8002"
echo "Admin:   http://localhost:8001"
echo "=============================="
