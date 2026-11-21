<script setup>
import { ref, computed, onMounted, watch, provide } from 'vue';
import { usePublishHub } from './composables/usePublishHub';
import PostCard from './components/PostCard.vue';
import TrashCard from './components/TrashCard.vue';
import PostEditor from './components/PostEditor.vue';
import SitePanel from './components/SitePanel.vue';
import SettingsModal from './components/SettingsModal.vue';
import PublishPanel from './components/PublishPanel.vue';
import PhoneChannelPanel from './components/PhoneChannelPanel.vue';
import ActivityLogDock from './components/ActivityLogDock.vue';
import {
  fetchHealth,
  fetchStats,
  fetchPosts,
  fetchPost,
  createDraft,
  updateDraft,
  publishDraft,
  createPost,
  updatePost,
  removePost,
  restoreTrash,
  purgeTrash,
  fetchSiteCms,
  saveSiteCms,
  runBuild,
  openLivePreview,
} from './api';

const view = ref('posts');
const allEntries = ref([]);
const siteCms = ref(null);
const loading = ref(true);
const siteLoading = ref(false);
const building = ref(false);
const apiError = ref('');
const blogRoot = ref('');
const appTitle = ref('meiso 管理');
const showSettings = ref(false);
const previewBusy = ref(false);
const previewHint = ref('');

async function refreshPostListFromDisk() {
  await loadStats();
  await loadPosts();
}

const publishHub = usePublishHub({
  pollWhen: true,
  afterAction: async () => {
    await refreshPostListFromDisk();
  },
});
provide('publishHub', publishHub);
provide('refreshPostListFromDisk', refreshPostListFromDisk);
const {
  busy: publishBusy,
  pending: syncPending,
  error: publishError,
  handleScan,
  handleSync,
  handleBuildProd,
  handleBuildLocal,
  handleDeployFull,
  openSite: openPublishSite,
} = publishHub;

const query = ref('');
const categoryFilter = ref('');
const tagFilter = ref('');
const postStatusFilter = ref('all');
const stats = ref({ total: 0, drafts: 0, private: 0, trash: 0, tags: [], categories: [] });

/** @type {import('vue').Ref<Array<{ key: string, postId: string|null, post: object|null, loading: boolean, isNew: boolean }>>} */
const editorTabs = ref([]);
const activeEditorKey = ref(null);
let nextTabSeq = 1;

const categoryPresets = computed(() => {
  const presets = siteCms.value?.site_ui?.post_defaults?.category_presets;
  if (Array.isArray(presets) && presets.length) return presets;
  return ['随笔'];
});

const categoryOptions = computed(() => {
  const set = new Set([...categoryPresets.value, ...(stats.value.categories || [])]);
  return [...set].sort();
});

const defaultCategory = computed(() =>
  siteCms.value?.site_ui?.post_defaults?.default_category || '随笔'
);

const activeTab = computed(() => editorTabs.value.find((t) => t.key === activeEditorKey.value) || null);

const statusCounts = computed(() => ({
  all: (stats.value.total || 0) + (stats.value.drafts || 0) + (stats.value.private || 0),
  public: Math.max(0, (stats.value.total || 0) - (stats.value.private || 0)),
  private: stats.value.private || 0,
  trash: stats.value.trash || 0,
}));

const entries = computed(() => {
  const list = allEntries.value;
  if (postStatusFilter.value === 'trash') return list;
  if (postStatusFilter.value === 'public') return list.filter((p) => !p.is_draft && !p.private);
  if (postStatusFilter.value === 'private') return list.filter((p) => !p.is_draft && p.private);
  return list;
});

const emptyListHint = computed(() => {
  if (postStatusFilter.value === 'trash') return '垃圾桶是空的。删除的文章会出现在这里，可恢复或彻底删除。';
  if (postStatusFilter.value === 'private') return '暂无私有文章。设为私有后，预览与线上一致会隐藏。';
  if (postStatusFilter.value === 'public') return '暂无公开文章。';
  return '暂无文章';
});

const editorRefs = ref({});

let searchTimer;

function tabLabel(tab) {
  if (tab.loading) return '加载中…';
  const title = tab.post?.data?.title;
  const name = title || (tab.isNew ? '未命名' : '编辑');
  if (tab.post?.data?.private || tab.post?.private) return `${name} · 私有`;
  if (tab.isNew && !tab.post?.id) return `${name} *`;
  return name;
}

