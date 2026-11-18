#!/usr/bin/env node
/**
 * scripts/dev-runner.cjs
 *
 * Launches the local development environment:
 * 1. Sanitizes process.env to remove ELECTRON_RUN_AS_NODE (preventing IDE terminals
 *    from causing Electron to run as plain Node.js).
 * 2. Runs brand-electron-dev.cjs to brand the Electron dev bundle as mocktwo.
 * 3. Dynamically finds an open port starting at 5173.
 * 4. Launches Vite with --port <port> --strictPort and Electron pointing to that port.
 * 5. Handles cross-process teardown on SIGINT/SIGTERM.
 */

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

// Crucial: remove ELECTRON_RUN_AS_NODE leaked by IDE shells (VSCode / Antigravity terminal)
delete process.env.ELECTRON_RUN_AS_NODE;

const rootDir = path.resolve(__dirname, '..');

// 1. Run branding script
require('./brand-electron-dev.cjs');

// 2. Find a free port starting at 5173
function getFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function start() {
  const port = await getFreePort(5173);
  const host = '127.0.0.1';
  const devUrl = `http://${host}:${port}`;
  console.log(`[dev-runner] Selected development port: ${port}`);

  const isWin = process.platform === 'win32';
  const concurrentlyBin = path.join(rootDir, 'node_modules', '.bin', isWin ? 'concurrently.cmd' : 'concurrently');

  const binDir = path.join(rootDir, 'node_modules', '.bin');
  const pathDelimiter = isWin ? ';' : ':';
  const env = {
    ...process.env,
    PATH: `${binDir}${pathDelimiter}${process.env.PATH || ''}`,
    VITE_DEV_HOST: host,
    VITE_DEV_PORT: String(port),
    VITE_DEV_SERVER_URL: devUrl,
  };

  const viteCmd = `vite --host ${host} --port ${port} --strictPort`;
  const electronCmd = `wait-on tcp:${port} && electron .`;

  const child = spawn(
    concurrentlyBin,
    ['-k', viteCmd, electronCmd],
    {
      cwd: rootDir,
      stdio: 'inherit',
      env,
    }
  );

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });

  const cleanup = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

start().catch((err) => {
  console.error('[dev-runner] Failed to start:', err);
  process.exit(1);
});
