import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { getBlogRoot, loadConfig } from './paths.mjs';
import { openUrl } from './actions.mjs';
import { killPortListeners } from './kill-port.mjs';
import { runBuildProd } from './publish.mjs';
import { activityLogStatus, activityLogDetail } from './activity-log.mjs';

const STATIC_PREVIEW_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'static-preview.mjs');

/** 4001 放最后：部分环境（如 QQ）会占用 127.0.0.1:4001 导致 ERR_EMPTY_RESPONSE */
const PORT_CANDIDATES = [4010, 4011, 4012, 4020, 4030, 4001];

let previewChild = null;
let activePreviewPort = null;
let liveSyncTimer = null;
let liveSyncGenerating = false;
let liveSyncLastFp = '';
let liveSyncLastAssetsFp = '';
let previewRevision = 0;
/** @type {Promise<boolean> | null} */
let prodBuildInFlight = null;

const LIVE_SYNC_MS = 3000;

export function getPreviewRevision() {
  return previewRevision;
}

function revisionFilePath(blogRoot) {
  return path.join(blogRoot, 'public', 'manage-live-revision.json');
}

function writeRevisionFile(blogRoot) {
  try {
    const p = revisionFilePath(blogRoot);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify({ revision: previewRevision, at: new Date().toISOString() }),
      'utf8',
    );
  } catch (e) {
    console.warn('[meiso-manage] 写入 manage-live-revision.json 失败:', e?.message || e);
  }
}

function bumpPreviewRevision() {
  previewRevision += 1;
  writeRevisionFile(getBlogRoot());
  return previewRevision;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function canBind(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.unref();
    s.once('error', () => resolve(false));
    s.listen(port, () => {
      s.close(() => resolve(true));
    });
  });
}

function previewBaseFromPort(port) {
  return `http://127.0.0.1:${port}`;
}

export function getPreviewUrl() {
  if (activePreviewPort) return previewBaseFromPort(activePreviewPort);
  const cfg = loadConfig();
  const fromCfg = String(cfg.ui?.previewUrl || '').trim();
  if (fromCfg) {
    try {
      const u = new URL(fromCfg);
      const p = Number(u.port);
      if (p > 0) activePreviewPort = p;
    } catch (_) {}
    return fromCfg;
  }
  return previewBaseFromPort(4010);
}

