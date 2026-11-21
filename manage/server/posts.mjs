import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPostsDir, getDraftsDir, getTrashDir, assertInsideBlog } from './paths.mjs';
import { normalizePostDate } from './post-date.mjs';

function fileInDir(id, isDraft) {
  const safe = path.basename(id);
  const base = safe.endsWith('.md') ? safe : `${safe}.md`;
  const dir = isDraft ? getDraftsDir() : getPostsDir();
  return path.join(dir, base);
}

function fileInTrash(id) {
  const safe = path.basename(id);
  const base = safe.endsWith('.md') ? safe : `${safe}.md`;
  return path.join(getTrashDir(), base);
}

function isDraftFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isPrivateFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isPrivateData(data) {
  const d = data || {};
  return isPrivateFlag(d.meiso_private) || isPrivateFlag(d.private);
}

/** @param {string} id @param {{ wantDraft?: boolean }} [options] */
function locatePost(id, options = {}) {
  const inPosts = fileInDir(id, false);
  const inDrafts = fileInDir(id, true);
  const hasP = fs.existsSync(inPosts);
  const hasD = fs.existsSync(inDrafts);
  const wantDraft = options.wantDraft;

  if (wantDraft === true) {
    if (hasD) return { full: inDrafts, isDraft: true };
    if (hasP) return { full: inPosts, isDraft: false };
  } else if (wantDraft === false) {
    if (hasP) return { full: inPosts, isDraft: false };
    if (hasD) return { full: inDrafts, isDraft: true };
  } else if (hasP) {
    return { full: inPosts, isDraft: false };
  } else if (hasD) {
    return { full: inDrafts, isDraft: true };
  }
  return null;
}

function locateTrash(id) {
  const full = fileInTrash(id);
  if (!fs.existsSync(full)) return null;
  return { full };
}

function readPostFile(full, isDraft) {
  const parsed = matter(fs.readFileSync(full, 'utf8'));
  return {
    id: path.basename(full, '.md'),
    filename: path.basename(full),
    is_draft: isDraft,
    private: isPrivateData(parsed.data),
    data: parsed.data || {},
    body: parsed.content,
  };
}

function toSummary(body) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function parsePreviewImages(content) {
  const body = String(content || '');
  const fromGrid = [];
  let m;
  const reGrid = /<img\s+[^>]*src="(?:\.\.\/\.\.\/assets\/)?([^"]+)"/gi;
  while ((m = reGrid.exec(body))) fromGrid.push(path.basename(m[1]));
  if (fromGrid.length) return fromGrid.slice(0, 30);
  const fromMd = [];
  const reMd = /!\[\]\(\.\.\/\.\.\/assets\/([^)]+)\)/g;
  while ((m = reMd.exec(body))) fromMd.push(path.basename(m[1]));
  return fromMd.slice(0, 30);
}

function dirLatestMtime(dir) {
  if (!fs.existsSync(dir)) return 0;
  let latest = 0;
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith('.md')) continue;
    const stat = fs.statSync(path.join(dir, filename));
    if (stat.mtimeMs > latest) latest = stat.mtimeMs;
  }
  return latest;
}

/** @type {{ key: string, published: object[], drafts: object[], trash: object[] } | null} */
let listCache = null;

export function invalidateListCache() {
  listCache = null;
}

function isPhoneMomentId(id) {
  return /^moment-/i.test(String(id || ''));
}

function readDirEntries(dir, isDraft) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((filename) => {
      const full = path.join(dir, filename);
      const parsed = matter(fs.readFileSync(full, 'utf8'));
      const data = parsed.data || {};
      const id = filename.replace(/\.md$/, '');
      return {
        id,
        filename,
        is_draft: isDraft,
        private: isPrivateData(data),
        from_phone: isPhoneMomentId(id),
        on_site: !isDraft && !isPrivateData(data),
        title: data.title || id,
        date: data.date ? String(data.date) : '',
        updated: data.updated ? String(data.updated) : '',
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: toSummary(parsed.content),
        preview_images: parsePreviewImages(parsed.content),
        body: String(parsed.content || '').slice(0, 12000),
      };
    });
}

