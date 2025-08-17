const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Use a dedicated persistent user-data directory so the app has a consistent
// "Chrome profile" (cookies, localStorage, session data). This helps reduce
// issues where streaming services block access because of missing or ephemeral
// profile state. This must be set before the browser starts.
const defaultProfileDir = path.join(app.getPath('userData'), 'chrome-profile');
app.setPath('userData', defaultProfileDir);
// Also pass the same folder to Chromium via command line to be explicit.
app.commandLine.appendSwitch('user-data-dir', defaultProfileDir);

// Expose the profile path to the renderer via an environment variable so the
// UI can open the folder or launch Chrome with the same profile for toggling
// protected content settings.
process.env.APP_PROFILE_DIR = defaultProfileDir;

// Optional: read a user-supplied Widevine config file from the profile.
// If present, pass the CDM path/version to Chromium so Electron can load it.
try {
  const widevineCfgPath = path.join(defaultProfileDir, 'widevine.json');
  if (fs.existsSync(widevineCfgPath)) {
    const raw = fs.readFileSync(widevineCfgPath, 'utf8');
    const cfg = JSON.parse(raw);
    if (cfg.path) {
      // cfg.path may be a folder (WidevineCdm) or a direct path to the
      // native library. If it's a folder, try to locate the platform binary
      // inside it and use that file path.
      let resolvedPath = cfg.path;
      try {
        const stat = fs.statSync(cfg.path);
        if (stat.isDirectory()) {
          // search for known CDM file names inside the folder recursively
          const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const p = path.join(dir, e.name);
              if (e.isDirectory()) {
                const r = walk(p);
                if (r) return r;
              } else {
                // common names: libwidevinecdm.so, libwidevinecdm.dylib, widevinecdm.dll
                if (/libwidevinecdm\.(so|dylib)$/.test(e.name) || /widevinecdm\.dll$/i.test(e.name)) {
                  return p;
                }
              }
            }
            return null;
          };
          const found = walk(cfg.path);
          if (found) resolvedPath = found;
        }
      } catch (e) {
        // ignore stat errors and fallback to raw cfg.path
      }
      console.log('Using Widevine CDM path:', resolvedPath);
      app.commandLine.appendSwitch('widevine-cdm-path', resolvedPath);
    }
    if (cfg.version) {
      app.commandLine.appendSwitch('widevine-cdm-version', cfg.version);
    }
  }
} catch (e) {
  // ignore parse errors; do not crash the app for a bad config
}

app.disableHardwareAcceleration(); // évite libva errors

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    fullscreenable: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      partition: 'persist:mediacenter'
    }
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
