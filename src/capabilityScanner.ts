import spawn from 'cross-spawn';

export function scanAvailableSites(): string[] {
  try {
    const result = spawn.sync('opencli', ['list', '-f', 'json'], { timeout: 10000 });
    if (result.status !== 0 || !result.stdout) return [];
    const data = JSON.parse(result.stdout.toString());
    if (Array.isArray(data)) {
      const sites = new Set<string>();
      for (const cmd of data) {
        if (cmd.site) sites.add(cmd.site);
      }
      return [...sites];
    }
    return [];
  } catch {
    return [];
  }
}
