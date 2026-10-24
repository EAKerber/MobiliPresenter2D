#!/usr/bin/env bash
# CI only: prepare a validated buyer V5 on loopback. Not a protected-deploy test.
set -euo pipefail
key="${1:-}"
case "$key" in
  MOBILE_INTERACTIONS_URL|KEYBOARD_BROWSER_URL|FLOW_LAYOUT_URL|SUMMARY_PRICING_BROWSER_URL|STONE_BROWSER_URL) ;;
  *) echo "::error::Invalid local browser target env key"; exit 2 ;;
esac
npm install --no-package-lock --no-audit --no-fund
npm run build
npm run pages:check
node tests/ci/local-buyer-config-server.mjs > /tmp/m2d-local-v5-browser-server.log 2>&1 &
for i in $(seq 1 20); do
  if curl -fsS --max-time 2 http://127.0.0.1:8123/api/buyer-configuration -o /tmp/m2d-local-v5-browser.json; then
    status=$(curl -sS --max-time 3 -X POST -H 'Content-Type: application/json' -d '{}' -o /tmp/m2d-local-anonymous-session.json -w '%{http_code}' http://127.0.0.1:8123/api/access/session)
    test "$status" = 200
    node -e 'const assert=require("node:assert/strict");const s=require("/tmp/m2d-local-anonymous-session.json");assert.deepEqual(s,{authenticated:false});'
    echo "$key=http://127.0.0.1:8123/config/" >> "$GITHUB_ENV"
    echo "CI_EXPECT_PUBLISHED_V5=1" >> "$GITHUB_ENV"
    echo "CI_LOCAL_V5_BROWSER_TARGET_PASS: source build+projection, NOT authenticated Netlify preview"
    exit 0
  fi
  sleep 1
done
echo "::error::Validated local buyer V5 was not ready"
exit 1
