const BASE = '/api';
const API_KEY_STORAGE = 'meiso_manage_api_key';

export function getStoredApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key) {
  try {
    const v = String(key || '').trim();
    if (v) localStorage.setItem(API_KEY_STORAGE, v);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch (_) {}
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const key = getStoredApiKey();
  if (key) headers['X-Api-Key'] = key;
  return headers;
}

async function request(path, init) {
  const headers = authHeaders({
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  });
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      if (j.detail) detail = j.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const fetchHealth = () => request('/health');
export const fetchConfig = () => request('/config');
export const saveConfig = (body) =>
  request('/config', { method: 'PUT', body: JSON.stringify(body) });
export const openBlogRoot = () => request('/actions/open-blog-root', { method: 'POST' });
export const openPreview = () => request('/actions/open-preview', { method: 'POST' });
/** 检测并必要时启动 Hexo 预览，再在浏览器打开 */
export const openLivePreview = () => request('/actions/live-preview', { method: 'POST' });
export const openDecapAdmin = () => request('/actions/open-decap-admin', { method: 'POST' });
export const fetchStats = () => request('/stats');
export const fetchPosts = (params = {}) => {
  const q = new URLSearchParams();
  if (params.q) q.set('q', params.q);
  if (params.category) q.set('category', params.category);
  if (params.tag) q.set('tag', params.tag);
  if (params.status) q.set('status', params.status);
  const s = q.toString();
  return request(`/posts${s ? `?${s}` : ''}`);
};
export const fetchPost = (id, params = {}) => {
  if (params.draft === true) {
    return request(`/drafts/${encodeURIComponent(id)}`);
  }
  const q = new URLSearchParams();
  if (params.draft === false) q.set('draft', '0');
  const s = q.toString();
  return request(`/posts/${encodeURIComponent(id)}${s ? `?${s}` : ''}`);
};
export const createDraft = (body) =>
  request('/drafts', { method: 'POST', body: JSON.stringify(body) });
export const updateDraft = (id, body) =>
  request(`/drafts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const publishDraft = (id, body) =>
  request(`/drafts/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify(body) });
export const createPost = (body) =>
  request('/posts', { method: 'POST', body: JSON.stringify(body) });
export const updatePost = (id, body) =>
  request(`/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const removePost = (id, params = {}) => {
  if (params.draft === true) {
    return request(`/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  const q = new URLSearchParams();
  if (params.draft === false) q.set('draft', '0');
  const s = q.toString();
  return request(`/posts/${encodeURIComponent(id)}${s ? `?${s}` : ''}`, { method: 'DELETE' });
};
export const fetchTrash = () => request('/trash');
export const restoreTrash = (id) =>
  request(`/trash/${encodeURIComponent(id)}/restore`, { method: 'POST' });
export const purgeTrash = (id) =>
  request(`/trash/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const fetchSiteCms = () => request('/site-cms');
export const saveSiteCms = (data) =>
  request('/site-cms', { method: 'PUT', body: JSON.stringify(data) });
export const runBuild = () => request('/build', { method: 'POST' });

export const fetchActivityLog = (after = 0) =>
  request(`/activity-log?after=${encodeURIComponent(after)}`);
export const clearActivityLogApi = () => request('/activity-log/clear', { method: 'POST' });

export const fetchPublishStatus = (quick = false) =>
  request(`/publish/status${quick ? '?quick=1' : ''}`);
export const publishScan = () => request('/publish/scan', { method: 'POST' });
export const publishSync = () => request('/publish/sync', { method: 'POST' });
export const publishBuildProd = () => request('/publish/build-prod', { method: 'POST' });
export const publishBuildLocal = () => request('/publish/build-local', { method: 'POST' });
export const publishDeployFull = () => request('/publish/deploy-full', { method: 'POST' });
export const publishOpenSite = () => request('/publish/open-site', { method: 'POST' });
export const publishOpenSyncFolder = () => request('/publish/open-sync-folder', { method: 'POST' });

export const fetchPhoneChannelMoments = () => request('/phone-channel/moments');
export const phoneChannelAssetUrl = (filename) =>
  `/api/phone-channel/asset/${encodeURIComponent(pathBasename(filename))}`;

function pathBasename(name) {
  const s = String(name || '').replace(/\\/g, '/');
  const i = s.lastIndexOf('/');
  return i >= 0 ? s.slice(i + 1) : s;
}

export const deletePhoneChannelItems = (items) =>
  request('/phone-channel/delete', { method: 'POST', body: JSON.stringify({ items }) });
export const deletePhoneChannelRange = (start, end) =>
  request('/phone-channel/delete-range', { method: 'POST', body: JSON.stringify({ start, end }) });
export const deletePhoneChannelAll = () => request('/phone-channel/delete-all', { method: 'POST' });
export const importPhoneChannelToBlog = (keys) =>
  request('/phone-channel/import', { method: 'POST', body: JSON.stringify({ keys }) });

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', headers: authHeaders(), body: fd });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      if (j.detail) detail = j.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}
