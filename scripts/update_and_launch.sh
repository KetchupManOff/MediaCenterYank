#!/usr/bin/env bash
set -euo pipefail

# update_and_launch.sh
# Usage: run this from your Linux Mint session autostart or manually.
# It will fetch from origin, compare local vs remote, pull the latest when safe,
# and finally launch the MediaCenter app.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "[mc-update] Repo: $REPO_ROOT"

# Helper: start the app using available runner (npm start, electron, npx)
start_app() {
  echo "[mc-update] Launching MediaCenter (opening index.html with Chromium --kiosk preferred)..."
  # Preferred: open index.html with Chromium in kiosk mode
  if [ -f index.html ]; then
    if command -v chromium >/dev/null 2>&1; then
      nohup chromium --kiosk "file://$REPO_ROOT/index.html" >/dev/null 2>&1 &
      return 0
    fi
    if command -v chromium-browser >/dev/null 2>&1; then
      nohup chromium-browser --kiosk "file://$REPO_ROOT/index.html" >/dev/null 2>&1 &
      return 0
    fi
    # fallback to system opener
    if command -v xdg-open >/dev/null 2>&1; then
      nohup xdg-open "file://$REPO_ROOT/index.html" >/dev/null 2>&1 &
      return 0
    fi
    if command -v sensible-browser >/dev/null 2>&1; then
      nohup sensible-browser "file://$REPO_ROOT/index.html" >/dev/null 2>&1 &
      return 0
    fi
    # As a last resort, try to open with python's simple HTTP server in background
    if command -v python3 >/dev/null 2>&1; then
      (cd "$REPO_ROOT" && nohup python3 -m http.server 0 >/dev/null 2>&1 &) || true
      # attempt to open localhost:8000/index.html
      if command -v xdg-open >/dev/null 2>&1; then
        nohup xdg-open "http://127.0.0.1:8000/index.html" >/dev/null 2>&1 &
        return 0
      fi
    fi
  fi

  # Fallbacks for dev setups: prefer npm start or electron if available
  if [ -f package.json ] && grep -q "\"start\"\s*:\s*\"" package.json; then
    echo "[mc-update] Using 'npm start' (start script found)"
    npm run start --silent || { echo "[mc-update] npm start failed"; return 1; }
    return 0
  fi

  if command -v electron >/dev/null 2>&1; then
    echo "[mc-update] Using 'electron .'"
    electron . || { echo "[mc-update] electron . failed"; return 1; }
    return 0
  fi

  if command -v npx >/dev/null 2>&1; then
    echo "[mc-update] Using 'npx electron .'"
    npx electron . || { echo "[mc-update] npx electron . failed"; return 1; }
    return 0
  fi

  echo "[mc-update] Could not find a way to launch the app (no browser or electron)."
  return 2
}

# Ensure we're in a git repo
if [ ! -d .git ]; then
  echo "[mc-update] No .git directory found. Skipping update check and starting app."
  start_app
  exit $?
fi

# Fetch remote updates
echo "[mc-update] Fetching from origin..."
# timeout for flaky network
if ! git fetch --all --prune --quiet; then
  echo "[mc-update] Warning: git fetch failed (network?). Will attempt to start app anyway."
  start_app
  exit $?
fi

# determine upstream ref to compare against
UPSTREAM_REF=""
if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  UPSTREAM_REF=$(git rev-parse --abbrev-ref --symbolic-full-name @{u})
else
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  UPSTREAM_REF="origin/$BRANCH"
fi

echo "[mc-update] Upstream ref: $UPSTREAM_REF"

LOCAL_HASH=$(git rev-parse @)
REMOTE_HASH=""
if REMOTE_HASH=$(git rev-parse "$UPSTREAM_REF" 2>/dev/null); then
  :
else
  echo "[mc-update] Remote ref $UPSTREAM_REF not found. Skipping update and starting app."
  start_app
  exit $?
fi

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  echo "[mc-update] Local is up-to-date ($LOCAL_HASH)."
  start_app
  exit $?
fi

echo "[mc-update] Update available: local $LOCAL_HASH -> remote $REMOTE_HASH"

# Check working tree cleanliness
is_clean=true
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files -u)" ]; then
  is_clean=false
fi

if [ "$is_clean" = true ]; then
  echo "[mc-update] Working tree clean — attempting fast-forward pull."
  if git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)"; then
    echo "[mc-update] Updated to latest."
    start_app
    exit $?
  else
    echo "[mc-update] Fast-forward pull failed."
  fi
else
  echo "[mc-update] Working tree has local changes. Creating a backup branch and stashing before update."
  BACKUP_BRANCH="local-backup-$(date +%Y%m%d%H%M%S)"
  git branch "$BACKUP_BRANCH" || true
  echo "[mc-update] Created backup branch: $BACKUP_BRANCH"
  echo "[mc-update] Stashing local changes..."
  git stash push -u -m "autostash before update $(date)" || true
  echo "[mc-update] Attempting fast-forward pull after stash..."
  if git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)"; then
    echo "[mc-update] Updated to latest. You have a stash if you need to reapply (git stash list)."
    start_app
    exit $?
  else
    echo "[mc-update] Pull failed after stashing; restoring stash and aborting update."
    git stash pop || true
    echo "[mc-update] Please update manually."
    start_app
    exit 1
  fi
fi

# fallback: start anyway
start_app
exit $?
