import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getBlogRoot, getAssetsDir } from './paths.mjs';
import { readPhoneSyncConfig } from './publish.mjs';

const IMAGE_MD_RE = /!\[\]\(\.\.\/\.\.\/assets\/([^)]+)\)/g;
const PHOTO_GRID_IMG_RE = /<img\s+[^>]*src="(?:\.\.\/\.\.\/assets\/)?([^"]+)"/gi;
const PHOTO_GRID_BLOCK_RE = /<div class="photo-grid[\s\S]*?<\/div>/gi;

function resolveChannelDirs(cfg) {
  if (!cfg?.syncRoot) throw new Error('未配置 syncRoot（tools/sync-phone-channel.config.json）');
  const root = path.resolve(cfg.syncRoot);
  const keys = cfg.folders || {};
  const subPosts = Object.prototype.hasOwnProperty.call(keys, 'posts') ? 'posts' : 'posts';
  const subDrafts = Object.prototype.hasOwnProperty.call(keys, 'drafts') ? 'drafts' : 'drafts';
  const subAssets = Object.prototype.hasOwnProperty.call(keys, 'assets') ? 'assets' : 'assets';
  return {
    root,
    exists: fs.existsSync(root),
    posts: path.join(root, subPosts),
    drafts: path.join(root, subDrafts),
    assets: path.join(root, subAssets),
    blogPosts: path.join(getBlogRoot(), keys.posts || 'source/_posts'),
    blogDrafts: path.join(getBlogRoot(), keys.drafts || 'source/_drafts'),
  };
}

function parseImageNames(body) {
  const fromGrid = [];
  let m;
  const re = new RegExp(PHOTO_GRID_IMG_RE.source, 'gi');
  while ((m = re.exec(body))) fromGrid.push(m[1]);
  if (fromGrid.length) return fromGrid.map((n) => path.basename(n));
  const fromMd = [];
  const re2 = new RegExp(IMAGE_MD_RE.source, 'g');
  while ((m = re2.exec(body))) fromMd.push(m[1]);
  return fromMd.map((n) => path.basename(n));
}

function displayTextFromBody(body) {
  let s = String(body || '').replace(PHOTO_GRID_BLOCK_RE, '');
  s = s
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !IMAGE_MD_RE.test(t) && !t.startsWith('<div class="photo-grid');
    })
    .join('\n');
  return s.trim();
}

function parseCreatedAt(data, filePath) {
  const raw = data?.date;
  if (raw) {
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) return t;
  }
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function readMomentFile(full, isDraft) {
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = matter(raw);
  const id = path.basename(full);
  const body = parsed.content || '';
  return {
    id,
    title: parsed.data?.title || id.replace(/\.md$/, ''),
    body: displayTextFromBody(body),
    image_names: parseImageNames(body),
    created_at: parseCreatedAt(parsed.data, full),
    is_draft: isDraft,
    key: `${isDraft}_${id}`,
  };
}

function listDirMoments(dir, isDraft) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
    .map((name) => {
      try {
        return readMomentFile(path.join(dir, name), isDraft);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function listPhoneChannelMoments() {
  const cfg = readPhoneSyncConfig();
  if (!cfg) {
    return { ok: false, error: '缺少 sync-phone-channel.config.json', moments: [], sync_root: '' };
  }
  const dirs = resolveChannelDirs(cfg);
  const moments = [
    ...listDirMoments(dirs.drafts, true),
    ...listDirMoments(dirs.posts, false),
  ].sort((a, b) => b.created_at - a.created_at);
  return {
    ok: true,
    sync_root: dirs.root,
    exists: dirs.exists,
    moments,
    counts: {
      total: moments.length,
      drafts: moments.filter((m) => m.is_draft).length,
      posts: moments.filter((m) => !m.is_draft).length,
    },
  };
}

function locateMomentFile(cfg, moment) {
  const dirs = resolveChannelDirs(cfg);
  const dir = moment.is_draft ? dirs.drafts : dirs.posts;
  const base = path.basename(moment.id || moment);
  const name = base.endsWith('.md') ? base : `${base}.md`;
  const full = path.join(dir, name);
  if (!fs.existsSync(full)) return null;
  return { full, dirs, name };
}

function deleteMomentAssets(dirs, imageNames) {
  for (const raw of imageNames || []) {
    const base = path.basename(String(raw));
    if (!base) continue;
    const full = path.join(dirs.assets, base);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch (_) {}
    }
  }
}

export function deletePhoneChannelMoments(items) {
  const cfg = readPhoneSyncConfig();
  if (!cfg) throw new Error('未配置手机通道');
  let deleted = 0;
  let failed = 0;
  for (const item of items || []) {
    const loc = locateMomentFile(cfg, item);
    if (!loc) {
      failed += 1;
      continue;
    }
    let imageNames = item.image_names;
    if (!imageNames?.length) {
      try {
        imageNames = readMomentFile(loc.full, Boolean(item.is_draft)).image_names;
      } catch {
        imageNames = [];
      }
    }
    try {
      fs.unlinkSync(loc.full);
      deleteMomentAssets(loc.dirs, imageNames);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
}

function dayBounds(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error('无效日期');
  const start = d.getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

export function deletePhoneChannelByDateRange(startDate, endDate) {
  const a = dayBounds(startDate);
  const b = dayBounds(endDate);
  const lo = Math.min(a.start, b.start);
  const hi = Math.max(a.end, b.end);
  const { moments } = listPhoneChannelMoments();
  const targets = moments.filter((m) => m.created_at >= lo && m.created_at <= hi);
  return { ...deletePhoneChannelMoments(targets), matched: targets.length };
}

export function deleteAllPhoneChannelMoments() {
  const { moments } = listPhoneChannelMoments();
  return deletePhoneChannelMoments(moments);
}

export function getPhoneChannelAssetPath(filename) {
  const cfg = readPhoneSyncConfig();
  if (!cfg) throw new Error('未配置手机通道');
  const dirs = resolveChannelDirs(cfg);
  const base = path.basename(String(filename || ''));
  if (!base) throw new Error('无效文件名');
  const full = path.join(dirs.assets, base);
  if (!fs.existsSync(full)) return null;
  const resolved = path.resolve(full);
  const assetsResolved = path.resolve(dirs.assets);
  if (!resolved.startsWith(assetsResolved)) throw new Error('路径非法');
  return full;
}

export function copyPhoneChannelMomentsToBlog(keys) {
  const cfg = readPhoneSyncConfig();
  if (!cfg) throw new Error('未配置手机通道');
  const { moments } = listPhoneChannelMoments();
  const keySet = new Set(keys || []);
  const targets = moments.filter((m) => keySet.has(m.key));
  const dirs = resolveChannelDirs(cfg);
  const blogAssets = getAssetsDir();
  fs.mkdirSync(blogAssets, { recursive: true });
  fs.mkdirSync(dirs.blogDrafts, { recursive: true });
  fs.mkdirSync(dirs.blogPosts, { recursive: true });
  let copied = 0;
  let failed = 0;
  for (const m of targets) {
    const loc = locateMomentFile(cfg, m);
    if (!loc) {
      failed += 1;
      continue;
    }
    try {
      const destDir = m.is_draft ? dirs.blogDrafts : dirs.blogPosts;
      fs.copyFileSync(loc.full, path.join(destDir, loc.name));
      for (const img of m.image_names) {
        const src = path.join(dirs.assets, img);
        const dest = path.join(blogAssets, img);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
      }
      copied += 1;
    } catch {
      failed += 1;
    }
  }
  return { copied, failed, count: targets.length };
}
