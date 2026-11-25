#!/usr/bin/env bash
# CI only: prepare a validated buyer V5 on an ephemeral loopback port.
# The caller must add an `if: always()` step running stop-local-v5-browser.sh.
set -euo pipefail
key="${1:-}"
case "$key" in
  MOBILE_INTERACTIONS_URL|KEYBOARD_BROWSER_URL|FLOW_LAYOUT_URL|SUMMARY_PRICING_BROWSER_URL|STONE_BROWSER_URL) ;;
  *) echo "::error::Invalid local browser target env key"; exit 2 ;;
esac
npm install --no-package-lock --no-audit --no-fund
npm run build
npm run pages:check
log="/tmp/m2d-local-v5-browser-server-${GITHUB_RUN_ID:-local}-$$.log"
pid_file="/tmp/m2d-local-v5-browser-server.pid"
CI_LOCAL_CONFIG_PORT=0 node tests/ci/local-buyer-config-server.mjs >"$log" 2>&1 &
pid=$!
echo "$pid" > "$pid_file"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "CI_LOCAL_CONFIG_PID=$pid" >> "$GITHUB_ENV"
  echo "CI_LOCAL_CONFIG_LOG=$log" >> "$GITHUB_ENV"
  echo "CI_LOCAL_CONFIG_PID_FILE=$pid_file" >> "$GITHUB_ENV"
else
  echo "CI_LOCAL_CONFIG_PID=$pid"
  echo "CI_LOCAL_CONFIG_LOG=$log"
fi
ready=""
for i in $(seq 1 30); do
  if ! kill -0 "$pid" 2>/dev/null; then
    cat "$log"
    echo "::error::Validated local buyer V5 exited before readiness"
    exit 1
  fi
  ready=$(grep -m1 '^CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY ' "$log" || true)
  if [[ -n "$ready" ]]; then break; fi
  sleep 1
done
if [[ -z "$ready" ]]; then
  cat "$log"
  echo "::error::Validated local buyer V5 readiness timed out"
  exit 1
fi
port=$(node -e 'const row=process.argv[1].replace(/^CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY /,"");const info=JSON.parse(row);if(!Number.isInteger(info.port)||info.port<1||info.port>65535||info.schema!=="ConfiguratorAdministration2D 5.0"||info.buyerSchema!=="BuyerConfiguratorPayload 1.0")process.exit(2);process.stdout.write(String(info.port))' "$ready")
base="http://127.0.0.1:$port"
buyer_json="/tmp/m2d-local-v5-browser-${GITHUB_RUN_ID:-local}-$$.json"
session_json="/tmp/m2d-local-anonymous-session-${GITHUB_RUN_ID:-local}-$$.json"
curl -fsS --max-time 3 "$base/api/buyer-configuration" -o "$buyer_json"
node -e 'const assert=require("node:assert/strict");const p=require(process.argv[1]);assert.equal(p.schemaVersion,"BuyerConfiguratorPayload 1.0");assert(p.flow&&Array.isArray(p.flow.stages));' "$buyer_json"
status=$(curl -sS --max-time 3 -X POST -H 'Content-Type: application/json' -d '{}' -o "$session_json" -w '%{http_code}' "$base/api/access/session")
test "$status" = 200
node -e 'const assert=require("node:assert/strict");const s=require(process.argv[1]);assert.deepEqual(s,{authenticated:false});' "$session_json"
curl -fsS --max-time 3 "$base/config/" -o /dev/null
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "$key=$base/config/" >> "$GITHUB_ENV"
  echo "CI_LOCAL_CONFIG_BASE_URL=$base" >> "$GITHUB_ENV"
  echo "CI_EXPECT_PUBLISHED_V5=1" >> "$GITHUB_ENV"
else
  echo "$key=$base/config/"
  echo "CI_LOCAL_CONFIG_BASE_URL=$base"
  echo "CI_EXPECT_PUBLISHED_V5=1"
fi
echo "CI_LOCAL_V5_BROWSER_TARGET_PASS: validated V5/Buyer DTO, explicit readiness, anonymous session, loopback assets; not authenticated Netlify preview"
