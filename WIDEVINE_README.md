Obtaining and using Widevine CDM with this Electron app

Important: Widevine CDM is proprietary software distributed by Google. This
README explains how to obtain the CDM binaries and configure this app to use
them. You must follow Google and individual platform licensing terms.

Overview
- Electron's official binary builds generally do NOT ship Widevine CDM
  due to licensing reasons.
- If you obtain Widevine CDM for your platform and provide the path and
  version in a `widevine.json` file placed inside the app's persistent
  profile directory, the app will pass the appropriate switches to
  Chromium so it can attempt to load the CDM at runtime.

Steps (macOS / Linux / Windows)
1. Find the app profile directory used by this app. By default it's under:

   macOS: ~/Library/Application Support/<YourAppName>/chrome-profile
   Linux: ~/.config/<YourAppName>/chrome-profile
   Windows: %APPDATA%\\<YourAppName>\\chrome-profile

   

   Replace <YourAppName> with the app internal name (Electron uses the
   package name unless overridden). You can also inspect the `user-data`
   path printed by the app or find the `chrome-profile` directory after
   running the app once.

2. Obtain Widevine CDM binaries for your platform.
   - The easiest supported route is to use an existing Chromium/Chrome
     installation that already contains Widevine. On some platforms you
     can copy the CDM files from a local Chrome installation into a folder
     and point `widevine-cdm-path` to it. Exact filenames and layout differ
     by platform and Chrome version.
   - Another route is to use a Chromium build that includes Widevine (not
     provided by Electron upstream). Building Chromium with Widevine is
     non-trivial and outside the scope of this README.

3. Create `widevine.json` inside the `chrome-profile` directory. Example:

{
  "path": "/absolute/path/to/widevine/cdm/folder/or/library",
  "version": "1.4.9.1088"
}

- `path` should point to the CDM library or folder as expected by the
  Chromium version you're running. On macOS this often points to a
  `libwidevinecdm.dylib`, on Linux to `libwidevinecdm.so`, on Windows to
  `widevinecdm.dll`.
- `version` is optional but recommended; it sets Chromium's expected CDM
  version and may be required by some Chrome/Electron versions.

4. Restart the app. If the CDM is compatible, Chromium may load it and
   `navigator.requestMediaKeySystemAccess('com.widevine.alpha', ...)`
   should succeed for DRM-enabled content.

Limitations and warnings
- Compatibility: Widevine CDM must match the Chromium/Chromium-based
  runtime version provided by Electron. Mismatched versions may fail to load.
- Licensing: You are responsible for obtaining Widevine legally and
  complying with license terms.
- Support: This project does not automate CDM downloads due to licensing.

If you want, I can:
- Add a small UI to help open the `chrome-profile` folder and create the
  `widevine.json` template for you, or
- Attempt an automated extraction from a locally installed Chrome (risky
  and platform-specific) — ask for details before proceeding.
