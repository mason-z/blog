'use strict';

const fs = require('fs');
const path = require('path');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff']);

function isImagePath(p) {
  return IMAGE_EXT.has(path.extname(String(p || '')).toLowerCase());
}

function normalizeRef(ref) {
  if (ref == null) return '';
  let s = String(ref).trim();
  if (!s || /^https?:\/\//i.test(s) || s.startsWith('data:')) return '';
  s = s.replace(/^<|>$/g, '').trim();
  // 资源路径（含 assets、相对路径）保留完整字符串；\u00a0 等也会被 \s 匹配，不能截断
  if (
    s.includes('assets/') ||
    s.includes('assets\\') ||
    s.startsWith('../../') ||
    s.startsWith('/images/') ||
    /^\.{0,2}[\\/]/.test(s)
  ) {
    return s;
  }
  return s.split(/\s+/)[0].trim();
}

/** @param {string} ref @param {string} [fromFile] absolute path of containing file */
function resolveSourceAbs(ref, fromFile, root) {
  const r = normalizeRef(ref);
  if (!r || r.startsWith('/images/web/')) return null;

  const assetsDir = path.join(root, 'assets');
  const legacyUploads = path.join(root, 'source', 'images', 'uploads');

  if (r.startsWith('../../assets/')) {
    return path.join(assetsDir, decodeURIComponent(r.slice('../../assets/'.length)));
  }
  if (r.startsWith('assets/') || r.startsWith('assets\\')) {
    return path.join(assetsDir, decodeURIComponent(r.replace(/^assets[/\\]/, '')));
  }
  if (r.startsWith('/assets/')) {
    return path.join(assetsDir, decodeURIComponent(r.slice('/assets/'.length)));
  }
  if (r.startsWith('/images/uploads/')) {
    const legacy = path.join(root, 'source', r.slice(1).replace(/\//g, path.sep));
    if (fs.existsSync(legacy)) return legacy;
    return path.join(assetsDir, path.basename(decodeURIComponent(r)));
  }

  if (fromFile && !r.startsWith('/')) {
    const abs = path.normalize(path.join(path.dirname(fromFile), decodeURIComponent(r)));
    if (fs.existsSync(abs)) return abs;
    const base = path.basename(r);
    const inAssets = path.join(assetsDir, base);
    if (fs.existsSync(inAssets)) return inAssets;
  }

  if (isImagePath(r)) {
    const base = path.basename(r);
    const inAssets = path.join(assetsDir, base);
    if (fs.existsSync(inAssets)) return inAssets;
    const inLegacy = path.join(legacyUploads, base);
    if (fs.existsSync(inLegacy)) return inLegacy;
  }

  return null;
}

function collectMarkdownImageRefs(text) {
  const refs = [];
  if (!text) return refs;
  const re = /!\[[^\]]*]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) refs.push(m[1]);
  return refs;
}

/** 图集等 Markdown 内嵌 HTML 的 <img src="..."> */
function collectHtmlImageSrcRefs(text) {
  const refs = [];
  if (!text) return refs;
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(text))) refs.push(m[1]);
  return refs;
}

function collectYamlImageStrings(obj, out) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    const s = normalizeRef(obj);
    if (s && (isImagePath(s) || s.includes('/assets/') || s.includes('/images/uploads/'))) {
      out.push(s);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v) => collectYamlImageStrings(v, out));
    return;
  }
  if (typeof obj === 'object') {
    Object.values(obj).forEach((v) => collectYamlImageStrings(v, out));
  }
}

function walkContentFiles(root, acc) {
  const dirs = [
    path.join(root, 'source', '_posts'),
    path.join(root, 'source', '_drafts'),
    path.join(root, 'source', '_data'),
    path.join(root, 'source', 'about'),
    path.join(root, 'source', 'guestbook'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    walkDir(dir, acc);
  }
}

function walkDir(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(p, acc);
    else if (/\.(md|markdown|yml|yaml)$/i.test(ent.name)) acc.push(p);
  }
}

function manifestKeysForRef(ref, webPublicUrl) {
  const keys = new Set();
  const r = normalizeRef(ref);
  if (!r) return keys;
  keys.add(r);
  const base = path.basename(r);
  keys.add(`../../assets/${base}`);
  keys.add(`assets/${base}`);
  keys.add(`/images/uploads/${base}`);
  keys.add(`/assets/${base}`);
  return keys;
}

module.exports = {
  IMAGE_EXT,
  isImagePath,
  normalizeRef,
  resolveSourceAbs,
  collectMarkdownImageRefs,
  collectHtmlImageSrcRefs,
  collectYamlImageStrings,
  walkContentFiles,
  manifestKeysForRef,
};
