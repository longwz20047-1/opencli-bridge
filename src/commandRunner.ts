import spawn from 'cross-spawn';
import path from 'path';
import type { BridgeCommand, BridgeResult } from './shared/types';

// Resolve bundled opencli path
const OPENCLI_BIN = path.join(__dirname, '..', 'node_modules', '@jackwener', 'opencli', 'dist', 'main.js');

const MAX_CONCURRENT = 3;
export const MAX_QUEUE = 100;
let running = 0;
const queue: Array<{ cmd: BridgeCommand; resolve: (r: BridgeResult) => void }> = [];

function processQueue(): void {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    running++;
    executeCommand(item.cmd)
      .then(item.resolve)
      .finally(() => {
        running--;
        processQueue();
      });
  }
}

export function execute(cmd: BridgeCommand): Promise<BridgeResult> {
  if (queue.length >= MAX_QUEUE) {
    return Promise.resolve({
      type: 'result',
      id: cmd.id,
      success: false,
      stdout: '',
      stderr: `Command queue full (${queue.length}/${MAX_QUEUE}). Please wait.`,
      exitCode: -1,
      durationMs: 0,
    });
  }
  return new Promise((resolve) => {
    queue.push({ cmd, resolve });
    processQueue();
  });
}

async function executeCommand(cmd: BridgeCommand): Promise<BridgeResult> {
  const start = Date.now();
  const args = [cmd.site, cmd.action, ...cmd.args, '-f', 'json'];

  // Strip Electron env vars
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  return new Promise((resolve) => {
    // Use bundled opencli via node
    const child = spawn('node', [OPENCLI_BIN, ...args], { env });
    let stdout = '';
    let stderr = '';
    let resolved = false;

    // Manual timeout implementation
    const timeout = cmd.timeout || 30000;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGTERM');
        resolve({
          type: 'result',
          id: cmd.id,
          success: false,
          stdout: stdout.trim(),
          stderr: `Command timed out after ${timeout}ms`,
          exitCode: 124, // Standard timeout exit code
          durationMs: Date.now() - start,
        });
      }
    }, timeout);

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d;
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d;
    });
    child.on('close', (code: number | null) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          type: 'result',
          id: cmd.id,
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
          durationMs: Date.now() - start,
        });
      }
    });
    child.on('error', (err: Error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          type: 'result',
          id: cmd.id,
          success: false,
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          durationMs: Date.now() - start,
        });
      }
    });
  });
}
