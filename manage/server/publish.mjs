import fs from 'fs';
import path from 'path';
import { getBlogRoot } from './paths.mjs';
import { spawnLogged } from './spawn-logged.mjs';
import { activityLogStatus, activityLogDetail } from './activity-log.mjs';
import { openUrl, openPath } from './actions.mjs';
import { scanPhoneChannelSync, runPhoneSyncCopy } from './phone-sync.mjs';

function syncConfigPath() {
  return path.join(getBlogRoot(), 'tools', 'sync-phone-channel.config.json');
}

export function readPhoneSyncConfig() {
  const p = syncConfigPath();
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function getSiteUrl() {
  const blogRoot = getBlogRoot();
  try {
    const yml = fs.readFileSync(path.join(blogRoot, '_config.yml'), 'utf8');
    const m = yml.match(/^url:\s*(\S+)/m);
    if (m) return m[1];
  } catch (_) {}
  return 'https://meiso-945.pages.dev';
}

function run(cmd, args, cwd, label) {
  return spawnLogged(label || args?.[1] || cmd, cmd, args, {
    cwd,
    shell: process.platform === 'win32',
    windowsHide: true,
  });
}

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function npxCmd() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

export async function scanPhoneChannel() {
  try {
    return scanPhoneChannelSync();
  } catch (e) {
    return { ok: false, scan: null, error: String(e.message || e) };
  }
}

export async function syncPhoneChannel() {
  activityLogStatus('正在把手机通道的文件同步到博客…');
  const r = await runPhoneSyncCopy();
  if (r.ok) {
    const n = r.summary?.copied ?? r.summary?.filesCopied;
    activityLogStatus(
      n != null ? `同步完成，已复制 ${n} 个文件到博客目录` : '同步完成，手机通道已更新到博客',
    );
  } else {
    activityLogStatus('同步失败，可展开「技术详情」查看原因');
    if (r.log) activityLogDetail(String(r.log).trim().slice(-2000));
  }
  return r;
}

export async function wranglerWhoami() {
  const blogRoot = getBlogRoot();
  const r = await run(npxCmd(), ['wrangler', 'whoami'], blogRoot, 'wrangler whoami');
  const email = (r.log.match(/([\w.+-]+@[\w.-]+\.\w+)/) || [])[1] || '';
  return { loggedIn: r.ok, email, log: r.log };
}

export async function runBuildProd() {
  activityLogStatus('正在生成线上版静态站（build:prod）…');
  const r = await run(npmCmd(), ['run', 'build:prod'], getBlogRoot(), 'build:prod');
  activityLogStatus(r.ok ? '线上版静态站已生成完毕' : '线上版构建失败，请展开「技术详情」');
  return r;
}

export async function runBuildLocal() {
  activityLogStatus('正在本地构建博客（含本地预览配置）…');
  const r = await run(npmCmd(), ['run', 'build'], getBlogRoot(), 'build (local)');
  activityLogStatus(r.ok ? '本地构建已完成' : '本地构建失败，请展开「技术详情」');
  return r;
}

export async function runDeploy() {
  activityLogStatus('正在部署到 Cloudflare 线上…');
  const r = await run(npmCmd(), ['run', 'deploy'], getBlogRoot(), 'deploy');
  activityLogStatus(r.ok ? '部署完毕，线上站点已更新' : '部署失败，请展开「技术详情」');
  return r;
}

export async function publishStatus(options = {}) {
  const cfg = readPhoneSyncConfig();
  const scanResult = scanPhoneChannelSync();
  const whoami = options.skipCloudflare ? { loggedIn: null, email: '' } : await wranglerWhoami();
  return {
    site_url: getSiteUrl(),
    sync_config: cfg,
    sync_root: cfg?.syncRoot || scanResult.scan?.syncRoot || '',
    sync_config_path: syncConfigPath(),
    phone_scan: scanResult.scan,
    scan_ok: scanResult.ok,
    scanned_at: new Date().toISOString(),
    cloudflare: whoami,
  };
}

export function openSite() {
  openUrl(getSiteUrl());
}

export function openSyncFolder() {
  const cfg = readPhoneSyncConfig();
  if (!cfg?.syncRoot) throw new Error('未配置 syncRoot');
  const abs = path.resolve(cfg.syncRoot);
  if (!fs.existsSync(abs)) throw new Error(`目录不存在: ${abs}`);
  openPath(abs);
}
