import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  loadConfig,
  getBlogRoot,
  getUploadsDir,
  getAssetsDir,
  FRONTEND_DIST,
  saveConfig,
  getConfigPublic,
  assertInsideBlog,
  getApiToken,
  randomApiToken,
} from './paths.mjs';
import {
  listPosts,
  invalidateListCache,
  getManageSiteStats,
  listTrash,
  getPost,
  savePost,
  trashPost,
  restorePost,
  purgePost,
  collectTags,
  collectCategories,
} from './posts.mjs';
import { getSiteCms, saveSiteCms } from './site-cms.mjs';
import { openPath, openUrl } from './actions.mjs';
import { scanPhoneChannelSync } from './phone-sync.mjs';
import {
  publishStatus,
  scanPhoneChannel,
  syncPhoneChannel,
  wranglerWhoami,
  runBuildProd,
  runBuildLocal,
  runDeploy,
  openSite,
  openSyncFolder,
} from './publish.mjs';
import {
  openLivePreview,
  startPreviewLiveSync,
  getPreviewRevision,
  regeneratePreviewNow,
  markProdPublicFresh,
  getPreviewModeInfo,
} from './preview.mjs';
import { afterBlogSourceChanged } from './blog-sync.mjs';
import { getActivityLog, clearActivityLog, activityLogStatus } from './activity-log.mjs';

function notifyPreviewAfterPostWrite() {
  activityLogStatus('文章已保存，正在更新预览…');
  void regeneratePreviewNow();
}
import {
  listPhoneChannelMoments,
  deletePhoneChannelMoments,
  deletePhoneChannelByDateRange,
  deleteAllPhoneChannelMoments,
  getPhoneChannelAssetPath,
  copyPhoneChannelMomentsToBlog,
} from './phone-channel.mjs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function ensureApiToken() {
  if (getApiToken()) return getApiToken();
  const cfg = loadConfig();
  const token = randomApiToken();
  saveConfig({ server: { ...cfg.server, apiToken: token } });
  console.log(`[meiso-manage] 已生成手机 API 密钥，见 manage/config.json → server.apiToken`);
  return token;
}

function isLocalManageClient(req) {
  const host = String(req.get('host') || '').split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  const raw = String(req.socket?.remoteAddress || '');
  const ip = raw.replace(/^::ffff:/i, '');
  return ip === '127.0.0.1' || ip === '::1';
}

