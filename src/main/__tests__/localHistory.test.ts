// src/main/__tests__/localHistory.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'opencli-bridge-test-' + Date.now());
const TEST_FILE = path.join(TEST_DIR, 'history.json');

describe('localHistory', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('creates history file on first record', async () => {
    const { LocalHistory } = await import('../localHistory');
    const history = new LocalHistory(TEST_FILE, 100);

    await history.record({
      id: 'cmd_1', serverId: 'srv_1', serverName: 'Test', site: 'twitter',
      action: 'search', args: ['AI'], success: true, status: 'success',
      exitCode: 0, stdout: 'result', stderr: '', durationMs: 1200,
      startedAt: '2026-04-01T10:00:00Z', completedAt: '2026-04-01T10:00:01Z',
    });

    expect(fs.existsSync(TEST_FILE)).toBe(true);
    const data = JSON.parse(fs.readFileSync(TEST_FILE, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0].site).toBe('twitter');
  });

  it('enforces FIFO when exceeding max records', async () => {
    const { LocalHistory } = await import('../localHistory');
    const history = new LocalHistory(TEST_FILE, 3);

    for (let i = 0; i < 5; i++) {
      await history.record({
        id: `cmd_${i}`, serverId: 'srv_1', serverName: 'Test', site: 'twitter',
        action: `action_${i}`, args: [], success: true, status: 'success',
        exitCode: 0, stdout: '', stderr: '', durationMs: 100,
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      });
    }

    const records = await history.list();
    expect(records).toHaveLength(3);
    expect(records[0].action).toBe('action_2');
    expect(records[2].action).toBe('action_4');
  });

  it('truncates stdout/stderr to 500 chars', async () => {
    const { LocalHistory } = await import('../localHistory');
    const history = new LocalHistory(TEST_FILE, 100);

    await history.record({
      id: 'cmd_long', serverId: 'srv_1', serverName: 'Test', site: 'test',
      action: 'run', args: [], success: true, status: 'success',
      exitCode: 0, stdout: 'x'.repeat(1000), stderr: 'x'.repeat(1000), durationMs: 100,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    });

    const records = await history.list();
    expect(records[0].stdout.length).toBe(500);
    expect(records[0].stderr.length).toBe(500);
  });

  it('returns stats correctly', async () => {
    const { LocalHistory } = await import('../localHistory');
    const history = new LocalHistory(TEST_FILE, 100);

    await history.record({
      id: 'cmd_ok', serverId: 'srv_1', serverName: 'T', site: 'a', action: 'b', args: [],
      success: true, status: 'success', exitCode: 0, stdout: '', stderr: '', durationMs: 100,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    });
    await history.record({
      id: 'cmd_fail', serverId: 'srv_1', serverName: 'T', site: 'a', action: 'c', args: [],
      success: false, status: 'error', exitCode: 1, stdout: '', stderr: 'err', durationMs: 200,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    });

    const stats = await history.stats();
    expect(stats.total).toBe(2);
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it('handles empty file gracefully', async () => {
    const { LocalHistory } = await import('../localHistory');
    fs.writeFileSync(TEST_FILE, '');
    const history = new LocalHistory(TEST_FILE, 100);

    const records = await history.list();
    expect(records).toEqual([]);

    const stats = await history.stats();
    expect(stats.total).toBe(0);
  });

  it('handles corrupted JSON gracefully', async () => {
    const { LocalHistory } = await import('../localHistory');
    fs.writeFileSync(TEST_FILE, '{corrupted data!!!');
    const history = new LocalHistory(TEST_FILE, 100);

    const records = await history.list();
    expect(records).toEqual([]);

    await history.record({
      id: 'cmd_recover', serverId: 'srv_1', serverName: 'T', site: 'a', action: 'b', args: [],
      success: true, status: 'success', exitCode: 0, stdout: '', stderr: '', durationMs: 100,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    });
    const after = await history.list();
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('cmd_recover');
  });

  it('clear() on non-existent file does not throw', async () => {
    const { LocalHistory } = await import('../localHistory');
    const nonExistentFile = path.join(TEST_DIR, 'does-not-exist.json');
    const history = new LocalHistory(nonExistentFile, 100);
    await expect(history.clear()).resolves.toBeUndefined();
  });
});
