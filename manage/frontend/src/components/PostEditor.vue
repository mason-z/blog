<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { uploadFile, openLivePreview } from '../api';
import { toDatetimeLocalInput } from '../postDate.js';
import { mediaPreviewUrl, renderMarkdownPreview } from '../media';
import { bindPreviewLightbox, createLightboxController } from '../lightbox';
import ImageGalleryModal from './ImageGalleryModal.vue';
import ArticleLightbox from './ArticleLightbox.vue';

const props = defineProps({
  post: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  categoryOptions: { type: Array, default: () => ['随笔'] },
  defaultCategory: { type: String, default: '随笔' },
  isNew: { type: Boolean, default: false },
});

const emit = defineEmits(['save-draft', 'save-publish', 'delete', 'close']);

const showMeta = ref(false);
const previewMode = ref('split'); // split | edit | preview
const form = ref(emptyForm());
const saving = ref(false);
const savedHint = ref('');
const bodyRef = ref(null);
const uploadingImage = ref(false);
const sitePreviewBusy = ref(false);
const showGalleryModal = ref(false);
const previewRef = ref(null);
const lightboxOpen = ref(false);
const lightboxImages = ref([]);
const lightboxIndex = ref(0);

const lightbox = createLightboxController();
let unbindPreviewLightbox = null;

lightbox.setListener((state) => {
  lightboxOpen.value = state.open;
  lightboxImages.value = state.images;
  lightboxIndex.value = state.index;
  document.documentElement.classList.toggle('article-lightbox-open', state.open);
});

function setupPreviewLightbox() {
  if (unbindPreviewLightbox) {
    unbindPreviewLightbox();
    unbindPreviewLightbox = null;
  }
  if (previewRef.value) {
    unbindPreviewLightbox = bindPreviewLightbox(previewRef.value, lightbox);
  }
}

onMounted(() => {
  nextTick(setupPreviewLightbox);
});

onBeforeUnmount(() => {
  if (unbindPreviewLightbox) unbindPreviewLightbox();
  document.documentElement.classList.remove('article-lightbox-open');
});

function onLightboxStep(delta) {
  lightbox.step(delta);
}

function onLightboxClose() {
  lightbox.close();
}
function emptyForm() {
  return {
    title: '',
    date: new Date().toISOString().slice(0, 16),
    category: props.defaultCategory || '随笔',
    tagsText: '',
    cover: '',
    body: '',
    private: false,
  };
}

function formatTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return tags.map((t) => String(t).trim()).filter(Boolean).join('#');
}

function parseTags(text) {
  return String(text || '')
    .split('#')
    .map((s) => s.trim())
    .filter(Boolean);
}

function fromPost(post) {
  if (!post) {
    form.value = emptyForm();
    return;
  }
  const d = post.data || {};
  form.value = {
    title: d.title || '',
    date: toDatetimeLocalInput(d.date || d.updated),
    category: (Array.isArray(d.categories) && d.categories[0]) || props.defaultCategory || '随笔',
    tagsText: formatTags(d.tags),
    cover: d.cover || '',
    body: post.body || '',
    private: Boolean(d.private),
  };
}

