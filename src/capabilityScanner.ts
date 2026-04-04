import { spawn } from 'child_process';
import path from 'path';

// Use the bundled opencli — same bin as commandRunner.ts to ensure consistency.
// In packaged Electron apps, asarUnpack'd files are at app.asar.unpacked/
// but child_process.spawn can't read from app.asar, so we replace the path.
function getOpencliPath(): string {
  const base = path.join(__dirname, '..', 'node_modules', '@jackwener', 'opencli', 'dist', 'main.js');
  return base.replace('app.asar', 'app.asar.unpacked');
}

/**
 * Async scan: discover available opencli sites from the bundled binary.
 * Uses the bundled @jackwener/opencli (not global), same as commandRunner.ts.
 * Returns [] if opencli unavailable or not installed.
 */
export function scanAvailableSites(): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn('node', [getOpencliPath(), 'list', '-f', 'json'], {
      timeout: 10000,
    });

    let stdout = '';
    child.stdout?.on('data', (d: Buffer) => { stdout += d; });
    child.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        resolve([]);
        return;
      }
      try {
        const data = JSON.parse(stdout.trim());
        if (Array.isArray(data)) {
          const sites = new Set<string>();
          for (const cmd of data) {
            if (cmd.site) sites.add(cmd.site);
          }
          resolve([...sites]);
        } else {
          resolve([]);
        }
      } catch {
        resolve([]);
      }
    });
    child.on('error', () => resolve([]));
  });
}
