#!/bin/sh
# Start Supergateway on $PORT with the deployer's config, the volume's config or the default.
set -eu

: "${PORT:=8000}"
if [ -z "${SUPERGATEWAY_API_KEY:-}" ] && [ -z "${SUPERGATEWAY_API_KEY_FILE:-}" ]; then
  echo "SUPERGATEWAY_API_KEY is not set: refusing to serve MCP servers without an API key." >&2
  exit 1
fi

mkdir -p /data/files /data/memory /data/.cache

if [ -n "${SUPERGATEWAY_CONFIG:-}" ]; then
  # Full config from a variable (JSON, or base64 of it).
  case "$SUPERGATEWAY_CONFIG" in
    \{*) printf '%s' "$SUPERGATEWAY_CONFIG" > /tmp/supergateway.json ;;
    *) printf '%s' "$SUPERGATEWAY_CONFIG" | base64 -d > /tmp/supergateway.json ;;
  esac
  CONFIG=/tmp/supergateway.json
elif [ -f /data/supergateway.json ]; then
  CONFIG=/data/supergateway.json
else
  CONFIG=/app/default-config.json
fi
echo "Supergateway $(supergateway --version) on port $PORT, config $CONFIG"

# stdin from /dev/null keeps the gateway running; it exits non-zero if it fails,
# so Railway's ON_FAILURE restart policy brings it back.
exec supergateway --config "$CONFIG" --port "$PORT" --logLevel "${SUPERGATEWAY_LOG_LEVEL:-info}" </dev/null
