import { exec } from 'child_process';

export function openPath(target) {
  const p = String(target || '').trim();
  if (!p) throw new Error('路径为空');
  if (process.platform === 'win32') {
    exec(`explorer "${p.replace(/"/g, '')}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${p.replace(/"/g, '\\"')}"`);
  } else {
    exec(`xdg-open "${p.replace(/"/g, '\\"')}"`);
  }
}

export function openUrl(url) {
  const u = String(url || '').trim();
  if (!u) throw new Error('URL 为空');
  if (process.platform === 'win32') {
    exec(`start "" "${u.replace(/"/g, '')}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${u.replace(/"/g, '\\"')}"`);
  } else {
    exec(`xdg-open "${u.replace(/"/g, '\\"')}"`);
  }
}
