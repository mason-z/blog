#!/usr/bin/env node
'use strict';

/** 方案 3：线上只保留压缩后的 /images/web/，删除 public 里 legacy uploads 原图 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'images', 'uploads');
if (!fs.existsSync(dir)) process.exit(0);

for (const name of fs.readdirSync(dir)) {
  if (name === '.gitkeep') continue;
  const p = path.join(dir, name);
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch (_) {}
}
console.log('[prune-public-uploads] 已移除 public/images/uploads 中的原图（保留 /images/web/）');
