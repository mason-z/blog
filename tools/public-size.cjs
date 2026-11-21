#!/usr/bin/env node
'use strict';

/**
 * 部署前统计 public/ 文件数与体积，对照 Cloudflare Pages 免费版单次部署上限。
 * 用法：npm run build:prod && node tools/public-size.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CF_PAGES_FILE_LIMIT = 20000;

const POST_PAGE_RE = /^\d{4}\/\d{2}\/\d{2}\/[^/]+\/index\.html$/;

function classify(relPosix) {
  const lower = relPosix.toLowerCase();
  if (POST_PAGE_RE.test(relPosix)) return 'posts';
  if (lower.startsWith('archives/')) return 'archives';
  if (lower.startsWith('categories/')) return 'categories';
  if (lower.startsWith('tags/')) return 'tags';
  if (lower === 'index.html' || lower.startsWith('about/') || lower.startsWith('guestbook/')) {
    return 'pages';
  }
  if (lower.startsWith('images/web/')) return 'imagesWeb';
  if (lower.startsWith('images/')) return 'imagesOther';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.js')) return 'js';
  if (lower.startsWith('admin/')) return 'admin';
  return 'other';
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function walkStats() {
  const buckets = {
    posts: { files: 0, bytes: 0 },
    archives: { files: 0, bytes: 0 },
    categories: { files: 0, bytes: 0 },
    tags: { files: 0, bytes: 0 },
    pages: { files: 0, bytes: 0 },
    imagesWeb: { files: 0, bytes: 0 },
    imagesOther: { files: 0, bytes: 0 },
    css: { files: 0, bytes: 0 },
    js: { files: 0, bytes: 0 },
    admin: { files: 0, bytes: 0 },
    other: { files: 0, bytes: 0 },
  };

  let totalFiles = 0;
  let totalBytes = 0;

  function walk(absDir) {
    for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = path.relative(PUBLIC, abs).split(path.sep).join('/');
      const stat = fs.statSync(abs);
      const key = classify(rel);
      buckets[key].files += 1;
      buckets[key].bytes += stat.size;
      totalFiles += 1;
      totalBytes += stat.size;
    }
  }

  walk(PUBLIC);
  return { buckets, totalFiles, totalBytes };
}

function printLine(label, count, bytes, indent) {
  if (!count) return;
  const pad = indent ? '    ' : '  ';
  console.log(`${pad}${label.padEnd(14, ' ')} ${String(count).padStart(5)} 个  ${formatBytes(bytes).padStart(10)}`);
}

function main() {
  if (!fs.existsSync(PUBLIC)) {
    console.log('[deploy-stats] public/ 不存在，请先执行 npm run build:prod');
    process.exit(1);
  }

  const { buckets, totalFiles, totalBytes } = walkStats();
  const remaining = CF_PAGES_FILE_LIMIT - totalFiles;
  const usedPct = ((totalFiles / CF_PAGES_FILE_LIMIT) * 100).toFixed(1);

  console.log('');
  console.log('[deploy-stats] Cloudflare Pages 部署前统计（public/ 全部文件）');
  console.log('─'.repeat(56));
  console.log(`  合计             ${String(totalFiles).padStart(5)} 个  ${formatBytes(totalBytes).padStart(10)}`);
  console.log('─'.repeat(56));
  console.log('  分类：');
  printLine('文章页', buckets.posts.files, buckets.posts.bytes);
  printLine('归档页', buckets.archives.files, buckets.archives.bytes);
  printLine('分类页', buckets.categories.files, buckets.categories.bytes);
  printLine('标签页', buckets.tags.files, buckets.tags.bytes);
  printLine('独立页', buckets.pages.files, buckets.pages.bytes);
  printLine('压缩图片 web', buckets.imagesWeb.files, buckets.imagesWeb.bytes);
  if (buckets.imagesOther.files) {
    printLine('其它图片', buckets.imagesOther.files, buckets.imagesOther.bytes);
  }
  printLine('CSS', buckets.css.files, buckets.css.bytes);
  printLine('JS', buckets.js.files, buckets.js.bytes);
  printLine('后台 admin', buckets.admin.files, buckets.admin.bytes);
  if (buckets.other.files) {
    printLine('其它', buckets.other.files, buckets.other.bytes);
  }
  console.log('─'.repeat(56));
  console.log(`  CF 免费版上限    ${CF_PAGES_FILE_LIMIT} 个/次部署`);
  console.log(`  已用             ${usedPct}%  剩余约 ${remaining >= 0 ? remaining : 0} 个`);
  console.log('─'.repeat(56));

  const htmlLike =
    buckets.posts.files +
    buckets.archives.files +
    buckets.categories.files +
    buckets.tags.files +
    buckets.pages.files;
  const images = buckets.imagesWeb.files + buckets.imagesOther.files;
  if (totalFiles > 0) {
    console.log('  粗估增量（供参考）：');
    console.log('    · 每新增 1 篇公开文章 ≈ +1 个文件（文章页）');
    console.log('    · 每新增 1 张不重复原图 ≈ +1 个文件（images/web/）');
    console.log(`    · 当前：${buckets.posts.files} 篇文章页，${buckets.imagesWeb.files} 张压缩图`);
    if (buckets.posts.files > 0 && htmlLike > buckets.posts.files) {
      console.log(`    · 列表/归档等 HTML 共 ${htmlLike - buckets.posts.files} 个（随篇数缓慢增长）`);
    }
  }

  if (totalFiles >= CF_PAGES_FILE_LIMIT) {
    console.log('');
    console.log('[deploy-stats] ⚠ 已超过 Cloudflare Pages 免费版 20000 文件上限，部署可能失败。');
    process.exit(1);
  }
  if (totalFiles >= CF_PAGES_FILE_LIMIT * 0.9) {
    console.log('');
    console.log('[deploy-stats] ⚠ 已用超过 90%，建议清理无用图片或合并标签/分页。');
  }

  console.log('');
  console.log('[deploy-stats] 即将上传 ↑');
  console.log('');
}

main();
