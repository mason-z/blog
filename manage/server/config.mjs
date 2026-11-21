import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MANAGE_ROOT = path.join(__dirname, '..');
export const CONFIG_PATH = path.join(MANAGE_ROOT, 'config.json');
export const FRONTEND_DIST = path.join(MANAGE_ROOT, 'frontend', 'dist');

function randomApiToken() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_CONFIG = {
  blogRoot: '..',
  server: { host: '0.0.0.0', port: 8770, apiToken: '' },
  ui: {
    title: 'meiso 管理',
    previewUrl: 'http://127.0.0.1:4010',
    decapAdminUrl: 'http://127.0.0.1:4010/admin/',
  },
};

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    server: { ...DEFAULT_CONFIG.server, ...(raw.server || {}) },
    ui: { ...DEFAULT_CONFIG.ui, ...(raw.ui || {}) },
  };
}

export { randomApiToken };

export function getApiToken() {
  const t = loadConfig().server?.apiToken;
  return t && String(t).trim() ? String(t).trim() : '';
}

export function saveConfig(patch) {
  const current = loadConfig();
  const next = {
    ...current,
    ...patch,
    server: { ...current.server, ...(patch.server || {}) },
    ui: { ...current.ui, ...(patch.ui || {}) },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return next;
}

export function getBlogRoot() {
  const cfg = loadConfig();
  const root = cfg.blogRoot || '..';
  if (path.isAbsolute(root)) return path.resolve(root);
  return path.resolve(MANAGE_ROOT, root);
}

export function getPostsDir() {
  return path.join(getBlogRoot(), 'source', '_posts');
}

export function getDraftsDir() {
  return path.join(getBlogRoot(), 'source', '_drafts');
}

export function getTrashDir() {
  return path.join(getBlogRoot(), 'source', '_trash');
}

export function getSiteCmsPath() {
  return path.join(getBlogRoot(), 'source', '_data', 'site_cms.yml');
}

/** 原图目录（不进 Git，Obsidian 相对路径 ../../assets/） */
export function getAssetsDir() {
  return path.join(getBlogRoot(), 'assets');
}

export function getUploadsDir() {
  return getAssetsDir();
}

export function assertInsideBlog(absPath) {
  const blogRoot = getBlogRoot();
  const rel = path.relative(blogRoot, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('路径越界');
  }
}

export function getConfigPublic() {
  const cfg = loadConfig();
  const blogRoot = getBlogRoot();
  return {
    blog_root: blogRoot,
    blog_root_input: cfg.blogRoot,
    title: cfg.ui?.title || 'meiso 管理',
    preview_url: cfg.ui?.previewUrl || 'http://127.0.0.1:4010',
    decap_admin_url: cfg.ui?.decapAdminUrl || 'http://127.0.0.1:4010/admin/',
    server_port: cfg.server?.port || 8770,
    server_host: cfg.server?.host || '0.0.0.0',
    auth_required: Boolean(cfg.server?.apiToken && String(cfg.server.apiToken).trim()),
    media: {
      storage: 'assets',
      assets_path: path.join(blogRoot, 'assets'),
      md_path_prefix: '../../assets',
    },
    paths: {
      posts: path.join(blogRoot, 'source', '_posts'),
      drafts: path.join(blogRoot, 'source', '_drafts'),
      trash: path.join(blogRoot, 'source', '_trash'),
      site_cms: path.join(blogRoot, 'source', '_data', 'site_cms.yml'),
      assets: path.join(blogRoot, 'assets'),
      web_images: path.join(blogRoot, 'source', 'images', 'web'),
    },
  };
}
