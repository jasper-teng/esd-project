#!/bin/bash
# Kong Admin API setup script
# Beyond-labs features:
#   1. Kong Upstreams with active health checks (tapin, tapout, card)
#   2. Tiered rate limiting per route type
#   3. Correlation ID plugin (distributed request tracing)
#   4. Prometheus metrics plugin (observability)
#   5. Response Transformer (API versioning headers)
#   6. Request Transformer (inject consumer identity for backend services)
#   7. Key Auth + ACL (from labs — kept as foundation)
#   8. Global CORS
#
# Usage: bash kong/setup.sh

set -e

KONG_ADMIN=${KONG_ADMIN:-http://localhost:8001}

echo "Waiting for Kong Admin API at $KONG_ADMIN ..."
until curl -sf "$KONG_ADMIN" > /dev/null 2>&1; do
  sleep 3
done
echo "Kong is ready!"
echo ""

# =============================================================================
# HELPER: create a Gateway Service pointing to a direct URL + Route
# =============================================================================
add_service() {
  local name=$1
  local upstream=$2
  local paths=$3
  local methods=${4:-'["GET","POST","PUT","PATCH","DELETE","OPTIONS"]'}

  echo ">>> Creating service: $name  →  $upstream"
  curl -sf -X POST "$KONG_ADMIN/services" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$name\", \"url\": \"$upstream\"}" > /dev/null

  curl -sf -X POST "$KONG_ADMIN/services/$name/routes" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${name}-route\", \"paths\": $paths, \"methods\": $methods, \"strip_path\": false}" > /dev/null
  echo ""
}

# =============================================================================
# BEYOND-LABS HELPER: create an Upstream with active health checks,
# add the target, then create a Service that points to the upstream
# (instead of directly to a container hostname).
# This enables Kong to actively poll each service's health endpoint and
# automatically pull unhealthy targets out of rotation.
# =============================================================================
add_upstream_service() {
  local name=$1          # e.g. "tapin-service"
  local target=$2        # e.g. "tapin_composite:4001"
  local health_path=$3   # e.g. "/"
  local paths=$4         # e.g. '["/tap-in"]'
  local methods=${5:-'["GET","POST","PUT","PATCH","DELETE","OPTIONS"]'}
  local upstream_name="${name}-upstream"

  echo ">>> Creating upstream: $upstream_name  (health check: $health_path)"
  curl -sf -X POST "$KONG_ADMIN/upstreams" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$upstream_name\",
      \"healthchecks\": {
        \"active\": {
          \"http_path\": \"$health_path\",
          \"healthy\": {
            \"interval\": 10,
            \"successes\": 2
          },
          \"unhealthy\": {
            \"interval\": 5,
            \"http_failures\": 3,
            \"tcp_failures\": 3
          }
        },
        \"passive\": {
          \"healthy\": {
            \"successes\": 5
          },
          \"unhealthy\": {
            \"http_failures\": 3,
            \"tcp_failures\": 3
          }
        }
      }
    }" > /dev/null

  echo "    Target: $target"
  curl -sf -X POST "$KONG_ADMIN/upstreams/$upstream_name/targets" \
    -H "Content-Type: application/json" \
    -d "{\"target\": \"$target\", \"weight\": 100}" > /dev/null

  echo "    Service + Route: $name  paths=$paths"
  curl -sf -X POST "$KONG_ADMIN/services" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$name\", \"host\": \"$upstream_name\", \"port\": 80, \"protocol\": \"http\"}" > /dev/null

  curl -sf -X POST "$KONG_ADMIN/services/$name/routes" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${name}-route\", \"paths\": $paths, \"methods\": $methods, \"strip_path\": false}" > /dev/null
  echo ""
}

