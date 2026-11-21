import { execFile } from 'child_process';
import { killPortListeners } from './kill-port.mjs';

function powershell(script) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true },
      () => resolve(),
    );
  });
}

/** Stop leftover console processes so a new 博客控制台.bat can bind 5174/8770. */
export async function stopManageDev() {
  const ps = `
Get-CimInstance Win32_Process | ForEach-Object {
  $c = $_.CommandLine
  if (-not $c) { return }
  if ($c -notlike '*mcblog_git_public*manage*') { return }
  $target = ($c -like '*concurrently*') -or ($c -like '*server/index.mjs*') -or ($c -like '*server\\index.mjs*') -or ($c -like '*vite*')
  if ($target) {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
`.trim();
  await powershell(ps);
  await Promise.all([killPortListeners(5174), killPortListeners(8770)]);
}

const self = String(process.argv[1] || '').replace(/\\/g, '/');
if (self.endsWith('/stop-manage.mjs')) {
  await stopManageDev();
}
