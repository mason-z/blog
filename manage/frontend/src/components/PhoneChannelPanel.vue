<script setup>
import { ref, computed, watch, onUnmounted, inject } from 'vue';
import ArticleLightbox from './ArticleLightbox.vue';
import {
  fetchPhoneChannelMoments,
  phoneChannelAssetUrl,
  deletePhoneChannelItems,
  deletePhoneChannelRange,
  deletePhoneChannelAll,
  importPhoneChannelToBlog,
  publishOpenSyncFolder,
  publishSync,
} from '../api';

const props = defineProps({
  active: { type: Boolean, default: true },
});

const refreshPostListFromDisk = inject('refreshPostListFromDisk', null);

const loading = ref(true);
const busy = ref(false);
const error = ref('');
const toast = ref('');
const syncRoot = ref('');
const exists = ref(false);
const moments = ref([]);
const counts = ref({ total: 0, drafts: 0, posts: 0 });

const selectionMode = ref(false);
const selectedKeys = ref(new Set());
const showMenu = ref(false);

const showConfirmMulti = ref(false);
const showConfirmAll = ref(false);
const showDateDialog = ref(false);
const rangeStart = ref('');
const rangeEnd = ref('');

const lightboxOpen = ref(false);
const lightboxImages = ref([]);
const lightboxIndex = ref(0);

let pollTimer = null;