# =============================================================================
# BEYOND-LABS HELPER: attach a tiered rate-limit plugin to a named route
# This prevents API abuse with different limits per route type
# =============================================================================
add_rate_limit() {
  local route_name=$1
  local per_minute=$2
  local per_hour=${3:-0}

  echo "    Rate limit on $route_name: ${per_minute}/min"
  local payload="{\"name\": \"rate-limiting\", \"config\": {\"minute\": $per_minute, \"policy\": \"local\", \"fault_tolerant\": true, \"hide_client_headers\": false}}"
  if [ "$per_hour" -gt 0 ]; then
    payload="{\"name\": \"rate-limiting\", \"config\": {\"minute\": $per_minute, \"hour\": $per_hour, \"policy\": \"local\", \"fault_tolerant\": true, \"hide_client_headers\": false}}"
  fi
  curl -sf -X POST "$KONG_ADMIN/routes/${route_name}/plugins" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null
}

# =============================================================================
# 1. SERVICES & ROUTES
#    - High-traffic composites use add_upstream_service (health checks)
#    - Everything else uses add_service (direct URL)
# =============================================================================

echo "======================================="
echo "  STEP 1: Services & Routes"
echo "======================================="

# --- Atomic Services (direct URL) ---
add_service "card-service"   "http://card_ms:3001"    '["/getCard", "/addCard", "/updateCard"]'
add_service "wallet-service" "http://wallet_ms:3002"  '["/wallet", "/test", "/topup", "/deduct"]'
add_service "user-service"   "http://user_ms:3006"    '["/user", "/auth"]'
add_service "trip-service"   "http://trip_ms:3005"    '["/trip"]'
add_service "fare-service"   "http://fare_ms:5004"    '["/fare"]'

# --- Legacy / External Services (direct URL) ---
add_service "verify-service" "http://student-verification:3020" '["/verify", "/students"]'
add_service "lta-service"    "http://lta_ms:3007"               '["/lta"]'

# --- Payment Gateway (direct URL) ---
add_service "payment-service" "http://payment_gateway:3010" \
  '["/setup-intent", "/payment-methods", "/charge", "/topup/intent", "/topup/confirm", "/topup/saved", "/topup/auto", "/auto-topup", "/webhook"]'

# --- BEYOND LABS: High-traffic composites use Upstreams with health checks ---
# Kong actively polls the health endpoint every 10s.
# If 3 consecutive failures → target is marked unhealthy → removed from rotation.
# If 2 consecutive successes → target is reinstated automatically.
add_upstream_service "tapin-service"  "tapin_composite:4001"                   "/" '["/tap-in"]'
add_upstream_service "tapout-service" "tapout_composite:4003"                  "/" '["/tap-out"]'
add_upstream_service "card-upstream-service" "card_ms:3001"                    "/" '["/card-health"]'

# --- Remaining composites (direct URL) ---
add_service "interim-refund-service"  "http://process_interim_refund_composite:4006"  '["/interim-refund"]'
add_service "concession-service"      "http://process_concession_composite:4005"      '["/apply-concession"]'
add_service "lost-card-service"       "http://manage_lost_card_composite:4007"        '["/manage-lost-card"]'

# =============================================================================
# 2. GLOBAL PLUGINS
# =============================================================================

echo "======================================="
echo "  STEP 2: Global Plugins"
echo "======================================="

# --- CORS ---
echo ">>> [Global] CORS plugin"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cors",
    "config": {
      "origins": ["*"],
      "methods": ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
      "headers": ["Content-Type","Authorization","apikey","X-Request-ID","X-Kong-Request-ID"],
      "exposed_headers": ["X-Kong-Request-ID","X-RateLimit-Remaining-Minute","X-RateLimit-Limit-Minute","X-API-Version","X-Powered-By"],
      "max_age": 3600,
      "credentials": false
    }
  }' > /dev/null
echo ""

# --- Key Authentication (from labs — unchanged) ---
echo ">>> [Global] Key Auth plugin"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{"name": "key-auth", "config": {"key_names": ["apikey"], "hide_credentials": true}}' > /dev/null
echo ""

