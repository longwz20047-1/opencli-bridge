// src/preload/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Channel whitelist patterns (naming convention based)
// invoke: request-response (renderer → main)
const ALLOWED_INVOKE_PATTERNS = [
  /^servers:(list|add|remove|reconnect)$/,
  /^history:(list|clear|stats|detail)$/,
  /^sites:(list|update|scan)$/,
  /^diag:(run|connectivity)$/,
  /^settings:(get|update)$/,
  /^update:(check|install)$/,
  /^command:test$/,
];

// subscribe: event push (main → renderer)
const ALLOWED_SUBSCRIBE_PATTERNS = [
  /^server:(status|paired)$/,
  /^command:(received|completed)$/,
  /^update:status$/,
  /^navigate$/,
];

contextBridge.exposeInMainWorld('bridge', {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!ALLOWED_INVOKE_PATTERNS.some((p) => p.test(channel))) {
      return Promise.reject(new Error(`IPC channel "${channel}" not allowed`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (!ALLOWED_SUBSCRIBE_PATTERNS.some((p) => p.test(channel))) {
      throw new Error(`IPC subscription to "${channel}" not allowed`);
    }
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