function momentKey(m) {
  return m.key || `${m.is_draft}_${m.id}`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}月${p(d.getDate())}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function todayIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function refresh() {
  error.value = '';
  try {
    const data = await fetchPhoneChannelMoments();
    if (!data.ok) {
      error.value = data.error || '加载失败';
      moments.value = [];
      return;
    }
    syncRoot.value = data.sync_root || '';
    exists.value = data.exists !== false;
    moments.value = data.moments || [];
    counts.value = data.counts || { total: moments.value.length, drafts: 0, posts: 0 };
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  stopPolling();
  loading.value = true;
  void refresh();
  pollTimer = setInterval(() => refresh(), 15000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

watch(
  () => props.active,
  (on) => {
    if (on) startPolling();
    else stopPolling();
  },
  { immediate: true },
);

onUnmounted(stopPolling);

function clearSelection() {
  selectionMode.value = false;
  selectedKeys.value = new Set();
}

function toggleKey(key) {
  const next = new Set(selectedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedKeys.value = next;
}

function enterSelection(key) {
  selectionMode.value = true;
  const next = new Set();
  if (key) next.add(key);
  selectedKeys.value = next;
}

const allSelected = computed(
  () => moments.value.length > 0 && selectedKeys.value.size === moments.value.length,
);

function toggleSelectAll() {
  if (allSelected.value) selectedKeys.value = new Set();
  else selectedKeys.value = new Set(moments.value.map((m) => momentKey(m)));
}

const rangeMatchCount = computed(() => {
  if (!rangeStart.value || !rangeEnd.value) return 0;
  const lo = new Date(`${rangeStart.value}T00:00:00`).getTime();
  const hi = new Date(`${rangeEnd.value}T23:59:59.999`).getTime();
  if (Number.isNaN(lo) || Number.isNaN(hi)) return 0;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return moments.value.filter((m) => m.created_at >= a && m.created_at <= b).length;
});

function notify(msg) {
  toast.value = msg;
  setTimeout(() => {
    if (toast.value === msg) toast.value = '';
  }, 3500);
}

async function runAction(fn) {
  busy.value = true;
  error.value = '';
  try {
    const r = await fn();
    return r;
  } catch (e) {
    error.value = e.message || '操作失败';
    return null;
  } finally {
    busy.value = false;
  }
}

async function doDeleteSelected() {
  showConfirmMulti.value = false;
  const keys = [...selectedKeys.value];
  const items = moments.value.filter((m) => keys.includes(momentKey(m)));
  const r = await runAction(() => deletePhoneChannelItems(items));
  if (r) {
    notify(`已删除 ${r.deleted} 条${r.failed ? `，失败 ${r.failed} 条` : ''}`);
    clearSelection();
    await refresh();
  }
}

async function doDeleteAll() {
  showConfirmAll.value = false;
  const r = await runAction(() => deletePhoneChannelAll());
  if (r) {
    notify(`已删除 ${r.deleted} 条`);
    clearSelection();
    await refresh();
  }
}

async function doDeleteRange() {
  if (rangeMatchCount.value <= 0) return;
  showDateDialog.value = false;
  const r = await runAction(() => deletePhoneChannelRange(rangeStart.value, rangeEnd.value));
  if (r) {
    notify(`已删除 ${r.deleted} 条（匹配 ${r.matched ?? rangeMatchCount.value} 条）`);
    clearSelection();
    await refresh();
  }
}

async function doImportSelected() {
  const keys = [...selectedKeys.value];
  if (!keys.length) return;
  const r = await runAction(() => importPhoneChannelToBlog(keys));
  if (r) {
    notify(`已导入博客 ${r.copied} 条${r.failed ? `，失败 ${r.failed} 条` : ''}`);
    clearSelection();
    if (refreshPostListFromDisk) await refreshPostListFromDisk();
  }
}

async function doSyncAllToBlog() {
  const r = await runAction(() => publishSync());
  if (r?.summary?.ok || r?.ok) {
    notify('已同步通道 → 博客（按时间戳覆盖）');
  } else if (r) {
    notify('同步完成，详见发布中心日志');
  }
  if (r && refreshPostListFromDisk) await refreshPostListFromDisk();
}

function openLightbox(names, index) {
  lightboxImages.value = names.map((n) => ({ src: phoneChannelAssetUrl(n), alt: '' }));
  lightboxIndex.value = index;
  lightboxOpen.value = true;
}

function onLightboxStep(delta) {
  const n = lightboxImages.value.length;
  if (!n) return;
  lightboxIndex.value = (lightboxIndex.value + delta + n) % n;
}

function openDateDialog() {
  const t = todayIso();
  if (!rangeStart.value) rangeStart.value = t;
  if (!rangeEnd.value) rangeEnd.value = t;
  showDateDialog.value = true;
  showMenu.value = false;
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-[#ededed]">
    <header
      class="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white px-4 py-3 shadow-sm"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-gray-900">
          {{ selectionMode ? `已选 ${selectedKeys.size} 条` : '手机通道' }}
        </h2>
        <p v-if="syncRoot" class="truncate text-[11px] text-gray-500" :title="syncRoot">
          {{ exists ? syncRoot : '目录不存在' }} · 草稿 {{ counts.drafts }} · 已发表 {{ counts.posts }}
        </p>
      </div>
      <template v-if="selectionMode">
        <button type="button" class="btn-ghost text-xs text-gray-700" :disabled="busy" @click="clearSelection">
          取消
        </button>
        <button type="button" class="btn-ghost text-xs text-emerald-600" :disabled="busy" @click="toggleSelectAll">
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
        <button
          type="button"
          class="btn-outline text-xs"
          :disabled="busy || !selectedKeys.size"
          @click="doImportSelected"
        >
          导入博客
        </button>
        <button
          type="button"
          class="btn-outline text-xs text-red-500"
          :disabled="busy || !selectedKeys.size"
          @click="showConfirmMulti = true"
        >
          删除
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn-outline text-xs" :disabled="busy || loading" @click="refresh">
          刷新
        </button>
        <button type="button" class="btn-outline text-xs" :disabled="busy" @click="doSyncAllToBlog">
          全部同步进博客
        </button>
        <div class="relative">
          <button type="button" class="btn-ghost h-9 w-9 p-0 text-gray-700" :disabled="busy" @click="showMenu = !showMenu">
            ⋮
          </button>
          <div
            v-if="showMenu"
            class="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              @click="showMenu = false; enterSelection(null)"
            >
              多选删除
            </button>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              @click="openDateDialog"
            >
              按日期区间删除
            </button>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              @click="showMenu = false; showConfirmAll = true"
            >
              全部删除
            </button>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              @click="showMenu = false; publishOpenSyncFolder()"
            >
              打开 Sync 文件夹
            </button>
          </div>
        </div>
      </template>
    </header>

    <p v-if="error" class="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{{ error }}</p>
    <p v-if="toast" class="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">{{ toast }}</p>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div v-if="loading" class="py-8 text-center text-sm text-gray-500">加载中…</div>
      <div v-else-if="!moments.length" class="mx-auto max-w-md py-12 text-center text-sm text-gray-500">
        通道里暂无 posts / drafts 下的 .md 文件
      </div>
      <div v-else class="mx-auto flex max-w-md flex-col gap-2">
        <article
          v-for="m in moments"
          :key="momentKey(m)"
          class="rounded-md bg-white p-4 shadow-sm transition"
          :class="selectionMode && selectedKeys.has(momentKey(m)) ? 'ring-2 ring-emerald-500/40' : ''"
          @click="selectionMode ? toggleKey(momentKey(m)) : null"
          @contextmenu.prevent="enterSelection(momentKey(m))"
        >
          <div class="flex items-start gap-2">
            <input
              v-if="selectionMode"
              type="checkbox"
              class="mt-1"
              :checked="selectedKeys.has(momentKey(m))"
              @click.stop
              @change="toggleKey(momentKey(m))"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-900">我</span>
                <span class="ml-auto text-[11px] text-gray-400">{{ m.is_draft ? '草稿' : '已发表' }}</span>
              </div>
              <time class="mt-1 block text-xs text-gray-400">{{ formatTime(m.created_at) }}</time>
              <p v-if="m.body" class="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
                {{ m.body }}
              </p>
              <div
                v-if="m.image_names?.length"
                class="photo-grid photo-grid--5 photo-grid--preview photo-grid--size-m mt-3"
              >
                <figure
                  v-for="(name, idx) in m.image_names"
                  :key="name"
                  class="photo-grid__cell cursor-zoom-in"
                  @click.stop="openLightbox(m.image_names, idx)"
                >
                  <img :src="phoneChannelAssetUrl(name)" alt="" loading="lazy" decoding="async" />
                </figure>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>

    <ArticleLightbox
      :open="lightboxOpen"
      :images="lightboxImages"
      :index="lightboxIndex"
      @close="lightboxOpen = false"
      @step="onLightboxStep"
    />

    <div
      v-if="showConfirmMulti"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showConfirmMulti = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 class="font-semibold text-gray-900">删除所选</h3>
        <p class="mt-2 text-sm text-gray-600">
          将删除通道内 {{ selectedKeys.size }} 条记录及对应图片；不自动删除博客 source 中已导入的文件。
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-ghost text-sm" @click="showConfirmMulti = false">取消</button>
          <button type="button" class="btn-primary text-sm !bg-red-600" @click="doDeleteSelected">删除</button>
        </div>
      </div>
    </div>

    <div
      v-if="showConfirmAll"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showConfirmAll = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 class="font-semibold text-gray-900">全部删除</h3>
        <p class="mt-2 text-sm text-gray-600">
          确定删除通道内全部 {{ moments.length }} 条？仅影响 Sync 文件夹，不可恢复。
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-ghost text-sm" @click="showConfirmAll = false">取消</button>
          <button type="button" class="btn-primary text-sm !bg-red-600" @click="doDeleteAll">全部删除</button>
        </div>
      </div>
    </div>

    <div
      v-if="showDateDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showDateDialog = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 class="font-semibold text-gray-900">按日期删除</h3>
        <p class="mt-1 text-xs text-gray-500">起止日均包含；按文章 date 或文件时间。</p>
        <div class="mt-3 space-y-2">
          <label class="block text-xs text-gray-500">
            开始
            <input v-model="rangeStart" type="date" class="input mt-1" />
          </label>
          <label class="block text-xs text-gray-500">
            结束
            <input v-model="rangeEnd" type="date" class="input mt-1" />
          </label>
          <p class="text-sm text-gray-700">将删除约 {{ rangeMatchCount }} 条</p>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-ghost text-sm" @click="showDateDialog = false">取消</button>
          <button
            type="button"
            class="btn-primary text-sm !bg-red-600"
            :disabled="rangeMatchCount <= 0"
            @click="doDeleteRange"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