function requireWriteAuth(req, res, next) {
  // 本机管理页（127.0.0.1 / localhost）不要求密钥；手机 App 走局域网时再校验
  if (isLocalManageClient(req)) return next();
  const expected = getApiToken() || ensureApiToken();
  if (!expected) return next();
  const hdr =
    req.get('X-Api-Key') ||
    (req.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (hdr === expected) return next();
  return res.status(401).json({ detail: '需要有效的 X-Api-Key' });
}

app.get('/api/health', (_req, res) => {
  const cfg = loadConfig();
  ensureApiToken();
  res.json({
    ok: true,
    version: '1.4.0',
    drafts_api: true,
    trash_api: true,
    quick_post_api: true,
    publish_api: true,
    phone_channel_api: true,
    media_storage: 'assets',
    blog_root: getBlogRoot(),
    title: cfg.ui?.title || 'meiso 管理',
    auth_required: true,
  });
});

app.get('/api/config', (_req, res) => {
  res.json(getConfigPublic());
});

app.put('/api/config', requireWriteAuth, (req, res) => {
  try {
    const body = req.body || {};
    const patch = {};
    if (body.blog_root_input != null) patch.blogRoot = String(body.blog_root_input).trim();
    if (body.title != null) patch.ui = { ...(loadConfig().ui || {}), title: String(body.title).trim() };
    if (body.preview_url != null) {
      patch.ui = { ...(patch.ui || loadConfig().ui || {}), previewUrl: String(body.preview_url).trim() };
    }
    if (body.decap_admin_url != null) {
      patch.ui = { ...(patch.ui || loadConfig().ui || {}), decapAdminUrl: String(body.decap_admin_url).trim() };
    }
    saveConfig(patch);
    res.json(getConfigPublic());
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/actions/open-blog-root', requireWriteAuth, (_req, res) => {
  try {
    openPath(getBlogRoot());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/actions/open-preview', requireWriteAuth, (_req, res) => {
  try {
    const cfg = loadConfig();
    openUrl(cfg.ui?.previewUrl || 'http://127.0.0.1:4010');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.get('/api/preview/revision', (_req, res) => {
  res.json({ revision: getPreviewRevision(), interval_ms: 3000 });
});

app.get('/api/preview/mode', (_req, res) => {
  res.json(getPreviewModeInfo());
});

app.post('/api/actions/live-preview', requireWriteAuth, async (_req, res) => {
  try {
    res.json(await openLivePreview());
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/actions/open-decap-admin', requireWriteAuth, (_req, res) => {
  try {
    const cfg = loadConfig();
    openUrl(cfg.ui?.decapAdminUrl || 'http://127.0.0.1:4010/admin/');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.get('/api/stats', (_req, res) => {
  try {
    res.json(getManageSiteStats());
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.get('/api/posts', (req, res) => {
  const status = String(req.query.status || 'all').trim();
  const allowed = ['all', 'published', 'draft', 'private', 'trash'];
  let posts = listPosts({ status: allowed.includes(status) ? status : 'all' });
  const q = String(req.query.q || '').trim().toLowerCase();
  const cat = String(req.query.category || '').trim();
  const tag = String(req.query.tag || '').trim();
  if (q) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }
  if (cat) posts = posts.filter((p) => p.categories.includes(cat));
  if (tag) posts = posts.filter((p) => p.tags.includes(tag));
  res.json({ entries: posts });
});

app.get('/api/posts/:id', (req, res) => {
  const draftQ = req.query.draft;
  const post = getPost(req.params.id, {
    draft: draftQ === undefined ? undefined : draftQ,
  });
  if (!post) return res.status(404).json({ detail: '文章不存在' });
  res.json(post);
});

app.get('/api/drafts/:id', (req, res) => {
  const post = getPost(req.params.id, { draft: true });
  if (!post) return res.status(404).json({ detail: '草稿不存在' });
  res.json(post);
});

app.post('/api/drafts', requireWriteAuth, (req, res) => {
  try {
    const saved = savePost(null, { ...(req.body || {}), draft: true });
    notifyPreviewAfterPostWrite();
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.put('/api/drafts/:id', requireWriteAuth, (req, res) => {
  try {
    const saved = savePost(req.params.id, { ...(req.body || {}), draft: true });
    notifyPreviewAfterPostWrite();
    res.json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/drafts/:id/publish', requireWriteAuth, (req, res) => {
  try {
    const saved = savePost(req.params.id, { ...(req.body || {}), draft: false });
    notifyPreviewAfterPostWrite();
    res.json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.delete('/api/drafts/:id', requireWriteAuth, (req, res) => {
  if (!trashPost(req.params.id, { draft: true })) {
    return res.status(404).json({ detail: '草稿不存在' });
  }
  notifyPreviewAfterPostWrite();
  res.json({ ok: true });
});

app.post('/api/posts', requireWriteAuth, (req, res) => {
  try {
    const saved = savePost(null, { ...(req.body || {}), draft: false });
    notifyPreviewAfterPostWrite();
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.put('/api/posts/:id', requireWriteAuth, (req, res) => {
  try {
    const saved = savePost(req.params.id, { ...(req.body || {}), draft: false });
    notifyPreviewAfterPostWrite();
    res.json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.delete('/api/posts/:id', requireWriteAuth, (req, res) => {
  const draftQ = req.query.draft;
  if (!trashPost(req.params.id, { draft: draftQ === undefined ? undefined : draftQ })) {
    return res.status(404).json({ detail: '文章不存在' });
  }
  notifyPreviewAfterPostWrite();
  res.json({ ok: true });
});

app.get('/api/trash', (_req, res) => {
  res.json({ entries: listTrash() });
});

app.post('/api/trash/:id/restore', requireWriteAuth, (req, res) => {
  const restored = restorePost(req.params.id);
  if (!restored) return res.status(404).json({ detail: '垃圾桶中找不到该文章' });
  notifyPreviewAfterPostWrite();
  res.json(restored);
});

app.delete('/api/trash/:id', requireWriteAuth, (req, res) => {
  if (!purgePost(req.params.id)) {
    return res.status(404).json({ detail: '垃圾桶中找不到该文章' });
  }
  notifyPreviewAfterPostWrite();
  res.json({ ok: true });
});

app.get('/api/site-cms', (_req, res) => {
  res.json(getSiteCms());
});

app.put('/api/site-cms', requireWriteAuth, (req, res) => {
  try {
    res.json(saveSiteCms(req.body || {}));
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.get('/api/media/:filename', (req, res) => {
  try {
    let filename = String(req.params.filename || '');
    try {
      filename = decodeURIComponent(filename);
    } catch (_) {}
    filename = path.basename(filename);
    if (!filename) return res.status(400).json({ detail: '无效文件名' });
    const full = path.join(getAssetsDir(), filename);
    assertInsideBlog(full);
    if (!fs.existsSync(full)) return res.status(404).json({ detail: '文件不存在' });
    res.sendFile(full);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/upload', requireWriteAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: '未收到文件' });
  try {
    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    let filename = path.basename(req.file.originalname || 'upload.bin');
    let full = path.join(dir, filename);
    if (fs.existsSync(full)) {
      const ext = path.extname(filename);
      const stem = path.basename(filename, ext);
      filename = `${stem}-${Date.now()}${ext}`;
      full = path.join(dir, filename);
    }
    fs.writeFileSync(full, req.file.buffer);
    res.json({
      url: `../../assets/${filename}`,
      filename,
      storage: 'assets',
    });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/quick-post', requireWriteAuth, (req, res) => {
  try {
    const { text, images, draft, private: privateFlag, title, tags } = req.body || {};
    const parts = [];
    const trimmed = String(text || '').trim();
    if (trimmed) parts.push(trimmed);
    for (const raw of images || []) {
      const base = path.basename(String(raw || ''));
      if (!base) continue;
      parts.push(`![](../../assets/${base})`);
    }
    if (!parts.length) {
      return res.status(400).json({ detail: '请填写文字或至少一张图片' });
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const autoTitle =
      (title && String(title).trim()) ||
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 随手记`;
    const body = parts.join('\n\n');
    const tagList = Array.isArray(tags) && tags.length ? tags : ['手机'];
    const saved = savePost(null, {
      title: autoTitle,
      body,
      date: new Date(),
      draft: Boolean(draft),
      private: Boolean(privateFlag),
      categories: ['随笔'],
      tags: tagList,
    });
    notifyPreviewAfterPostWrite();
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.get('/api/activity-log', (req, res) => {
  const after = Number(req.query.after) || 0;
  res.json(getActivityLog(after));
});

app.post('/api/activity-log/clear', requireWriteAuth, (_req, res) => {
  clearActivityLog();
  res.json({ ok: true });
});

app.get('/api/publish/status', async (req, res) => {
  try {
    const quick = req.query.quick === '1';
    res.json(await publishStatus({ skipCloudflare: quick }));
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/scan', requireWriteAuth, async (_req, res) => {
  try {
    activityLogStatus('正在扫描手机通道…');
    const r = scanPhoneChannelSync();
    const pending = r.scan?.pendingTotal ?? 0;
    activityLogStatus(`扫描完成，待同步 ${pending} 个文件`);
    res.json(r);
  } catch (e) {
    activityLogStatus('扫描手机通道失败');
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/sync', requireWriteAuth, async (_req, res) => {
  try {
    const r = await syncPhoneChannel();
    if (r.ok) afterBlogSourceChanged();
    else invalidateListCache();
    res.json(r);
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/build-prod', requireWriteAuth, async (_req, res) => {
  try {
    const r = await runBuildProd();
    if (r.ok) markProdPublicFresh();
    res.json(r);
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/build-local', requireWriteAuth, async (_req, res) => {
  try {
    res.json(await runBuildLocal());
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/deploy', requireWriteAuth, async (_req, res) => {
  try {
    res.json(await runDeploy());
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/deploy-full', requireWriteAuth, async (_req, res) => {
  try {
    activityLogStatus('开始一键部署上线…');
    const steps = [];
    activityLogStatus('第 1 步：扫描手机通道…');
    const scan = scanPhoneChannelSync();
    steps.push({ step: 'scan', ...scan });
    const pending = scan.scan?.pendingTotal ?? 0;
    activityLogStatus(`扫描完成，待同步 ${pending} 个文件`);
    activityLogStatus('第 2 步：同步到博客目录…');
    const sync = await syncPhoneChannel();
    steps.push({ step: 'sync', ...sync });
    if (!sync.ok) {
      activityLogStatus('一键部署已中止：同步失败');
      return res.json({ ok: false, steps });
    }
    invalidateListCache();
    activityLogStatus('第 3 步：检查 Cloudflare 登录…');
    const who = await wranglerWhoami();
    steps.push({ step: 'cloudflare', ...who });
    if (!who.loggedIn) {
      activityLogStatus('未登录 Cloudflare，请先在本机终端执行 npx wrangler login');
      return res.json({
        ok: false,
        steps,
        detail: '未登录 Cloudflare，请在终端运行 npx wrangler login',
      });
    }
    activityLogStatus('Cloudflare 已登录，开始上传到线上…');
    const deploy = await runDeploy();
    steps.push({ step: 'deploy', ...deploy });
    activityLogStatus(deploy.ok ? '一键部署完成，线上站点已更新' : '部署失败，一键流程未完成');
    if (deploy.ok) {
      markProdPublicFresh();
      activityLogStatus('本机 public/ 已与刚部署的线上一致，可点「实时预览」核对');
    }
    res.json({ ok: deploy.ok, steps });
  } catch (e) {
    activityLogStatus('一键部署出错');
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/open-site', requireWriteAuth, (_req, res) => {
  try {
    openSite();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/publish/open-sync-folder', requireWriteAuth, (_req, res) => {
  try {
    openSyncFolder();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.get('/api/phone-channel/moments', (_req, res) => {
  try {
    res.json(listPhoneChannelMoments());
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

app.get('/api/phone-channel/asset/:filename', (req, res) => {
  try {
    const full = getPhoneChannelAssetPath(req.params.filename);
    if (!full) return res.status(404).json({ detail: '文件不存在' });
    res.sendFile(full);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/phone-channel/delete', requireWriteAuth, (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    res.json({ ok: true, ...deletePhoneChannelMoments(items) });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/phone-channel/delete-range', requireWriteAuth, (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ detail: '需要 start、end（yyyy-mm-dd）' });
    res.json({ ok: true, ...deletePhoneChannelByDateRange(String(start), String(end)) });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/phone-channel/delete-all', requireWriteAuth, (_req, res) => {
  try {
    res.json({ ok: true, ...deleteAllPhoneChannelMoments() });
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/phone-channel/import', requireWriteAuth, (req, res) => {
  try {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    const result = { ok: true, ...copyPhoneChannelMomentsToBlog(keys) };
    if (result.ok && (result.copied > 0 || keys.length > 0)) {
      afterBlogSourceChanged();
    } else {
      invalidateListCache();
    }
    res.json(result);
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) });
  }
});

app.post('/api/build', requireWriteAuth, async (_req, res) => {
  try {
    const r = await runBuildLocal();
    res.json(r);
  } catch (e) {
    res.status(500).json({ detail: String(e.message || e) });
  }
});

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

const cfg = loadConfig();
const host = cfg.server?.host || '127.0.0.1';
const port = Number(cfg.server?.port) || 8770;

app.listen(port, host, () => {
  console.log(`[meiso-manage] http://${host}:${port}/`);
  console.log(`[meiso-manage] 博客目录: ${getBlogRoot()}`);
  activityLogStatus(`管理后台已就绪（${host}:${port}）`);
  startPreviewLiveSync();
});