# =============================================================================
# BEYOND-LABS PLUGIN 1: Correlation ID
# Generates a unique UUID for every request and attaches it as a header.
# The same ID is forwarded to upstream services, making it possible to
# trace a single user action (e.g. tap-in) across Kong → TapIn → Card →
# Wallet logs. Without this, correlating distributed logs is guesswork.
# =============================================================================
echo ">>> [Global] Correlation ID plugin  (BEYOND LABS — distributed tracing)"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "correlation-id",
    "config": {
      "header_name": "X-Kong-Request-ID",
      "generator": "uuid#counter",
      "echo_downstream": true
    }
  }' > /dev/null
echo ""

# =============================================================================
# BEYOND-LABS PLUGIN 2: Prometheus
# Enables Kong to expose real-time metrics at http://localhost:8100/metrics
# in Prometheus format. Grafana (at http://localhost:3100) scrapes these
# to render dashboards showing request rate, latency, error rate, and
# upstream health per service/route/consumer.
# Metrics include:
#   - kong_http_requests_total (by service, route, status code)
#   - kong_latency_* (p50/p95/p99 proxy + upstream latency)
#   - kong_bandwidth_bytes_total
#   - kong_upstream_target_health (0=unhealthy, 1=healthy)
# =============================================================================
echo ">>> [Global] Prometheus plugin  (BEYOND LABS — observability)"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prometheus",
    "config": {
      "per_consumer": true,
      "status_code_metrics": true,
      "latency_metrics": true,
      "bandwidth_metrics": true,
      "upstream_health_metrics": true
    }
  }' > /dev/null
echo ""

# =============================================================================
# BEYOND-LABS PLUGIN 3: Response Transformer (global)
# Injects metadata headers into every response sent back to the browser.
# This is middleware transformation — the client sees clean API versioning
# and gateway attribution without any backend service knowing about it.
# Headers added:
#   X-API-Version: v1             — semantic versioning for the API surface
#   X-Powered-By: FunFare-Kong    — gateway attribution
# =============================================================================
echo ">>> [Global] Response Transformer plugin  (BEYOND LABS — API metadata)"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "response-transformer",
    "config": {
      "add": {
        "headers": [
          "X-API-Version:v1",
          "X-Powered-By:FunFare-Kong"
        ]
      }
    }
  }' > /dev/null
echo ""

# =============================================================================
# BEYOND-LABS PLUGIN 4: Request Transformer (global)
# Kong's key-auth plugin already injects X-Consumer-Username, X-Consumer-ID,
# and X-Consumer-Custom-ID into every forwarded request after validating the
# API key. This request transformer complements that by also adding:
#   X-Gateway-Name: FunFare        — lets backend services log gateway source
#   X-Forwarded-Apiversion: v1     — propagate API version downstream
# This pattern (gateway-injected identity) means backend services never
# need to parse or validate the API key themselves — Kong handles it and
# passes clean identity headers through.
# =============================================================================
echo ">>> [Global] Request Transformer plugin  (BEYOND LABS — header injection)"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "request-transformer",
    "config": {
      "add": {
        "headers": [
          "X-Gateway-Name:FunFare",
          "X-Forwarded-Apiversion:v1"
        ]
      },
      "remove": {
        "headers": ["X-Powered-By-Upstream"]
      }
    }
  }' > /dev/null
echo ""

# =============================================================================
# 3. AUTHENTICATION: Consumers
# =============================================================================

echo "======================================="
echo "  STEP 3: Consumers + Credentials"
echo "======================================="

echo ">>> Creating consumer: user  (regular transit user)"
curl -sf -X POST "$KONG_ADMIN/consumers" \
  -H "Content-Type: application/json" \
  -d '{"username": "user"}' > /dev/null
curl -sf -X POST "$KONG_ADMIN/consumers/user/key-auth" \
  -H "Content-Type: application/json" \
  -d '{"key": "user123"}' > /dev/null
echo ""

echo ">>> Creating consumer: admin  (admin panel access)"
curl -sf -X POST "$KONG_ADMIN/consumers" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' > /dev/null
curl -sf -X POST "$KONG_ADMIN/consumers/admin/key-auth" \
  -H "Content-Type: application/json" \
  -d '{"key": "admin123"}' > /dev/null