function deriveTitle(title, body) {
  const t = String(title || '').trim();
  if (t) return t;
  const line = String(body || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return '未命名';
  return line.replace(/^#+\s*/, '').trim().slice(0, 48) || '未命名';
}

function toPayload() {
  const cat = String(form.value.category || '').trim() || props.defaultCategory || '随笔';
  const tags = parseTags(form.value.tagsText);
  return {
    title: deriveTitle(form.value.title, form.value.body),
    date: form.value.date,
    categories: [cat],
    tags,
    cover: form.value.cover || undefined,
    body: form.value.body,
    private: Boolean(form.value.private),
  };
}

const selectCategories = computed(() => {
  const set = new Set([
    ...(props.categoryOptions || []),
    form.value.category,
    props.defaultCategory,
  ].filter(Boolean));
  return [...set].sort();
});

const isDraft = computed(() => Boolean(props.post?.is_draft));
const isPrivate = computed(() => Boolean(form.value.private || props.post?.data?.private || props.post?.private));

const previewHtml = computed(() => renderMarkdownPreview(form.value.body));

watch(previewHtml, () => {
  nextTick(setupPreviewLightbox);
});

watch(previewMode, () => {
  nextTick(setupPreviewLightbox);
});

const coverPreviewUrl = computed(() => mediaPreviewUrl(form.value.cover));

const displayTitle = computed(() => {
  if (props.loading) return '加载中…';
  if (props.isNew && !props.post?.id) return '新建文章';
  const base = form.value.title || props.post?.data?.title || '编辑文章';
  if (isPrivate.value) return `${base}（私有）`;
  return base;
});

watch(
  () => props.post,
  (p) => {
    fromPost(p);
    if (props.isNew && !p?.id) showMeta.value = false;
  },
  { immediate: true }
);

watch(
  () => props.isNew,
  (v) => {
    if (v && !props.post?.id) showMeta.value = false;
  }
);

function onSaveDraft() {
  saving.value = true;
  savedHint.value = '';
  emit('save-draft', toPayload());
}

async function onOpenSitePreview() {
  sitePreviewBusy.value = true;
  try {
    await openLivePreview();
  } catch (_) {
    /* 父级 apiError 由全局处理不便；编辑器内静默，用户可用侧栏同按钮 */
  } finally {
    sitePreviewBusy.value = false;
  }
}

function onPublish() {
  saving.value = true;
  savedHint.value = '';
  emit('save-publish', toPayload());
}

function onSaved(mode) {
  saving.value = false;
  savedHint.value = form.value.private ? '已保存（私有）' : '已保存（公开）';
  setTimeout(() => {
    savedHint.value = '';
  }, 2500);
}

defineExpose({ onSaved, getDraft: () => ({ ...form.value }), isDirty: () => true });

function onDelete() {
  if (!props.post?.id) return;
  if (confirm(`确定将「${props.post.data?.title || props.post.id}」移到垃圾桶？可在垃圾桶中恢复。`)) {
    emit('delete');
  }
}

async function onUploadCover(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const res = await uploadFile(file);
    form.value.cover = res.url;
    showMeta.value = true;
  } catch (err) {
    alert(err.message || '上传失败');
  }
  e.target.value = '';
}

function insertAtCursor(text) {
  const el = bodyRef.value;
  if (!el) {
    form.value.body += text;
    return;
  }
  const start = el.selectionStart ?? form.value.body.length;
  const end = el.selectionEnd ?? start;
  const before = form.value.body.slice(0, start);
  const after = form.value.body.slice(end);
  form.value.body = before + text + after;
  nextTick(() => {
    el.focus();
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  });
}

async function insertImageFromFile(file) {
  if (!file || !String(file.type || '').startsWith('image/')) return false;
  uploadingImage.value = true;
  try {
    let toUpload = file;
    if (!file.name || file.name === 'image.png') {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      toUpload = new File([file], `paste-${Date.now()}.${ext}`, { type: file.type });
    }
    const res = await uploadFile(toUpload);
    const alt = toUpload.name.replace(/\.[^.]+$/, '') || '图片';
    insertAtCursor(`\n![${alt}](${res.url})\n`);
    if (previewMode.value === 'edit') previewMode.value = 'split';
    return true;
  } catch (err) {
    alert(err.message || '上传失败');
    return true;
  } finally {
    uploadingImage.value = false;
  }
}

async function onInsertImage(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  await insertImageFromFile(file);
  e.target.value = '';
}

function onInsertGallery(html) {
  insertAtCursor(html);
  if (previewMode.value === 'edit') previewMode.value = 'split';
}

function onBodyPaste(e) {
  const cd = e.clipboardData;
  if (!cd?.items?.length) return;

  const imageItems = [];
  for (let i = 0; i < cd.items.length; i += 1) {
    const item = cd.items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) imageItems.push(f);
    }
  }
  if (!imageItems.length) return;

  e.preventDefault();
  void (async () => {
    for (const file of imageItems) {
      await insertImageFromFile(file);
    }
  })();
}</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-surface">
    <div class="flex shrink-0 items-center gap-3 border-b border-surface-border bg-surface-raised/80 px-5 py-3">
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs text-gray-500">{{ displayTitle }}</p>
        <p v-if="post?.filename" class="truncate font-mono text-[10px] text-gray-600">{{ post.filename }}</p>
      </div>
      <button
        type="button"
        class="btn-ghost text-xs"
        :class="previewMode !== 'edit' ? 'text-accent' : ''"
        @click="
          previewMode =
            previewMode === 'split' ? 'edit' : previewMode === 'edit' ? 'split' : 'split'
        "
      >
        {{ previewMode === 'split' ? '仅编辑' : previewMode === 'preview' ? '分屏' : '分屏预览' }}
      </button>
      <button
        type="button"
        class="btn-ghost text-xs"
        :class="showMeta ? 'text-accent' : ''"
        @click="showMeta = !showMeta"
      >
        {{ showMeta ? '收起属性' : '属性' }}
      </button>
      <button
        type="button"
        class="btn-outline shrink-0 text-xs"
        :disabled="sitePreviewBusy"
        title="打开本地站点预览（每 3 秒自动刷新，保存文章后稍等即可）"
        @click="onOpenSitePreview"
      >
        {{ sitePreviewBusy ? '打开中…' : '实时预览' }}
      </button>
      <label class="btn-outline shrink-0 cursor-pointer text-xs" :class="uploadingImage ? 'opacity-50 pointer-events-none' : ''">
        {{ uploadingImage ? '上传中…' : '插入图片' }}
        <input type="file" class="hidden" accept="image/*" @change="onInsertImage" />
      </label>
      <button type="button" class="btn-outline shrink-0 text-xs" @click="showGalleryModal = true">插入图集</button>
      <span v-if="savedHint" class="text-xs text-accent/90">{{ savedHint }}</span>
      <button type="button" class="btn-outline text-xs" :disabled="loading || saving" @click="onSaveDraft">
        {{ saving ? '保存中…' : '保存草稿' }}
      </button>
      <button type="button" class="btn-primary text-xs" :disabled="loading || saving" @click="onPublish">
        {{ saving ? '发布中…' : '发布' }}
      </button>
      <button v-if="post?.id" type="button" class="btn-outline text-xs text-red-300" @click="onDelete">移到垃圾桶</button>
      <button type="button" class="btn-ghost h-8 w-8 p-0 text-gray-500" title="关闭标签" @click="emit('close')">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-gray-500">加载中…</div>

    <div v-else class="flex min-h-0 flex-1">
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="border-b border-surface-border/60 px-6 py-4">
          <input
            v-model="form.title"
            class="w-full border-0 bg-transparent text-2xl font-semibold text-white placeholder-gray-600 outline-none"
            placeholder="标题（可先留空，保存时从正文首行推断）"
          />
        </div>
        <div class="flex min-h-0 flex-1 flex-col md:flex-row">
          <textarea
            v-show="previewMode !== 'preview'"
            ref="bodyRef"
            v-model="form.body"
            class="min-h-[200px] flex-1 resize-none border-0 bg-transparent px-6 py-4 text-[15px] leading-relaxed text-gray-100 placeholder-gray-600 outline-none md:min-h-0"
            :class="previewMode === 'split' ? 'md:w-1/2 md:border-r md:border-surface-border/60' : 'w-full'"
            placeholder="开始写作…（Markdown，Ctrl+V 粘贴截图，右侧实时预览）"
            autofocus
            @paste="onBodyPaste"
          />
          <div
            v-show="previewMode !== 'edit'"
            ref="previewRef"
            class="editor-preview min-h-[200px] flex-1 overflow-y-auto border-t border-surface-border/40 px-6 py-4 text-[15px] md:min-h-0 md:w-1/2 md:border-t-0"
            v-html="previewHtml"
          />
        </div>
        <p v-if="isNew && !showMeta && previewMode === 'edit'" class="shrink-0 border-t border-surface-border/40 px-6 py-2 text-[11px] text-gray-600">
          点顶栏「预览」或「分屏」可查看图片；<span class="font-mono">Ctrl+V</span> 粘贴后会自动切到分屏。
        </p>      </div>

      <aside
        v-if="showMeta"
        class="w-80 shrink-0 overflow-y-auto border-l border-surface-border bg-surface-raised px-4 py-4 space-y-4"
      >
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500">文章属性</h3>

        <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-border px-3 py-2">
          <input v-model="form.private" type="checkbox" class="mt-0.5" />
          <span class="space-y-0.5">
            <span class="block text-xs text-gray-200">私有文章</span>
            <span class="block text-[11px] leading-snug text-gray-500">不出现在实时预览与线上站点，仅在管理端（5174）可编辑查看</span>
          </span>
        </label>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">日期</span>
          <input v-model="form.date" type="datetime-local" class="input text-xs" />
        </label>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">分类</span>
          <select v-model="form.category" class="input text-xs">
            <option v-for="c in selectCategories" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">标签（# 分隔）</span>
          <input v-model="form.tagsText" class="input text-xs" placeholder="生活#阅读#思考" />
        </label>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">封面 URL</span>
          <div class="flex gap-2">
            <input v-model="form.cover" class="input flex-1 text-xs" placeholder="../../assets/..." />
            <label class="btn-outline shrink-0 cursor-pointer text-xs">
              上传
              <input type="file" class="hidden" accept="image/*" @change="onUploadCover" />
            </label>
          </div>
          <img
            v-if="coverPreviewUrl"
            :src="coverPreviewUrl"
            alt="封面预览"
            class="mt-2 max-h-40 w-full rounded-lg border border-surface-border object-cover"
            loading="lazy"
          />
        </label>
      </aside>
    </div>

    <ImageGalleryModal :open="showGalleryModal" @close="showGalleryModal = false" @insert="onInsertGallery" />
    <ArticleLightbox
      :open="lightboxOpen"
      :images="lightboxImages"
      :index="lightboxIndex"
      @close="onLightboxClose"
      @step="onLightboxStep"
    />
  </div>
</template>
