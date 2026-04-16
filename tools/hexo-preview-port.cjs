'use strict';

/**
 * 启动 hexo server：优先 4001，若被占用则依次尝试其它端口，避免 EADDRINUSE。
 * 用法与 hexo server 一致，额外参数会原样传递（如 -o 打开浏览器）。
 *
 *   node tools/hexo-preview-port.cjs
 *   node tools/hexo-preview-port.cjs -o
 */
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT_CANDIDATES = [4001, 4010, 4011, 4012, 4020, 4030];
const CONFIG = '_config.yml,_config.local.yml';

/**
 * 与 hexo-server 的 checkPort() 一致：listen(port) 不传 host。
 * 若只测 0.0.0.0，在 Windows 上可能与 :::port 已占用的情况不一致，导致误判为「空闲」。
 */
function canBind(port) {
  return new Promise(function (resolve) {
    const s = net.createServer();
    s.unref();
    s.once('error', function () {
      resolve(false);
    });
    s.listen(port, function () {
      s.close(function () {
        resolve(true);
      });
    });
  });
}

async function pickPort() {
  for (const p of PORT_CANDIDATES) {
    if (await canBind(p)) return p;
  }
  return null;
}

async function main() {
  const port = await pickPort();
  if (port == null) {
    console.error('[hexo-preview] 无可用端口（已尝试 ' + PORT_CANDIDATES.join(', ') + '）。请关闭占用端口的进程后重试。');
    process.exit(1);
  }

  if (port !== 4001) {
    console.warn(
      '[hexo-preview] 端口 4001 已被占用，已改用 http://localhost:' +
        port +
        '/\n' +
        '  若站内绝对链接异常，请将 _config.local.yml 中的 url 改为 http://localhost:' +
        port
    );
  } else {
    console.log('[hexo-preview] http://localhost:' + port + '/');
  }

  const hexoBin = path.join(ROOT, 'node_modules', 'hexo', 'bin', 'hexo');
  const extra = process.argv.slice(2);
  const args = ['server', '-p', String(port), '--config', CONFIG].concat(extra);

  const child = spawn(process.execPath, [hexoBin].concat(args), {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.on('exit', function (code) {
    process.exit(code == null ? 1 : code);
  });
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
