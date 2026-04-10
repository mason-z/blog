'use strict';

/**
 * 单一真相：Decap 配置以 source/admin/config.yml 为准，构建后同步到 public/admin/
 *（与 hexo 从 source 写出 public 一致，避免仓库内两份手动对齐）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'source', 'admin', 'config.yml');
const DEST = path.join(ROOT, 'public', 'admin', 'config.yml');

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[sync-admin-config] 缺少', SRC);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.copyFileSync(SRC, DEST);
  console.log('[sync-admin-config] OK → public/admin/config.yml');
}

main();
