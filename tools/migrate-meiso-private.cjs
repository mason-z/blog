'use strict';

const fs = require('fs');
const path = require('path');
const matter = require(path.join(__dirname, '..', 'manage', 'node_modules', 'gray-matter'));

const root = path.join(__dirname, '..');

function isTrue(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function migrateDir(rel) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const full = path.join(dir, name);
    const parsed = matter(fs.readFileSync(full, 'utf8'));
    const data = { ...parsed.data };
    let touched = false;
    if (isTrue(data.private) && !isTrue(data.meiso_private)) {
      data.meiso_private = true;
      touched = true;
    }
    if ('private' in data) {
      delete data.private;
      touched = true;
    }
    if (!touched) continue;
    fs.writeFileSync(full, matter.stringify(parsed.content, data), 'utf8');
    console.log('[migrate]', rel, name);
    n += 1;
  }
  return n;
}

const total = migrateDir('source/_posts') + migrateDir('source/_drafts');
console.log('[migrate] done', total);