function readTrashEntries() {
  const dir = getTrashDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((filename) => {
      const full = path.join(dir, filename);
      const parsed = matter(fs.readFileSync(full, 'utf8'));
      const data = parsed.data || {};
      const id = filename.replace(/\.md$/, '');
      const trashFrom = data._trash_from === 'draft' ? 'draft' : 'published';
      return {
        id,
        filename,
        is_draft: trashFrom === 'draft',
        is_trash: true,
        private: isPrivateData(data),
        from_phone: isPhoneMomentId(id),
        on_site: false,
        title: data.title || id,
        date: data.date ? String(data.date) : '',
        updated: data.updated ? String(data.updated) : '',
        trashed_at: data._trashed_at ? String(data._trashed_at) : '',
        trash_from: trashFrom,
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: toSummary(parsed.content),
        preview_images: parsePreviewImages(parsed.content),
      };
    });
}

function countMdFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

function cachedDirEntries() {
  const postsDir = getPostsDir();
  const draftsDir = getDraftsDir();
  const trashDir = getTrashDir();
  const key = [
    dirLatestMtime(postsDir),
    countMdFiles(postsDir),
    dirLatestMtime(draftsDir),
    countMdFiles(draftsDir),
    dirLatestMtime(trashDir),
    countMdFiles(trashDir),
  ].join(':');
  if (listCache?.key === key) {
    return { published: listCache.published, drafts: listCache.drafts, trash: listCache.trash };
  }
  const published = readDirEntries(postsDir, false);
  const drafts = readDirEntries(draftsDir, true);
  const trash = readTrashEntries();
  listCache = { key, published, drafts, trash };
  return { published, drafts, trash };
}

