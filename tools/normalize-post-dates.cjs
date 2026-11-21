'use strict';

/**
 * 将 source/_posts、_drafts 内 front matter 的 date/updated 统一为 YYYY-MM-DD HH:mm:ss
 * 用法：node tools/normalize-post-dates.cjs [--dry]
 */

const fs = require('fs');
const path = require('path');
const matter = require(path.join(__dirname, '..', 'manage', 'node_modules', 'gray-matter'));

const BLOG_ROOT = path.join(__dirname, '..');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const LOCAL_SPACE_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_T_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

function parseFlexible(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  let m = s.match(LOCAL_SPACE_RE);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const noTz = !/[Zz]|[+-]\d{2}:?\d{2}$/.test(s);
  if (noTz) {
    m = s.match(LOCAL_T_RE);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeField(v) {
  const d = parseFlexible(v);
  return d ? formatLocal(d) : v;
}

function processDir(relDir, dry) {
  const dir = path.join(BLOG_ROOT, relDir);
  if (!fs.existsSync(dir)) return { changed: 0, files: [] };
  let changed = 0;
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const full = path.join(dir, name);
    const raw = fs.readFileSync(full, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data };
    let touched = false;
    for (const key of ['date', 'updated']) {
      if (data[key] == null || data[key] === '') continue;
      const next = normalizeField(data[key]);
      if (String(next) !== String(data[key])) {
        data[key] = next;
        touched = true;
      }
    }
    if (!touched) continue;
    changed += 1;
    files.push(path.join(relDir, name));
    if (!dry) {
      fs.writeFileSync(full, matter.stringify(parsed.content, data), 'utf8');
      console.log('[normalize-date]', relDir, name);
    } else {
      console.log('[dry]', relDir, name, '→', data.date, data.updated || '');
    }
  }
  return { changed, files };
}

const dry = process.argv.includes('--dry');
const r1 = processDir('source/_posts', dry);
const r2 = processDir('source/_drafts', dry);
const total = r1.changed + r2.changed;
if (dry) {
  console.log(`[dry] 将更新 ${total} 篇`);
} else {
  console.log(`[normalize-date] 已更新 ${total} 篇`);
}