curl -sf -X POST "$KONG_ADMIN/consumers/admin/acls" \
  -H "Content-Type: application/json" \
  -d '{"group": "admins"}' > /dev/null
echo ""

# =============================================================================
# 4. AUTHORISATION: ACL on admin-only route
# =============================================================================

echo "======================================="
echo "  STEP 4: ACL (Admin Routes)"
echo "======================================="

echo ">>> ACL plugin on interim-refund-service-route  (admins only)"
curl -sf -X POST "$KONG_ADMIN/routes/interim-refund-service-route/plugins" \
  -H "Content-Type: application/json" \
  -d '{"name": "acl", "config": {"allow": ["admins"]}}' > /dev/null
echo ""

# =============================================================================
# BEYOND-LABS FEATURE 5: Tiered Rate Limiting per route
# Each route gets a rate limit appropriate to its business logic:
#
#  Transit routes    (tap-in, tap-out)        → 10/min
#    A commuter can physically tap maybe once every few minutes.
#    More than 10/min signals automated abuse or card cloning.
#
#  Sensitive ops     (concession, lost-card)  →  5/min
#    These are once-in-a-while actions — no legitimate user submits
#    a lost card report 5 times per minute.
#
#  Admin ops         (interim-refund)         →  5/min
#    Already ACL-restricted to admins; low limit prevents bulk misuse.
#
#  Payment ops       (payment-service routes) → 20/min
#    Slightly higher to accommodate Stripe webhook retries.
#
#  Data reads        (card, wallet, user)     → 60/min
#    Normal browsing/polling — generous but still bounded.
#
# When the limit is hit, Kong immediately returns 429 Too Many Requests
# with headers: X-RateLimit-Remaining-Minute and X-RateLimit-Limit-Minute
# so the client knows exactly how long to wait.
# =============================================================================

echo "======================================="
echo "  STEP 5: Tiered Rate Limiting  (BEYOND LABS)"
echo "======================================="

# Transit routes — physical tap operations
echo ">>> Rate limits: Transit routes (10/min)"
add_rate_limit "tapin-service-route"  10
add_rate_limit "tapout-service-route" 10

# Sensitive composite operations
echo ">>> Rate limits: Sensitive ops (5/min)"
add_rate_limit "concession-service-route"    5
add_rate_limit "lost-card-service-route"     5
add_rate_limit "interim-refund-service-route" 5

# Payment gateway operations
echo ">>> Rate limits: Payment ops (20/min, 200/hour)"
add_rate_limit "payment-service-route" 20 200

# High-volume data reads
echo ">>> Rate limits: Data reads (60/min)"
add_rate_limit "card-service-route"   60
add_rate_limit "wallet-service-route" 60
add_rate_limit "user-service-route"   60
add_rate_limit "trip-service-route"   60
add_rate_limit "verify-service-route" 30
echo ""

echo "=============================="
echo "Kong setup complete!"
echo ""
echo "Proxy:       http://localhost:8000"
echo "Manager:     http://localhost:8002"
echo "Admin API:   http://localhost:8001"
echo "Metrics:     http://localhost:8100/metrics"
echo "Prometheus:  http://localhost:9090"
echo "Grafana:     http://localhost:3100  (admin / funfare123)"
echo ""
echo "API Keys:"
echo "  user  → apikey: user123"
echo "  admin → apikey: admin123"
echo ""
echo "BEYOND-LABS features active:"
echo "  ✓ Kong Upstreams with active health checks (tapin, tapout)"
echo "  ✓ Tiered rate limiting per route"
echo "  ✓ Correlation ID  (X-Kong-Request-ID on every request)"
echo "  ✓ Prometheus metrics + Grafana dashboard"
echo "  ✓ Response Transformer (X-API-Version, X-Powered-By)"
echo "  ✓ Request Transformer (X-Gateway-Name forwarded to all upstreams)"
echo "=============================="
