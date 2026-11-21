import { spawn } from 'child_process';
import { activityLogDetail, activityLogStatus } from './activity-log.mjs';

/**
 * @param {string} label
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string, shell?: boolean, windowsHide?: boolean, silentStatus?: boolean }} opts
 */
export function spawnLogged(label, cmd, args, opts = {}) {
  const tag = label || cmd;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      shell: opts.shell ?? false,
      windowsHide: opts.windowsHide ?? true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let tail = '';
    let full = '';
    const flushLines = (chunk, isErr) => {
      tail += chunk;
      const parts = tail.split(/\r?\n/);
      tail = parts.pop() ?? '';
      for (const line of parts) {
        const t = line.trimEnd();
        if (!t) continue;
        full += `${t}\n`;
        activityLogDetail(`[${tag}]${isErr ? ' !' : ''} ${t}`);
      }
    };
    child.stdout?.on('data', (d) => flushLines(String(d), false));
    child.stderr?.on('data', (d) => flushLines(String(d), true));
    child.on('error', (e) => {
      if (!opts.silentStatus) activityLogStatus(`运行失败：${tag}（${e.message}）`);
      activityLogDetail(`[${tag}] 启动失败: ${e.message}`);
      resolve({ ok: false, code: -1, log: full });
    });
    child.on('close', (code) => {
      if (tail.trim()) {
        full += `${tail.trim()}\n`;
        activityLogDetail(`[${tag}] ${tail.trim()}`);
      }
      activityLogDetail(`[${tag}] exit ${code ?? '?'}`);
      resolve({ ok: code === 0, code: code ?? 1, log: full.slice(-16000) });
    });
  });
}
