'use strict';

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'tools', '.web-image-manifest.json');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function rewriteUrl(url, manifest) {
  if (!url || typeof url !== 'string') return url;
  const s = url.trim();
  if (!s || /^https?:\/\//i.test(s)) return url;
  if (manifest[s]) return manifest[s];
  const base = path.basename(s);
  if (manifest[`../../assets/${base}`]) return manifest[`../../assets/${base}`];
  if (manifest[`/images/uploads/${base}`]) return manifest[`/images/uploads/${base}`];
  if (manifest[`assets/${base}`]) return manifest[`assets/${base}`];
  return url;
}

function rewriteHtmlImgSrc(content, manifest) {
  return content.replace(/(<img[^>]+src=")([^"]+)(")/gi, (full, pre, href, post) => {
    const next = rewriteUrl(href, manifest);
    if (next === href) return full;
    return pre + next + post;
  });
}

function rewriteMarkdownContent(content, manifest) {
  if (!content || !manifest || !Object.keys(manifest).length) return content;
  let out = content.replace(/!\[([^\]]*)]\(([^)]+)\)/g, (full, alt, inner) => {
    const parts = inner.trim().split(/\s+/);
    const href = parts[0];
    const rest = parts.slice(1).join(' ');
    const next = rewriteUrl(href, manifest);
    if (next === href) return full;
    return `![${alt}](${next}${rest ? ' ' + rest : ''})`;
  });
  out = rewriteHtmlImgSrc(out, manifest);
  return out;
}

function rewriteDeepStrings(obj, manifest) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return rewriteUrl(obj, manifest);
  if (Array.isArray(obj)) return obj.map((v) => rewriteDeepStrings(v, manifest));
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = rewriteDeepStrings(v, manifest);
    return out;
  }
  return obj;
}

hexo.extend.filter.register('before_post_render', (data) => {
  const manifest = loadManifest();
  if (!Object.keys(manifest).length) return data;
  if (data.content) data.content = rewriteMarkdownContent(data.content, manifest);
  if (data.cover) data.cover = rewriteUrl(data.cover, manifest);
  if (data.thumbnail) data.thumbnail = rewriteUrl(data.thumbnail, manifest);
  return data;
});

hexo.extend.filter.register('after_post_render', (data) => {
  const manifest = loadManifest();
  if (!Object.keys(manifest).length) return data;
  if (data.content) data.content = rewriteHtmlImgSrc(data.content, manifest);
  return data;
});

hexo.extend.filter.register('before_page_render', (data) => {
  const manifest = loadManifest();
  if (!Object.keys(manifest).length) return data;
  if (data.content) data.content = rewriteMarkdownContent(data.content, manifest);
  return data;
});