export function previewUrlWithLiveReload(baseUrl) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('manage_live', '1');
    return u.toString();
  } catch {
    const join = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${join}manage_live=1`;
  }
}

const PREVIEW_MARKER = 'build-prod-static';

async function probePreviewHtml(port) {
  const url = `${previewBaseFromPort(port)}/`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
    });
    const marker = res.headers.get('x-meiso-preview');
    const text = await res.text();
    const htmlOk = res.status >= 200 && res.status < 500 && text.length > 80 && /<html/i.test(text);
    if (marker === PREVIEW_MARKER) return htmlOk;
    if (htmlOk) {
      activityLogStatus(
        `端口 ${port} 上的不是线上同源预览（可能是旧的 hexo server），将关闭并改用 build:prod 静态站`,
      );
    }
    return false;
  } catch {
    return false;
  }
}

export async function isPreviewReachable(url) {
  try {
    const u = new URL(String(url || '').trim());
    const port = Number(u.port) || 80;
    return probePreviewHtml(port);
  } catch {
    return false;
  }
}

async function findRunningPreviewPort() {
  for (const port of PORT_CANDIDATES) {
    if (await probePreviewHtml(port)) return port;
  }
  return null;
}

async function pickPortToStart() {
  for (const port of PORT_CANDIDATES) {
    if (await canBind(port)) return port;
  }
  return null;
}

function stopPreviewChild() {
  if (!previewChild || previewChild.killed) return;
  try {
    previewChild.kill();
  } catch (_) {}
  previewChild = null;
}

async function startStaticPreviewServer(port) {
  if (previewChild && previewChild.exitCode == null && !previewChild.killed && activePreviewPort === port) {
    return { started: false, already: true, port };
  }
  stopPreviewChild();
  const blogRoot = getBlogRoot();
  const publicDir = path.join(blogRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    throw new Error('public/ 不存在，请先 hexo generate');
  }
  const logPath = path.join(blogRoot, '.manage-hexo-preview.log');
  const logFd = fs.openSync(logPath, 'a');
  fs.writeSync(
    logFd,
    `\n--- static-preview -p ${port} ${new Date().toISOString()} ---\n`,
  );

  const child = spawn(
    process.execPath,
    [STATIC_PREVIEW_SCRIPT, String(port), publicDir],
    {
      cwd: blogRoot,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
    },
  );
  child.unref();
  previewChild = child;
  activePreviewPort = port;
  return { started: true, already: false, port };
}

function configuredPreviewPort() {
  const cfg = loadConfig();
  const fromCfg = String(cfg.ui?.previewUrl || '').trim();
  if (fromCfg) {
    try {
      const p = Number(new URL(fromCfg).port);
      if (p > 0) return p;
    } catch (_) {}
  }
  return PORT_CANDIDATES[0];
}

async function ensurePreviewServer(options = {}) {
  const { skipBuild = false } = options;
  const preferred = configuredPreviewPort();

  if (!skipBuild) {
    const genOk = await runProdBuild();
    if (!genOk) {
      activityLogStatus('预览生成失败，无法启动预览服务');
      return { port: null, spawned: false, ok: false, error: 'build:prod 失败，无法启动预览' };
    }
    markProdPublicFresh();
    activityLogStatus('预览页面已生成（与即将 deploy 的 public/ 相同）');
  }

  const existing = await findRunningPreviewPort();
  if (existing && (await probePreviewHtml(existing))) {
    activePreviewPort = existing;
    return { port: existing, spawned: false, ok: true };
  }

  await killPortListeners(preferred);
  stopPreviewChild();

  const portOrder = [preferred, ...PORT_CANDIDATES.filter((p) => p !== preferred)];
  let port = null;
  for (const candidate of portOrder) {
    if (await canBind(candidate)) {
      port = candidate;
      break;
    }
  }
  if (port == null) {
    return { port: null, spawned: false, ok: false, error: '没有可用预览端口（请关闭占用 4010 的旧 hexo server）' };
  }
  if (port === 4001) {
    console.warn('[meiso-manage] 预览使用 4001；若打不开请改 previewUrl 为 4010');
  }
  activityLogStatus(`预览网页服务已启动：http://127.0.0.1:${port}`);
  activityLogDetail(`[preview] static 127.0.0.1:${port}`);
  await startStaticPreviewServer(port);
  for (let i = 0; i < 30; i += 1) {
    await sleep(300);
    if (await probePreviewHtml(port)) {
      activePreviewPort = port;
      return { port, spawned: true, ok: true };
    }
  }
  return {
    port,
    spawned: true,
    ok: false,
    error: `静态预览未在 ${port} 就绪，详见 .manage-hexo-preview.log`,
  };
}

function runNodeScriptQuick(scriptRel) {
  const blogRoot = getBlogRoot();
  const script = path.join(blogRoot, scriptRel);
  if (!fs.existsSync(script)) return Promise.resolve();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: blogRoot,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('close', () => resolve());
    child.on('error', () => resolve());
  });
}

function fileMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function dirMaxMtime(dir, depth = 0) {
  if (!dir || !fs.existsSync(dir) || depth > 4) return 0;
  let max = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      if (st.isFile()) max = Math.max(max, st.mtimeMs);
      else if (st.isDirectory()) max = Math.max(max, dirMaxMtime(full, depth + 1));
    } catch (_) {}
  }
  return max;
}

function contentFingerprint(blogRoot) {
  const parts = [
    dirMaxMtime(path.join(blogRoot, 'source', '_posts')),
    dirMaxMtime(path.join(blogRoot, 'source', '_drafts')),
    dirMaxMtime(path.join(blogRoot, 'source', '_data')),
    dirMaxMtime(path.join(blogRoot, 'themes', 'tony-blog', 'source')),
    dirMaxMtime(path.join(blogRoot, 'themes', 'tony-blog', 'layout')),
    dirMaxMtime(path.join(blogRoot, 'scripts')),
    fileMtime(path.join(blogRoot, '_config.yml')),
  ];
  const assets = dirMaxMtime(path.join(blogRoot, 'assets'));
  return { content: parts.join(':'), assets: String(assets) };
}

/** 与 deploy 完全相同：manage/server/publish.mjs → npm run build:prod */
async function runProdBuild() {
  const r = await runBuildProd();
  return r.ok;
}

export function markProdPublicFresh() {
  const fp = contentFingerprint(getBlogRoot());
  liveSyncLastFp = fp.content;
  liveSyncLastAssetsFp = fp.assets;
}

