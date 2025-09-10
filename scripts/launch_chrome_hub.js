#!/usr/bin/env node
// launch_chrome_hub.js
// Creates a minimal hub HTML inside the chrome-profile directory and launches
// Google Chrome with the provided profile, opening the hub and service tabs.
// test!


const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const homedir = require('os').homedir();
const profileDir = path.join(homedir, 'Library', 'Application Support', 'mediacenter', 'chrome-profile');

if (!fs.existsSync(profileDir)) {
  console.error('Profile dir not found:', profileDir);
  process.exit(1);
}

const hubHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Media Center Hub</title>
  <style>body{background:#111;color:#fff;font-family:Arial,sans-serif;margin:0;padding:20px} .tabs{display:flex;gap:10px} .tabs a{display:inline-block;padding:12px 18px;background:#222;border-radius:8px;color:#fff;text-decoration:none}</style>
</head>
<body>
  <h1>Media Center Hub</h1>
  <div class="tabs">
    <a href="https://www.netflix.com" target="_blank">Netflix</a>
    <a href="https://www.youtube.com" target="_blank">YouTube</a>
    <a href="https://www.primevideo.com" target="_blank">Prime Video</a>
    <a href="https://www.disneyplus.com" target="_blank">Disney+</a>
  </div>
  <p>Use the browser back to return to this hub.</p>
</body>
</html>`;

const hubPath = path.join(profileDir, 'mediacenter-hub.html');
fs.writeFileSync(hubPath, hubHtml, 'utf8');

console.log('Hub created at', hubPath);

// Build the chrome command for macOS, Windows, Linux
const platform = process.platform;
let cmd;
if (platform === 'darwin') {
  cmd = `open -a "Google Chrome" --args --user-data-dir="${profileDir}" --new-window "file://${hubPath}" --start-fullscreen`;
} else if (platform === 'win32') {
  const chrome = '"%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"';
  cmd = `cmd /c start "" ${chrome} --user-data-dir="${profileDir}" --new-window "file://${hubPath}" --start-fullscreen`;
} else {
  cmd = `google-chrome --user-data-dir="${profileDir}" --new-window "file://${hubPath}" --start-fullscreen || chromium --user-data-dir="${profileDir}" --new-window "file://${hubPath}" --start-fullscreen`;
}

console.log('Launching Chrome...');
exec(cmd, (err) => {
  if (err) {
    console.error('Failed to launch Chrome:', err.message);
    process.exit(1);
  }
  console.log('Chrome launched');
});
