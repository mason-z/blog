import { createRequire } from 'module';
import path from 'path';
import { getBlogRoot } from './paths.mjs';

const require = createRequire(import.meta.url);

function loadPhoneSyncTool() {
  const toolPath = path.join(getBlogRoot(), 'tools', 'sync-phone-channel.cjs');
  return require(toolPath);
}

export function scanPhoneChannelSync() {
  const { loadConfig, scanChannel } = loadPhoneSyncTool();
  const cfg = loadConfig();
  const scan = scanChannel(cfg);
  return { ok: true, scan, cfg };
}

export async function runPhoneSyncCopy() {
  const blogRoot = getBlogRoot();
  const { spawn } = await import('child_process');
  return new Promise((resolve) => {
    const child = spawn('node', ['tools/sync-phone-channel.cjs', '--json'], {
      cwd: blogRoot,
      shell: process.platform === 'win32',
    });
    let log = '';
    child.stdout?.on('data', (d) => { log += d; });
    child.stderr?.on('data', (d) => { log += d; });
    child.on('close', (code) => {
      let summary = null;
      const line = log
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('{'))
        .pop();
      if (line) {
        try {
          summary = JSON.parse(line);
        } catch (_) {}
      }
      resolve({ ok: code === 0, code, log, summary });
    });
  });
}
