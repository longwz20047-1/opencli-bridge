// src/main/localHistory.ts
// Atomic write (tmp + rename), no file locking needed (single-process Electron)
import * as fs from 'fs';
import * as path from 'path';

export interface LocalHistoryRecord {
  id: string;
  serverId: string;
  serverName: string;
  site: string;
  action: string;
  args: string[];
  success: boolean;
  status: 'success' | 'error' | 'timeout';
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
}

const MAX_FIELD_LENGTH = 500;

export class LocalHistory {
  private filePath: string;
  private maxRecords: number;

  constructor(filePath: string, maxRecords: number = 2000) {
    this.filePath = filePath;
    this.maxRecords = maxRecords;
  }

  async record(entry: LocalHistoryRecord): Promise<void> {
    const truncated: LocalHistoryRecord = {
      ...entry,
      stdout: entry.stdout.slice(0, MAX_FIELD_LENGTH),
      stderr: entry.stderr.slice(0, MAX_FIELD_LENGTH),
    };

    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    let records: LocalHistoryRecord[] = [];
    if (fs.existsSync(this.filePath)) {
      try {
        records = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } catch {
        records = [];
      }
    }

    records.push(truncated);

    while (records.length > this.maxRecords) {
      records.shift();
    }

    // Atomic write: temp file + rename
    const tmpFile = this.filePath + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(records, null, 2));
    fs.renameSync(tmpFile, this.filePath);
  }

  async list(): Promise<LocalHistoryRecord[]> {
    if (!fs.existsSync(this.filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  async stats(): Promise<{ total: number; success: number; failed: number; todayCount: number }> {
    const records = await this.list();
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = records.filter((r) => r.startedAt.startsWith(today));

    return {
      total: records.length,
      success: records.filter((r) => r.success).length,
      failed: records.filter((r) => !r.success).length,
      todayCount: todayRecords.length,
    };
  }

  async clear(): Promise<void> {
    if (fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]');
    }
  }
}
