// src/shared/ipcChannels.ts
// IPC 通道常量 — 所有 ipcMain.handle/webContents.send 的 channel name 统一在此定义。
// preload.ts 白名单和 ipcHandlers.ts 注册均从此 import。
// 命名约定: <domain>:<action> — 与 preload 正则白名单匹配。

export const IPC = {
  // === Server Management (invoke: renderer → main) ===
  SERVERS_LIST: 'servers:list',
  SERVERS_ADD: 'servers:add',
  SERVERS_REMOVE: 'servers:remove',
  SERVERS_RECONNECT: 'servers:reconnect',

  // === Server Events (push: main → renderer) ===
  SERVER_STATUS: 'server:status',
  SERVER_PAIRED: 'server:paired',

  // === Command Events (push: main → renderer) ===
  COMMAND_RECEIVED: 'command:received',
  COMMAND_COMPLETED: 'command:completed',
  COMMAND_TEST: 'command:test',       // invoke: 手动测试命令

  // === History (invoke: renderer → main) — Phase 4-5 消费 ===
  HISTORY_LIST: 'history:list',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_STATS: 'history:stats',
  HISTORY_DETAIL: 'history:detail',

  // === Sites (invoke: renderer → main) — Phase 4-5 消费 ===
  SITES_LIST: 'sites:list',
  SITES_UPDATE: 'sites:update',
  SITES_SCAN: 'sites:scan',

  // === Diagnostics (invoke: renderer → main) ===
  DIAG_RUN: 'diag:run',
  DIAG_CONNECTIVITY: 'diag:connectivity',

  // === Settings (invoke: renderer → main) ===
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // === Auto-Update (mixed) ===
  UPDATE_CHECK: 'update:check',       // invoke
  UPDATE_INSTALL: 'update:install',   // invoke
  UPDATE_STATUS: 'update:status',     // push: main → renderer

  // === Navigation (push: main → renderer) ===
  NAVIGATE: 'navigate',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
