import { execFile } from 'child_process';

/** Windows：结束占用端口的监听进程（便于替换旧 hexo server） */
export function killPortListeners(port) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve();
      return;
    }
    const ps = `
$conns = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue
if ($conns) {
  $conns | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
`.trim();
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
      { windowsHide: true },
      () => resolve(),
    );
  });
}