async function loadStats() {
  stats.value = await fetchStats();
}

async function loadPosts() {
  loading.value = true;
  apiError.value = '';
  try {
    const status =
      postStatusFilter.value === 'trash'
        ? 'trash'
        : postStatusFilter.value === 'private'
          ? 'private'
          : postStatusFilter.value === 'public'
            ? 'published'
            : 'all';
    const res = await fetchPosts({
      q: query.value,
      category: categoryFilter.value || undefined,
      tag: tagFilter.value || undefined,
      status,
    });
    allEntries.value = res.entries || [];
  } catch (e) {
    apiError.value = e.message || '加载失败';
    allEntries.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadSiteCms() {
  siteLoading.value = true;
  try {
    siteCms.value = await fetchSiteCms();
  } catch (e) {
    apiError.value = e.message || '加载站点配置失败';
  } finally {
    siteLoading.value = false;
  }
}

function startCreate() {
  view.value = 'posts';
  const key = `new-${nextTabSeq++}`;
  editorTabs.value.push({
    key,
    postId: null,
    isDraft: true,
    post: { id: null, data: {}, body: '' },
    loading: false,
    isNew: true,
  });
  activeEditorKey.value = key;
}

function updateTab(key, patch) {
  const idx = editorTabs.value.findIndex((t) => t.key === key);
  if (idx < 0) return;
  editorTabs.value[idx] = { ...editorTabs.value[idx], ...patch };
}

async function loadTabPost(tab) {
  updateTab(tab.key, { loading: true });
  try {
    const post = await fetchPost(tab.postId, { draft: tab.isDraft });
    updateTab(tab.key, { post, loading: false });
  } catch (e) {
    apiError.value = e.message || '加载文章失败';
    closeTab(tab.key);
  }
}

async function openPostInTab(id, isDraft = false) {
  view.value = 'posts';
  const draft = Boolean(isDraft);
  const existing = editorTabs.value.find((t) => t.postId === id && t.isDraft === draft);
  if (existing) {
    activeEditorKey.value = existing.key;
    if (existing.loading || !existing.post) {
      await loadTabPost(existing);
    }
    return;
  }
  const key = `edit-${draft ? 'd' : 'p'}-${id}`;
  const tab = {
    key,
    postId: id,
    isDraft: draft,
    post: null,
    loading: true,
    isNew: false,
  };
  editorTabs.value.push(tab);
  activeEditorKey.value = key;
  await loadTabPost(tab);
}

function showList() {
  activeEditorKey.value = null;
}

function closeTab(key) {
  const idx = editorTabs.value.findIndex((t) => t.key === key);
  if (idx < 0) return;
  editorTabs.value.splice(idx, 1);
  if (activeEditorKey.value === key) {
    activeEditorKey.value = editorTabs.value[idx]?.key || editorTabs.value[idx - 1]?.key || null;
  }
}

async function handleSavePost(tabKey, payload, asDraft) {
  const tab = editorTabs.value.find((t) => t.key === tabKey);
  if (!tab) return;
  apiError.value = '';
  const editor = editorRefs.value[tabKey];
  const mode = asDraft ? 'draft' : tab.post?.is_draft ? 'publish' : 'save';
  try {
    if (asDraft) {
      if (tab.isNew && !tab.post?.id) {
        tab.post = await createDraft(payload);
      } else {
        tab.post = await updateDraft(tab.postId || tab.post.id, payload);
      }
      tab.postId = tab.post.id;
      tab.isNew = false;
      postStatusFilter.value = 'all';
    } else if (tab.post?.is_draft && tab.post?.id) {
      tab.post = await publishDraft(tab.postId || tab.post.id, payload);
      tab.postId = tab.post.id;
      postStatusFilter.value = tab.post?.private ? 'private' : 'public';
    } else if (tab.isNew && !tab.post?.id) {
      tab.post = await createPost(payload);
      tab.postId = tab.post.id;
      tab.isNew = false;
    } else {
      tab.post = await updatePost(tab.postId || tab.post.id, payload);
      tab.postId = tab.post.id;
    }
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '保存失败';
  } finally {
    editor?.onSaved?.(mode);
  }
}

async function handleDeletePost(tabKey) {
  const tab = editorTabs.value.find((t) => t.key === tabKey);
  if (!tab?.post?.id) return;
  apiError.value = '';
  try {
    await removePost(tab.post.id, { draft: Boolean(tab.post.is_draft) });
    closeTab(tab.key);
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '移到垃圾桶失败';
  }
}

async function handleRestoreTrash(id) {
  apiError.value = '';
  try {
    await restoreTrash(id);
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '恢复失败';
  }
}

async function handlePurgeTrash(id, title) {
  if (!confirm(`确定彻底删除「${title || id}」？此操作不可恢复。`)) return;
  apiError.value = '';
  try {
    await purgeTrash(id);
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '彻底删除失败';
  }
}

function postPayloadFromFull(full) {
  return {
    title: full.data?.title || full.title,
    date: full.data?.date,
    categories: full.data?.categories,
    tags: full.data?.tags,
    cover: full.data?.cover,
    body: full.body,
    private: Boolean(full.private || full.data?.private),
  };
}

async function handleCardPublish(post) {
  if (!post?.is_draft) return;
  apiError.value = '';
  try {
    const full = await fetchPost(post.id, { draft: true });
    await publishDraft(post.id, postPayloadFromFull(full));
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '发布失败';
  }
}

async function handleCardTogglePrivate(post) {
  apiError.value = '';
  try {
    const full = await fetchPost(post.id, { draft: post.is_draft });
    const payload = {
      ...postPayloadFromFull(full),
      private: !(full.private || full.data?.private),
    };
    if (post.is_draft) {
      await updateDraft(post.id, payload);
    } else {
      await updatePost(post.id, payload);
    }
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '更新失败';
  }
}

async function handleCardDelete(post) {
  if (!confirm(`将「${post.title || post.id}」移到垃圾桶？`)) return;
  apiError.value = '';
  try {
    await removePost(post.id, { draft: Boolean(post.is_draft) });
    await loadStats();
    void loadPosts();
  } catch (e) {
    apiError.value = e.message || '删除失败';
  }
}

async function handleSaveSite(data) {
  apiError.value = '';
  try {
    siteCms.value = await saveSiteCms(data);
    alert('站点配置已保存');
  } catch (e) {
    apiError.value = e.message || '保存失败';
  }
}

async function handleLivePreview() {
  previewBusy.value = true;
  previewHint.value = '';
  apiError.value = '';
  try {
    const r = await openLivePreview();
    if (r?.detail && !r?.running) apiError.value = r.detail;
    previewHint.value = r?.hint || (r?.url ? `已打开 ${r.url}` : '');
  } catch (e) {
    apiError.value = e.message || '无法打开预览';
  } finally {
    previewBusy.value = false;
    if (previewHint.value) {
      setTimeout(() => {
        previewHint.value = '';
      }, 6000);
    }
  }
}

async function handleBuild() {
  building.value = true;
  apiError.value = '';
  try {
    const res = await runBuild();
    if (res.ok) alert('构建成功');
    else {
      apiError.value = '构建失败，见控制台日志';
      console.log(res.log);
      alert('构建失败（code ' + res.code + '）');
    }
  } catch (e) {
    apiError.value = e.message || '构建失败';
  } finally {
    building.value = false;
  }
}

function switchView(v) {
  view.value = v;
  if (v === 'site' || v === 'phone' || v === 'publish') {
    activeEditorKey.value = null;
  }
  if (v === 'site') loadSiteCms();
}

function onSettingsSaved(cfg) {
  if (cfg?.blog_root) blogRoot.value = cfg.blog_root;
  if (cfg?.title) appTitle.value = cfg.title;
}

watch([categoryFilter, tagFilter], loadPosts);
watch(postStatusFilter, loadPosts);
watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPosts, 180);
});

