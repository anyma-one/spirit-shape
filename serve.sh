#!/bin/sh
# Serve the built Spirit Animal app (Phase 1) for local + LAN testing.
# Needs only python3 — no Node required to run the already-built app.
#
# Usage:  ./serve.sh          (defaults to port 8000)
#         PORT=9000 ./serve.sh
#
# Rebuild after code changes (requires Node):  npm run build
PORT="${PORT:-8000}"
DIR="$(cd "$(dirname "$0")" && pwd)/dist"

if [ ! -f "$DIR/index.html" ]; then
  echo "No build found in dist/. Run 'npm run build' first (needs Node)." >&2
  exit 1
fi

echo "Serving Spirit Animal (Phase 1) from $DIR"
echo "  Local:   http://localhost:$PORT/"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
[ -n "$LAN_IP" ] && echo "  Network: http://$LAN_IP:$PORT/   (same Wi-Fi/LAN)"
echo "Press Ctrl-C to stop."
cd "$DIR" || exit 1
exec python3 -m http.server "$PORT" --bind 0.0.0.0
