import spawn from 'cross-spawn';
import type { BridgeCommand, BridgeResult } from './types';

const MAX_CONCURRENT = 3;
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
    const child = spawn('opencli', args, { env, timeout: cmd.timeout || 30000 });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d;
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d;
    });
    child.on('close', (code: number | null) => {
      resolve({
        type: 'result',
        id: cmd.id,
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
        durationMs: Date.now() - start,
      });
    });
    child.on('error', (err: Error) => {
      resolve({
        type: 'result',
        id: cmd.id,
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        durationMs: Date.now() - start,
      });
    });
  });
}
