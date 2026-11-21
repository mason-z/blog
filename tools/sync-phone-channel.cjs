'use strict';

const fs = require('fs');
const path = require('path');

const BLOG_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'sync-phone-channel.config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`缺少配置: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function shouldCopy(src, dest) {
  if (!fs.existsSync(dest)) return true;
  const ss = fs.statSync(src);
  const ds = fs.statSync(dest);
  if (ss.size !== ds.size) return true;
  return ss.mtimeMs > ds.mtimeMs;
}

function copyDirFiles(srcDir, destDir, label, options = {}) {
  const dry = Boolean(options.dry);
  if (!fs.existsSync(srcDir)) {
    return { copied: 0, skipped: 0, copiedFiles: [], pendingFiles: [], missing: true };
  }
  ensureDir(destDir);
  let copied = 0;
  let skipped = 0;
  const copiedFiles = [];
  const pendingFiles = [];
  for (const name of fs.readdirSync(srcDir)) {
    if (name.startsWith('.')) continue;
    const src = path.join(srcDir, name);
    const st = fs.statSync(src);
    if (!st.isFile()) continue;
    const dest = path.join(destDir, name);
    const need = shouldCopy(src, dest);
    if (!need) {
      skipped += 1;
      continue;
    }
    pendingFiles.push(name);
    if (dry) continue;
    fs.copyFileSync(src, dest);
    const rel = path.relative(BLOG_ROOT, dest);
    console.log(`[sync:phone] ${label} → ${rel}`);
    copied += 1;
    copiedFiles.push(name);
  }
  return { copied, skipped, copiedFiles, pendingFiles, missing: false };
}

function scanChannel(cfg) {
  const syncRoot = path.resolve(cfg.syncRoot || '');
  const folders = cfg.folders || {};
  const detail = {};
  let pendingTotal = 0;
  let fileTotal = 0;
  if (!fs.existsSync(syncRoot)) {
    return { syncRoot, exists: false, folders: detail, pendingTotal: 0, fileTotal: 0 };
  }
  for (const [sub, relDest] of Object.entries(folders)) {
    const srcDir = path.join(syncRoot, sub);
    const destDir = path.join(BLOG_ROOT, relDest);
    const r = copyDirFiles(srcDir, destDir, sub, { dry: true });
    detail[sub] = {
      dest: relDest,
      missing: r.missing,
      pending: r.pendingFiles,
      pendingCount: r.pendingFiles.length,
      upToDate: r.skipped,
    };
    pendingTotal += r.pendingFiles.length;
    fileTotal += r.pendingFiles.length + r.skipped;
  }
  return { syncRoot, exists: true, folders: detail, pendingTotal, fileTotal };
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const scanOnly = process.argv.includes('--scan-only');
  const cfg = loadConfig();

  if (scanOnly) {
    const scan = scanChannel(cfg);
    if (jsonOut) {
      console.log(JSON.stringify({ ok: true, mode: 'scan', ...scan }));
      return;
    }
    console.log(`[sync:phone] 扫描: ${scan.syncRoot}`);
    for (const [k, v] of Object.entries(scan.folders)) {
      console.log(`  ${k}: 待同步 ${v.pendingCount}，已最新 ${v.upToDate}`);
    }
    return;
  }

  const syncRoot = path.resolve(cfg.syncRoot || '');
  if (!fs.existsSync(syncRoot)) {
    const err = { ok: false, error: '同步目录不存在', syncRoot };
    if (jsonOut) {
      console.log(JSON.stringify(err));
      process.exit(1);
    }
    console.error(`[sync:phone] 同步目录不存在: ${syncRoot}`);
    process.exit(1);
  }

  const folders = cfg.folders || {};
  let totalCopied = 0;
  let totalSkipped = 0;
  const copiedByFolder = {};

  if (!jsonOut) {
    console.log(`[sync:phone] 通道: ${syncRoot}`);
    console.log(`[sync:phone] 博客: ${BLOG_ROOT}`);
  }

  for (const [sub, relDest] of Object.entries(folders)) {
    const srcDir = path.join(syncRoot, sub);
    const destDir = path.join(BLOG_ROOT, relDest);
    const { copied, skipped, copiedFiles } = copyDirFiles(srcDir, destDir, sub);
    totalCopied += copied;
    totalSkipped += skipped;
    copiedByFolder[sub] = copiedFiles;
  }

  if (cfg.movePublishedFromPosts && totalCopied > 0) {
    const postsSrc = path.join(syncRoot, 'posts');
    const archive = path.join(syncRoot, 'posted');
    if (fs.existsSync(postsSrc)) {
      ensureDir(archive);
      for (const name of fs.readdirSync(postsSrc)) {
        if (!name.endsWith('.md')) continue;
        const src = path.join(postsSrc, name);
        const dest = path.join(archive, name);
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.renameSync(src, dest);
        if (!jsonOut) console.log(`[sync:phone] 已归档 posts/${name} → posted/`);
      }
    }
  }

  const summary = {
    ok: true,
    mode: 'sync',
    syncRoot,
    totalCopied,
    totalSkipped,
    copiedByFolder,
  };

  if (jsonOut) {
    console.log(JSON.stringify(summary));
    return;
  }

  console.log(`[sync:phone] 完成：新复制 ${totalCopied} 个，已是最新跳过 ${totalSkipped} 个`);
  if (totalCopied === 0 && totalSkipped === 0) {
    console.log('[sync:phone] 提示：posts/drafts/assets 里暂无文件，或请先等 Syncthing 同步');
  }
}

module.exports = {
  loadConfig,
  scanChannel,
  runSync: main,
};

if (require.main === module) {
  main();
}
