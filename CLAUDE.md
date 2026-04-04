# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCLI Bridge 是一个 Electron 系统托盘应用，连接本地 CLI 工具到远程 AgentStudio 服务器。它通过 WebSocket 接收 AgentStudio 下发的 CLI 命令，在本地用内置的 `@jackwener/opencli` 执行，并返回结果。

核心流程：AgentStudio Web → WebSocket → OpenCLI Bridge → 本地 opencli → 返回结果

## Architecture

```
┌─────────────────────────────────────────────────┐
│  main.ts (Electron 入口)                         │
│  - 单实例锁 (requestSingleInstanceLock)          │
│  - 管理多个 ServerConfig 的连接                   │
│  - 协调所有模块                                   │
└──────┬──────────┬──────────┬──────────┬──────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
│connection│ │configStore│ │  tray  │ │protocolHandler│
│Manager   │ │           │ │        │ │              │
│WebSocket │ │~/.opencli-│ │系统托盘│ │obk:// 协议   │
│连接+重连 │ │bridge/    │ │+ 菜单  │ │注册+处理     │
│命令分发  │ │config.json│ │        │ │              │
└────┬─────┘ └──────────┘ └────────┘ └──────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  commandRunner.ts                     │
│  - 并发上限 MAX_CONCURRENT=3         │
│  - 调用内置 @jackwener/opencli       │
│  - 超时控制 (默认 30s)               │
│  - 返回 BridgeResult (stdout/stderr) │
└──────────────────────────────────────┘
```

### Source Files

| 文件 | 职责 |
|------|------|
| `main.ts` | Electron 入口, 连接生命周期管理, 单实例锁 |
| `types.ts` | 核心类型: `ServerConfig`, `BridgeConfig`, `BridgeCommand`, `BridgeResult` |
| `connectionManager.ts` | WebSocket 连接, 指数退避重连, 消息路由 (command/ping/paired/diagnose) |
| `commandRunner.ts` | 命令执行队列 (并发3), 调用内置 opencli, 超时处理 |
| `capabilityScanner.ts` | 扫描本地可用的 opencli sites |
| `configStore.ts` | 配置持久化 (`~/.opencli-bridge/config.json`), 服务器增删改 |
| `protocolHandler.ts` | `obk://` 自定义协议注册和处理 |
| `tray.ts` | 系统托盘图标, 右键菜单, 多服务器状态聚合显示 |
| `trayFallback.ts` | Linux 下托盘不可用时的 mini-window 降级 |
| `autoUpdater.ts` | electron-updater 自动更新 (每4小时检查, GitHub Releases) |
| `autoLaunch.ts` | 开机自启 (auto-launch), 首次运行自动开启 |

## Development Commands

```bash
npm run build         # TypeScript 编译 (tsc → dist/)
npm run start         # 编译 + 启动 Electron
npm run dev           # 同 start
npm run pack          # 编译 + electron-builder 打包 (不生成安装包)
npm run dist          # 编译 + 生成安装包 (NSIS/dmg/AppImage)
npm run dist:win      # 仅 Windows (NSIS, x64)
npm run dist:mac      # 仅 macOS (dmg, x64+arm64)
npm run dist:linux    # 仅 Linux (AppImage, x64+arm64)

# 测试 (需要先 build)
npm run build && node --test tests/
```

## Key Concepts

### WebSocket 协议

连接建立时发送 `register` 消息（含 bridgeId, deviceName, capabilities）。

消息类型：
- `command` → 执行 CLI 命令, 返回 `result`
- `ping` → 回复 `pong`
- `paired` → 配对成功, 存储永久 API key
- `device_replaced` → 设备被替换, 停止重连
- `config_update` → 服务端推送域名配置变更
- `diagnose` → 返回诊断信息 (opencli 版本, 平台, 可用 sites)

### 认证流程

1. 用户在 AgentStudio Web 生成配置串 (base64url 编码的 JSON, `v=1`)
2. 通过 `obk://` 协议链接或手动粘贴传入 Bridge
3. Bridge 用 `pairingToken` (obp_ 前缀) 建立临时连接
4. 服务端验证后下发 `paired` 消息，含永久 `apiKey` (obk_ 前缀)
5. Bridge 存储 apiKey, 之后用它重连

### 重连策略

- 指数退避: 1s → 2s → 4s → ... → 60s (上限)
- 加随机抖动 (0-1s)
- 连续失败 20 次 → 暂停 5 分钟后重置
- 永久失败不重连: close code 4001 (key revoked), 4002 (token expired), 1000 (正常关闭), device_replaced

### 配置存储

路径: `~/.opencli-bridge/config.json`

支持多服务器，每个 ServerConfig 含 wsUrl, apiKey/pairingToken, projects 列表。重复添加同一服务器 (wsUrl+userId 相同) 会更新 pairingToken 而非创建副本。

## Testing

测试使用 Node.js 内置 `node:test` 模块，文件在 `tests/` 下：
- `add-server-dialog.test.js` — 剪贴板内容检测逻辑
- `tray-icon-fallback.test.js` — 托盘图标降级逻辑

测试依赖编译产物 (`dist/`)，运行前必须先 `npm run build`。

## Build & Release

- electron-builder 配置: `electron-builder.yml`
- 输出目录: `release/`
- 发布到 GitHub Releases (`git-men/opencli-bridge`)
- Windows: NSIS 安装包 (~73 MB), 一键安装, 无桌面快捷方式
- macOS: dmg (x64 + arm64)
- Linux: AppImage (x64 + arm64)

## Integration with AgentStudio

- AgentStudio 后端有 WebSocket 端点接收 Bridge 连接
- AgentStudio Web 前端生成 `obk://` 配置串供用户点击
- Bridge 执行的命令结果通过 WebSocket 返回 AgentStudio，最终展示给用户