export function getPreviewModeInfo() {
  const blogRoot = getBlogRoot();
  let prodUrl = 'https://meiso-945.pages.dev';
  try {
    const yml = fs.readFileSync(path.join(blogRoot, '_config.yml'), 'utf8');
    const m = yml.match(/^url:\s*(\S+)/m);
    if (m) prodUrl = m[1];
  } catch (_) {}
  return {
    build: 'npm run build:prod',
    config: '_config.yml only（不合并 _config.local.yml）',
    serve: 'static public/（X-Meiso-Preview: build-prod-static）',
    prod_site_url: prodUrl,
    note: '预览目录 public/ 与 deploy 上传内容一致；线上若更新需本机先同步/构建再部署。',
  };
}

async function regenerateIfNeeded() {
  if (prodBuildInFlight) return;
  const blogRoot = getBlogRoot();
  const fp = contentFingerprint(blogRoot);
  const unchanged =
    fp.content === liveSyncLastFp && fp.assets === liveSyncLastAssetsFp;
  if (unchanged && liveSyncLastFp) return;
  activityLogStatus('检测到内容变更，正在重新生成预览…');
  await regeneratePreviewNow();
}

async function runProdBuildOnce() {
  liveSyncGenerating = true;
  try {
    const ok = await runProdBuild();
    if (ok) {
      bumpPreviewRevision();
      markProdPublicFresh();
      activityLogStatus('预览已更新（build:prod，与线上一致）');
    } else {
      activityLogStatus('构建失败（build:prod 退出非 0），请展开「技术详情」查看 npm/hexo 报错');
    }
    return ok;
  } finally {
    liveSyncGenerating = false;
  }
}

/** 保存/私有等变更后立即 generate（不依赖 3s 轮询）；并发时复用同一次构建，不误判失败 */
export async function regeneratePreviewNow() {
  if (prodBuildInFlight) {
    activityLogStatus('已有 build:prod 在跑，等待完成…');
    return prodBuildInFlight;
  }
  prodBuildInFlight = runProdBuildOnce();
  try {
    return await prodBuildInFlight;
  } finally {
    prodBuildInFlight = null;
  }
}

export function startPreviewLiveSync() {
  if (liveSyncTimer) return;
  const blogRoot = getBlogRoot();
  const fp = contentFingerprint(blogRoot);
  liveSyncLastFp = fp.content;
  liveSyncLastAssetsFp = fp.assets;
  writeRevisionFile(blogRoot);
  liveSyncTimer = setInterval(() => {
    void regenerateIfNeeded();
  }, LIVE_SYNC_MS);
  console.log(`[meiso-manage] 本地预览同步：每 ${LIVE_SYNC_MS / 1000}s 检测变更（首次 build 在点「实时预览」或保存文章后）`);
}

export async function openLivePreview() {
  activityLogStatus('正在刷新预览：先 build:prod（与一键部署相同），再打开静态站…');
  startPreviewLiveSync();
  const buildOk = await regeneratePreviewNow();
  if (!buildOk) {
    return {
      ok: false,
      url: getPreviewUrl(),
      port: null,
      running: false,
      spawned: false,
      live_sync_sec: LIVE_SYNC_MS / 1000,
      detail: 'build:prod 未成功，本次无法打开与线上一致的预览',
      hint: '展开底部「运行日志」→ 勾选「技术详情」看 hexo/npm 报错；勿用 npm run dev 的 4001',
    };
  }
  const ensured = await ensurePreviewServer({ skipBuild: true });
  const base = ensured.port ? previewBaseFromPort(ensured.port) : getPreviewUrl();
  if (ensured.ok) bumpPreviewRevision();
  const url = previewUrlWithLiveReload(base);
  if (ensured.ok) {
    openUrl(url);
    activityLogStatus(`已在浏览器打开预览：${base}`);
  } else {
    activityLogStatus(ensured.error || '预览启动失败');
  }
  return {
    ok: ensured.ok,
    url,
    port: ensured.port,
    running: ensured.ok,
    spawned: ensured.spawned,
    live_sync_sec: LIVE_SYNC_MS / 1000,
    detail: ensured.error || null,
    hint: !ensured.ok
      ? ensured.error || '预览启动失败'
      : ensured.port === 4001
        ? '若页面空白，QQ 可能占用 4001，请在设置里把预览地址改为 http://127.0.0.1:4010 后重试'
        : `预览 ${base} = deploy 的 public/（build:prod）。勿用 4001 hexo server。线上另需点部署。`,
  };
}
