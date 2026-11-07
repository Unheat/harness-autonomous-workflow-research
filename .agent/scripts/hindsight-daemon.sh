#!/usr/bin/env bash
# ==============================================================================
# Hindsight Daemon Lifecycle Manager
# Starts local PostgreSQL (pg0) and Hindsight Embedded daemon
# Powered by 9router (stacks) and local embeddings
# ==============================================================================

PROJECT_DIR="/Users/dangtruongan/study/workflow"
RUNTIME_DIR="$PROJECT_DIR/.hindsight-runtime"
PROFILE="hermes"
PORT=8888

export HOME="$RUNTIME_DIR"
export UV_TOOL_DIR="/tmp/uv-tools"
export UV_CACHE_DIR="/tmp/uv-cache"

case "${1:-status}" in
  start)
    echo "Starting Hindsight dependencies..."
    # Check if PostgreSQL on 5432 is running
    if ! lsof -i :5432 >/dev/null 2>&1; then
      echo "Starting embedded PostgreSQL..."
      /private/tmp/uv-cache/archive-v0/dxjHFq3krXmC4dOg/lib/python3.12/site-packages/pg0/bin/pg0 start --name "hindsight-embed-$PROFILE" >/dev/null 2>&1 || true
      sleep 2
    fi

    # Start daemon
    uvx hindsight-embed -p "$PROFILE" daemon start
    ;;

  stop)
    echo "Stopping Hindsight daemon..."
    uvx hindsight-embed -p "$PROFILE" daemon stop 2>/dev/null || true
    echo "Stopping embedded PostgreSQL..."
    /private/tmp/uv-cache/archive-v0/dxjHFq3krXmC4dOg/lib/python3.12/site-packages/pg0/bin/pg0 stop --name "hindsight-embed-$PROFILE" 2>/dev/null || true
    echo "Stopped."
    ;;

  status)
    echo "=== Hindsight Status ==="
    uvx hindsight-embed -p "$PROFILE" daemon status 2>/dev/null || echo "Daemon: stopped"
    if curl -s http://127.0.0.1:$PORT/health >/dev/null 2>&1; then
      echo "API Endpoint: http://127.0.0.1:$PORT (HEALTHY)"
      curl -s http://127.0.0.1:$PORT/health
      echo ""
    else
      echo "API Endpoint: not responding"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
