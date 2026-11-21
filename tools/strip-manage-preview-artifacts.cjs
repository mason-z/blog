/**
 * 部署前移除仅用于本机预览的 public 文件，避免线上与本地预览产物不一致。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  path.join(root, 'public', 'manage-live-revision.json'),
];

let removed = 0;
for (const p of targets) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    removed += 1;
    console.log('[strip-preview-artifacts] 已移除', path.relative(root, p));
  }
}
if (!removed) console.log('[strip-preview-artifacts] 无需清理');
