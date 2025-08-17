#!/usr/bin/env node
// setup_widevine.js
// Usage: node setup_widevine.js --src /path/to/cdm_folder --version 1.4.9.1088
// This script copies the CDM files from a source folder into the app's
// profile folder and writes widevine.json with path/version.

const fs = require('fs');
const path = require('path');
const os = require('os');

function usage() {
  console.log('Usage: node setup_widevine.js --src /absolute/path/to/cdm_folder --version <cdm-version>');
  console.log('Example: node setup_widevine.js --src "/Users/me/Downloads/widevine" --version 1.4.9.1088');
}

const argv = require('minimist')(process.argv.slice(2));
if (argv.help || argv.h) { usage(); process.exit(0); }

const src = argv.src || argv.s;
const version = argv.version || argv.v;

if (!src || !version) { usage(); process.exit(1); }

if (!path.isAbsolute(src)) {
  console.error('Please pass an absolute path for --src');
  process.exit(1);
}

// Locate app profile dir -- matches main.js behavior
const userData = path.join(require('os').homedir(), 'Library', 'Application Support', 'mediacenter');
const profileDir = path.join(userData, 'chrome-profile');

console.log('Profile dir:', profileDir);

if (!fs.existsSync(src)) { console.error('Source path does not exist:', src); process.exit(1); }

fs.mkdirSync(profileDir, { recursive: true });

// copy files
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const targetCdmDir = path.join(profileDir, 'widevine-cdm');
copyRecursiveSync(src, targetCdmDir);

const cfg = {
  path: targetCdmDir,
  version: version
};
fs.writeFileSync(path.join(profileDir, 'widevine.json'), JSON.stringify(cfg, null, 2), 'utf8');

console.log('Widevine files copied to:', targetCdmDir);
console.log('widevine.json created with version:', version);
console.log('Restart the app. If compatible, Widevine should be loaded by Chromium.');
