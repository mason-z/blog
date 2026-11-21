'use strict';

/**
 * Decap 后台：以 source/admin/ 为准，构建后整目录同步到 public/admin/
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'source', 'admin');
const DEST = path.join(ROOT, 'public', 'admin');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.name.endsWith('.local.js') || ent.name.endsWith('.local.json')) continue;
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[sync-admin-config] 缺少', SRC);
    process.exit(1);
  }
  copyDir(SRC, DEST);
  console.log('[sync-admin-config] OK → public/admin/');
}

main();