onMounted(async () => {
  try {
    const health = await fetchHealth();
    blogRoot.value = health.blog_root || '';
    appTitle.value = health.title || 'meiso 管理';
    if (!health.drafts_api) {
      apiError.value =
        '管理后端版本过旧（草稿 API 未启用）。请关闭旧窗口后重新运行 npm run manage:dev';
    }
    await Promise.all([loadStats(), loadPosts()]);
    loadSiteCms();
  } catch (e) {
    const raw = e.message || '';
    apiError.value =
      raw === 'Failed to fetch' || raw.includes('fetch')
        ? '无法连接管理 API（8770）。请双击「博客控制台.bat」启动后台；失败时查看仓库根目录 .manage-console.log'
        : raw || '无法连接后端，请先运行 博客控制台.bat';
  }
});
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface">
    <aside class="flex w-64 shrink-0 flex-col border-r border-surface-border bg-surface-raised">
      <div class="border-b border-surface-border px-5 py-5">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-lg text-accent">✎</div>
          <div>
            <h1 class="text-sm font-semibold tracking-wide text-white">{{ appTitle }}</h1>
            <p class="text-xs text-gray-500">本地博客管理</p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <section>
          <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">模块</h2>
          <div class="flex flex-col gap-1">
            <button
              :class="view === 'posts' ? 'chip-active w-full justify-start' : 'chip-inactive w-full justify-start'"
              @click="switchView('posts')"
            >
              博客文章 · {{ stats.total }}<span v-if="stats.private" class="text-gray-600">（{{ stats.private }} 私有）</span>
            </button>
            <button
              :class="view === 'site' ? 'chip-active w-full justify-start' : 'chip-inactive w-full justify-start'"
              @click="switchView('site')"
            >
              站点配置
            </button>
            <button
              :class="view === 'phone' ? 'chip-active w-full justify-start' : 'chip-inactive w-full justify-start'"
              @click="switchView('phone')"
            >
              手机通道
            </button>
            <button
              :class="view === 'publish' ? 'chip-active w-full justify-start' : 'chip-inactive w-full justify-start'"
              @click="switchView('publish')"
            >
              发布中心
            </button>
          </div>
        </section>

        <section v-if="view === 'posts'">
          <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">筛选</h2>
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              :class="postStatusFilter === 'all' ? 'chip-active' : 'chip-inactive'"
              @click="postStatusFilter = 'all'"
            >全部 {{ statusCounts.all }}</button>
            <button
              type="button"
              :class="postStatusFilter === 'public' ? 'chip-active' : 'chip-inactive'"
              @click="postStatusFilter = 'public'"
            >公开 {{ statusCounts.public }}</button>
            <button
              type="button"
              :class="postStatusFilter === 'private' ? 'chip-active' : 'chip-inactive'"
              @click="postStatusFilter = 'private'"
            >私有 {{ statusCounts.private }}</button>
            <button
              type="button"
              :class="postStatusFilter === 'trash' ? 'chip-active' : 'chip-inactive'"
              @click="postStatusFilter = 'trash'"
            >垃圾桶 {{ statusCounts.trash }}</button>
          </div>
        </section>

        <section v-if="view === 'posts' && syncPending > 0" class="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <p class="text-[11px] text-amber-200">手机通道有 {{ syncPending }} 个文件待同步 → 请到「发布中心」</p>
        </section>
      </div>

      <div class="border-t border-surface-border p-4 space-y-2">
        <button v-if="view === 'posts' && postStatusFilter !== 'trash'" class="btn-primary w-full" @click="startCreate">+ 新建文章</button>
        <button
          type="button"
          class="btn-outline w-full text-xs"
          :disabled="previewBusy"
          title="与 deploy 同一 build:prod + 同一 public/；请用 4010，不要用 npm run dev 的 4001"
          @click="handleLivePreview"
        >
          {{ previewBusy ? '正在打开预览…' : '实时预览站点' }}
        </button>
        <p v-if="blogRoot" class="truncate px-1 font-mono text-[10px] text-gray-600" :title="blogRoot">{{ blogRoot }}</p>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <div v-if="apiError" class="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-xs text-red-300">{{ apiError }}</div>
      <div v-if="previewHint" class="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-200">{{ previewHint }}</div>
      <div
        v-if="publishError && publishError !== apiError"
        class="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-xs text-red-300"
      >
        {{ publishError }}
      </div>

      <header
        v-if="view === 'posts' && !activeEditorKey"
        class="flex items-center gap-4 border-b border-surface-border bg-surface-raised/80 px-6 py-4 backdrop-blur-sm"
      >
        <div class="relative flex-1 max-w-xl">
          <input v-model="query" class="input pl-9" placeholder="搜索标题或摘要…" />
        </div>
        <span class="text-xs text-gray-500">
          {{ entries.length }} 篇
          <span v-if="postStatusFilter === 'public'" class="text-gray-600">· 公开</span>
          <span v-else-if="postStatusFilter === 'private'" class="text-gray-600">· 私有</span>
          <span v-else-if="postStatusFilter === 'trash'" class="text-gray-600">· 垃圾桶</span>
        </span>
        <button
          type="button"
          class="btn-outline shrink-0 text-xs"
          :disabled="previewBusy"
          @click="handleLivePreview"
        >
          实时预览
        </button>
        <button type="button" class="btn-ghost h-9 w-9 shrink-0 p-0" title="设置" @click="showSettings = true">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <header
        v-else-if="view === 'posts' && activeEditorKey"
        class="flex items-center gap-1 overflow-x-auto border-b border-surface-border bg-surface-raised/80 px-2 py-1.5"
      >
        <button
          type="button"
          class="btn-ghost shrink-0 text-xs text-gray-400"
          @click="showList"
        >
          ← 全部文章
        </button>
        <span class="text-gray-700">|</span>
        <button
          v-for="tab in editorTabs"
          :key="tab.key"
          type="button"
          class="group inline-flex max-w-[200px] shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition"
          :class="activeEditorKey === tab.key ? 'bg-accent/15 text-accent ring-1 ring-accent/30' : 'text-gray-400 hover:bg-surface-overlay hover:text-gray-200'"
          @click="activeEditorKey = tab.key"
        >
          <span class="truncate">{{ tabLabel(tab) }}</span>
          <span
            class="rounded p-0.5 opacity-60 hover:bg-surface-border hover:opacity-100"
            @click.stop="closeTab(tab.key)"
          >×</span>
        </button>
        <button type="button" class="btn-ghost ml-auto h-8 w-8 shrink-0 p-0" title="设置" @click="showSettings = true">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <header
        v-else-if="view === 'site'"
        class="flex items-center justify-between border-b border-surface-border bg-surface-raised/80 px-6 py-4 backdrop-blur-sm"
      >
        <h2 class="text-sm font-medium text-gray-300">站点配置</h2>
        <button type="button" class="btn-ghost h-9 w-9 shrink-0 p-0" title="设置" @click="showSettings = true">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <div class="relative flex min-h-0 flex-1">
        <template v-if="view === 'posts'">
          <PostEditor
            v-for="tab in editorTabs"
            v-show="activeEditorKey === tab.key"
            :key="tab.key"
            :ref="(el) => { if (el) editorRefs[tab.key] = el; }"
            class="absolute inset-0"
            :class="activeEditorKey === tab.key ? '' : 'pointer-events-none'"
            :post="tab.post"
            :loading="tab.loading"
            :is-new="tab.isNew"
            :category-options="categoryOptions"
            :default-category="defaultCategory"
            @save-draft="(payload) => handleSavePost(tab.key, payload, true)"
            @save-publish="(payload) => handleSavePost(tab.key, payload, false)"
            @delete="handleDeletePost(tab.key)"
            @close="closeTab(tab.key)"
          />
        </template>

        <section v-if="view === 'posts' && !activeEditorKey" class="min-h-0 flex-1 overflow-y-auto bg-[#ededed] p-6">
          <div v-if="loading" class="py-8 text-center text-sm text-gray-500">加载中…</div>
          <div v-else-if="!entries.length" class="py-12 text-center text-sm text-gray-500">{{ emptyListHint }}</div>
          <div v-else class="mx-auto flex w-full max-w-lg flex-col gap-2.5">
            <template v-if="postStatusFilter === 'trash'">
              <TrashCard
                v-for="p in entries"
                :key="`trash-${p.id}`"
                :post="p"
                @restore="handleRestoreTrash(p.id)"
                @purge="handlePurgeTrash(p.id, p.title)"
              />
            </template>
            <template v-else>
              <PostCard
                v-for="p in entries"
                :key="`${p.id}-${p.is_draft ? 'draft' : 'pub'}`"
                :post="p"
                :active="false"
                @select="openPostInTab(p.id, p.is_draft)"
                @publish="handleCardPublish(p)"
                @toggle-private="handleCardTogglePrivate(p)"
                @delete="handleCardDelete(p)"
              />
            </template>
          </div>
        </section>

        <section v-else-if="view === 'site'" class="min-w-0 flex-1 overflow-hidden">
          <SitePanel :data="siteCms" :loading="siteLoading" @save="handleSaveSite" />
        </section>

        <section v-else-if="view === 'phone'" class="min-w-0 flex-1 overflow-hidden">
          <PhoneChannelPanel :active="view === 'phone'" />
        </section>

        <section v-else-if="view === 'publish'" class="min-w-0 flex-1 overflow-hidden">
          <PublishPanel :active="view === 'publish'" />
        </section>
      </div>

      <ActivityLogDock />
    </main>

    <SettingsModal v-if="showSettings" @close="showSettings = false" @saved="onSettingsSaved" />
  </div>
</template>
