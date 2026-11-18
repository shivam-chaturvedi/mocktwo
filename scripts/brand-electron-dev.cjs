#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (process.platform !== 'darwin') {
  console.log('[brand-electron-dev] Non-macOS platform detected, skipping dev bundle branding.');
  process.exit(0);
}

const rootDir = path.resolve(__dirname, '..');

// Helper to load environment variables from .env or .env.example
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  const target = fs.existsSync(envPath) ? envPath : (fs.existsSync(envExamplePath) ? envExamplePath : null);

  if (target) {
    try {
      const content = fs.readFileSync(target, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('[brand-electron-dev] Note: Could not read env file:', e.message);
    }
  }
}

loadEnv();

const pkgPath = path.join(rootDir, 'package.json');
let pkg = {};
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch {}

const APP_NAME = process.env.APP_NAME || pkg.productName || pkg.name || 'mocktwo';
const APP_VERSION = process.env.APP_VERSION || pkg.version || '1.0.0';
const APP_ID = process.env.APP_ID || pkg.build?.appId || 'com.mocktwo.app';
const CAMERA_USAGE = pkg.build?.mac?.extendInfo?.NSCameraUsageDescription ||
  `${APP_NAME} uses your camera to measure optical blood volume pulse and facial composure signals during rehearsal simulations. Video is analyzed locally in real time and is never recorded, stored, or transmitted.`;
const MIC_USAGE = pkg.build?.mac?.extendInfo?.NSMicrophoneUsageDescription ||
  `${APP_NAME} uses your microphone for real-time speech and tone analysis during rehearsal simulations. Audio is processed locally on your device.`;

const appBundle = path.join(rootDir, 'node_modules', 'electron', 'dist', 'Electron.app');
const infoPlist = path.join(appBundle, 'Contents', 'Info.plist');
const macosDir = path.join(appBundle, 'Contents', 'MacOS');
const originalExec = path.join(macosDir, 'Electron');
const brandedExec = path.join(macosDir, APP_NAME);
const electronPathTxt = path.join(rootDir, 'node_modules', 'electron', 'path.txt');
const resourcesDir = path.join(appBundle, 'Contents', 'Resources');
const targetIcns = path.join(resourcesDir, 'electron.icns');
const sourceIcns = path.join(rootDir, 'build', 'icon.icns');

if (!fs.existsSync(appBundle)) {
  console.log('[brand-electron-dev] Electron.app not found in node_modules, skipping.');
  process.exit(0);
}

if (!fs.existsSync(infoPlist)) {
  console.warn('[brand-electron-dev] Info.plist not found at', infoPlist);
  process.exit(0);
}

try {
  // 1. Ensure branded executable exists in Contents/MacOS/
  if (fs.existsSync(originalExec) && APP_NAME !== 'Electron') {
    fs.copyFileSync(originalExec, brandedExec);
    fs.chmodSync(brandedExec, 0o755);
    console.log(`[brand-electron-dev] Created branded binary at Contents/MacOS/${APP_NAME}`);
  }

  // 2. Update node_modules/electron/path.txt (without trailing newline)
  if (fs.existsSync(brandedExec)) {
    fs.writeFileSync(electronPathTxt, `Electron.app/Contents/MacOS/${APP_NAME}`, 'utf8');
    console.log(`[brand-electron-dev] Updated electron/path.txt -> Electron.app/Contents/MacOS/${APP_NAME}`);
  }

  // 3. Update Info.plist with exact metadata & versioning
  const keysToSet = [
    { key: 'CFBundleName', value: APP_NAME },
    { key: 'CFBundleDisplayName', value: APP_NAME },
    { key: 'CFBundleIdentifier', value: APP_ID },
    { key: 'CFBundleExecutable', value: APP_NAME },
    { key: 'CFBundleShortVersionString', value: APP_VERSION },
    { key: 'CFBundleVersion', value: APP_VERSION },
    { key: 'CFBundleGetInfoString', value: `${APP_NAME} ${APP_VERSION}` },
    { key: 'NSCameraUsageDescription', value: CAMERA_USAGE },
    { key: 'NSMicrophoneUsageDescription', value: MIC_USAGE }
  ];

  for (const { key, value } of keysToSet) {
    execFileSync('/usr/bin/plutil', ['-replace', key, '-string', value, infoPlist]);
  }
  console.log(`[brand-electron-dev] Updated Info.plist: name="${APP_NAME}", version="${APP_VERSION}", id="${APP_ID}"`);

  // 4. Copy app icon if source exists
  if (fs.existsSync(sourceIcns)) {
    fs.copyFileSync(sourceIcns, targetIcns);
    console.log('[brand-electron-dev] Replaced electron.icns with build/icon.icns');
  }

  // 5. Force-reregister with macOS LaunchServices so Dock and system caches update immediately
  const lsregisterPath = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
  if (fs.existsSync(lsregisterPath)) {
    try {
      execFileSync(lsregisterPath, ['-f', '-R', appBundle]);
      console.log('[brand-electron-dev] Re-registered app bundle with LaunchServices.');
    } catch (e) {
      console.warn('[brand-electron-dev] lsregister warning:', e.message);
    }
  }

  // 6. Ad-hoc codesign Electron.app with entitlements & hardened runtime
  try {
    const entitlementsPath = path.join(rootDir, 'build', 'entitlements.mac.plist');
    const codesignArgs = ['--force', '--deep', '--sign', '-'];
    if (fs.existsSync(entitlementsPath)) {
      codesignArgs.push('--entitlements', entitlementsPath);
    }
    codesignArgs.push(appBundle);
    execFileSync('/usr/bin/codesign', codesignArgs);
    console.log('[brand-electron-dev] Re-signed Electron.app bundle with entitlements & ad-hoc signature.');
  } catch (e) {
    console.warn('[brand-electron-dev] codesign warning:', e.message);
  }

  // 7. Touch the bundle to notify macOS LaunchServices of metadata updates
  execFileSync('/usr/bin/touch', [appBundle]);
  console.log('[brand-electron-dev] Touched Electron.app bundle to invalidate system icon cache.');

  // 8. Restart macOS Dock process so hover tooltips and tile caches refresh immediately
  try {
    execFileSync('/usr/bin/killall', ['Dock']);
    console.log('[brand-electron-dev] Refreshed macOS Dock cache.');
  } catch {
    // Dock might not be running or killed silently
  }
} catch (error) {
  console.error('[brand-electron-dev] Failed to patch Electron.app bundle:', error.message);
}
