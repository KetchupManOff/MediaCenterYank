#!/usr/bin/env node
/**
 * build_standalone.js
 * Produces MediaCenter-standalone.html — a single self-contained file that can
 * be opened directly in any browser without Electron or a local server.
 *
 * What it does:
 *   1. Reads the current git commit hash and bakes it into window.__STANDALONE_HASH__
 *   2. Inlines MediaCenterHub.css as a <style> block
 *   3. Base64-encodes every local logo referenced by <img src="logos/...">
 *   4. Writes the result to MediaCenter-standalone.html at the repo root
 *
 * Usage:
 *   node scripts/build_standalone.js
 *   — or —
 *   npm run build
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT  = path.join(ROOT, 'MediaCenter-standalone.html');

// ── 1. Git hash ────────────────────────────────────────────────────────────
let hash;
try {
  hash = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
} catch (e) {
  console.error('ERROR: Could not read git hash. Make sure you are inside a git repo.');
  process.exit(1);
}
console.log(`[build] git hash: ${hash.slice(0, 7)}`);

// ── 2. Read source files ───────────────────────────────────────────────────
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css  = fs.readFileSync(path.join(ROOT, 'MediaCenterHub.css'), 'utf8');

// ── 3. Inline CSS ─────────────────────────────────────────────────────────
html = html.replace(
  '<link rel="stylesheet" href="MediaCenterHub.css">',
  `<style>\n${css}\n</style>`
);

// ── 4. Base64-encode local logo images ────────────────────────────────────
const logoDir = path.join(ROOT, 'logos');

// Find every src="logos/FILENAME" reference in the HTML
const logoRefs = new Set();
const srcPattern = /src="logos\/([^"]+)"/g;
let m;
while ((m = srcPattern.exec(html)) !== null) {
  logoRefs.add(m[1]);
}

for (const filename of logoRefs) {
  const filepath = path.join(logoDir, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`[build] WARNING: logo not found, skipping: ${filename}`);
    continue;
  }

  const data = fs.readFileSync(filepath);
  const ext  = path.extname(filename).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  const dataUri = `data:${mime};base64,${data.toString('base64')}`;

  // Escape any regex special characters in the filename (e.g. dots, spaces)
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(
    new RegExp(`src="logos/${escaped}"`, 'g'),
    `src="${dataUri}"`
  );
  console.log(`[build] embedded logo: ${filename} (${(data.length / 1024).toFixed(1)} KB)`);
}

// ── 5. Inject standalone hash right after <head> ──────────────────────────
html = html.replace(
  '<head>',
  `<head>\n    <script>window.__STANDALONE_HASH__ = '${hash}';</script>`
);

// ── 6. Update <title> ─────────────────────────────────────────────────────
html = html.replace(
  '<title>Media Center Hub (static)</title>',
  '<title>Media Center Hub</title>'
);

// ── 7. Write output ───────────────────────────────────────────────────────
fs.writeFileSync(OUT, html, 'utf8');

const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`[build] ✓  MediaCenter-standalone.html written (${sizeKB} KB)`);
console.log(`[build]    Hash baked in: ${hash}`);
console.log(`[build]    Open in Chrome: open MediaCenter-standalone.html`);