function buildFilename(title, date) {
  const d = new Date(date || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const slug = String(title || 'post')
    .trim()
    .slice(0, 48)
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post';
  return `${y}-${m}-${day}-${slug}.md`;
}

function uniquePath(dir, filename) {
  let full = path.join(dir, filename);
  if (!fs.existsSync(full)) return full;
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  full = path.join(dir, `${stem}-${Date.now()}${ext}`);
  return full;
}

export function listPosts(options = {}) {
  const status = options.status || 'all';
  const { published, drafts, trash } = cachedDirEntries();
  let posts = [];
  if (status === 'published') posts = published.filter((p) => !p.private);
  else if (status === 'draft') posts = drafts;
  else if (status === 'private') posts = published.filter((p) => p.private);
  else if (status === 'trash') posts = trash;
  else posts = [...published, ...drafts];

  const sortKey = status === 'trash' ? 'trashed_at' : 'date';
  return posts.sort((a, b) => {
    const byTime = String(b[sortKey] || b.date || '').localeCompare(String(a[sortKey] || a.date || ''));
    if (byTime !== 0) return byTime;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function listTrash() {
  return listPosts({ status: 'trash' });
}

export function getPost(id, options = {}) {
  const wantDraft = options.draft === undefined ? undefined : isDraftFlag(options.draft);
  const found = locatePost(id, { wantDraft });
  if (!found) return null;
  return readPostFile(found.full, found.isDraft);
}

export function savePost(id, payload) {
  const { title, date, categories, tags, cover, body, draft: draftFlag, private: privateFlag } = payload;
  const wantDraft = isDraftFlag(draftFlag);

  const data = {
    title: title || '未命名',
    date: normalizePostDate(date || new Date()),
    categories: categories?.length ? categories.slice(0, 1) : ['随笔'],
  };
  if (tags?.length) data.tags = tags;
  if (cover) data.cover = cover;
  if (isPrivateFlag(privateFlag)) {
    data.meiso_private = true;
  }
  delete data.private;

  const targetDir = wantDraft ? getDraftsDir() : getPostsDir();
  const existing = id ? locatePost(id, { wantDraft }) : null;

  let full;
  let wroteAsDraft = wantDraft;

  if (existing) {
    if (existing.isDraft === wantDraft) {
      full = existing.full;
      wroteAsDraft = existing.isDraft;
    } else {
      const filename = path.basename(existing.full);
      full = uniquePath(targetDir, filename);
      assertInsideBlog(full);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, matter.stringify(String(body || ''), data), 'utf8');
      fs.unlinkSync(existing.full);
      wroteAsDraft = wantDraft;
      invalidateListCache();
      return readPostFile(full, wroteAsDraft);
    }
  } else {
    full = uniquePath(targetDir, buildFilename(data.title, data.date));
    assertInsideBlog(full);
    wroteAsDraft = wantDraft;
  }

  if (existing) {
    const prev = matter(fs.readFileSync(existing.full, 'utf8')).data || {};
    if (prev.updated != null && data.updated == null) data.updated = prev.updated;
    if (prev.sticky != null && data.sticky == null) data.sticky = prev.sticky;
  }

  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, matter.stringify(String(body || ''), data), 'utf8');
  invalidateListCache();
  return readPostFile(full, wroteAsDraft);
}

/** 移到垃圾桶（软删除） */
export function trashPost(id, options = {}) {
  const wantDraft = options.draft === undefined ? undefined : isDraftFlag(options.draft);
  const found = locatePost(id, { wantDraft });
  if (!found) return false;

  const trashDir = getTrashDir();
  fs.mkdirSync(trashDir, { recursive: true });

  const parsed = matter(fs.readFileSync(found.full, 'utf8'));
  const data = { ...(parsed.data || {}) };
  data._trash_from = found.isDraft ? 'draft' : 'published';
  data._trashed_at = new Date().toISOString().slice(0, 19);

  const filename = path.basename(found.full);
  let dest = path.join(trashDir, filename);
  if (fs.existsSync(dest)) dest = uniquePath(trashDir, filename);
  assertInsideBlog(dest);
  fs.writeFileSync(dest, matter.stringify(parsed.content, data), 'utf8');
  fs.unlinkSync(found.full);
  invalidateListCache();
  return true;
}

/** @deprecated 使用 trashPost；保留别名以兼容旧调用 */
export function deletePost(id, options = {}) {
  return trashPost(id, options);
}

/** 从垃圾桶恢复 */
export function restorePost(id) {
  const found = locateTrash(id);
  if (!found) return null;

  const parsed = matter(fs.readFileSync(found.full, 'utf8'));
  const data = { ...(parsed.data || {}) };
  const wasDraft = data._trash_from === 'draft';
  delete data._trash_from;
  delete data._trashed_at;

  const targetDir = wasDraft ? getDraftsDir() : getPostsDir();
  fs.mkdirSync(targetDir, { recursive: true });
  const filename = path.basename(found.full);
  const dest = uniquePath(targetDir, filename);
  assertInsideBlog(dest);
  fs.writeFileSync(dest, matter.stringify(parsed.content, data), 'utf8');
  fs.unlinkSync(found.full);
  invalidateListCache();
  return readPostFile(dest, wasDraft);
}

/** 从垃圾桶永久删除 */
export function purgePost(id) {
  const found = locateTrash(id);
  if (!found) return false;
  assertInsideBlog(found.full);
  fs.unlinkSync(found.full);
  invalidateListCache();
  return true;
}

export function collectTags(posts) {
  const set = new Set();
  posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

export function collectCategories(posts) {
  const set = new Set();
  posts.forEach((p) => (p.categories || []).forEach((c) => set.add(c)));
  return [...set].sort();
}

/** 管理台统计：on_site 与预览/线上一致（已发布且非私有） */
export function getManageSiteStats() {
  const { published, drafts, trash } = cachedDirEntries();
  const privatePosts = published.filter((p) => p.private);
  const onSite = published.filter((p) => !p.private);
  const phoneOnSite = onSite.filter((p) => p.from_phone);
  const trashIds = new Set(trash.map((t) => t.id));
  const phone_resurrected_hint = onSite.filter((p) => trashIds.has(p.id)).map((p) => p.id);
  return {
    total: onSite.length,
    on_site: onSite.length,
    private: privatePosts.length,
    drafts: drafts.length,
    trash: trash.length,
    phone_moments_on_site: phoneOnSite.length,
    phone_resurrected_hint,
    tags: collectTags(onSite),
    categories: collectCategories(onSite),
  };
}
