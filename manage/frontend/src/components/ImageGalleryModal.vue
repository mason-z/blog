<script setup>
import { ref, computed, watch } from 'vue';
import { uploadFile } from '../api';
import { buildPhotoGridHtml, GALLERY_PRESETS, GALLERY_SIZES } from '../gallery';
import { mediaPreviewUrl } from '../media';

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'insert']);

const presetId = ref('5');
const sizeId = ref('m');
const customCols = ref(3);
const customCount = ref(4);
const uploaded = ref([]);
const uploading = ref(false);
const error = ref('');

const preset = computed(() => GALLERY_PRESETS.find((p) => p.id === presetId.value) || GALLERY_PRESETS[0]);

const targetCols = computed(() => (presetId.value === 'custom' ? customCols.value : preset.value.cols));

const targetCount = computed(() => {
  if (presetId.value === 'custom') return Math.max(1, Math.min(24, Number(customCount.value) || 1));
  return preset.value.count;
});

const previewUrls = computed(() => {
  const urls = uploaded.value.map((u) => u.url);
  while (urls.length < targetCount.value) urls.push('');
  return urls.slice(0, targetCount.value);
});

const canInsert = computed(() => uploaded.value.length > 0 && !uploading.value);

watch(
  () => props.open,
  (v) => {
    if (v) reset();
  }
);

function reset() {
  presetId.value = '5';
  sizeId.value = 'm';
  customCols.value = 3;
  customCount.value = 4;
  uploaded.value = [];
  uploading.value = false;
  error.value = '';
}

function onPickFiles(e) {
  const picked = [...(e.target.files || [])];
  e.target.value = '';
  if (!picked.length) return;
  void uploadFiles(picked);
}

async function uploadFiles(picked) {
  error.value = '';
  uploading.value = true;
  try {
    for (const file of picked) {
      if (!String(file.type || '').startsWith('image/')) continue;
      let toUpload = file;
      if (!file.name || file.name === 'image.png') {
        const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        toUpload = new File([file], `gallery-${Date.now()}-${uploaded.value.length}.${ext}`, {
          type: file.type,
        });
      }
      const res = await uploadFile(toUpload);
      uploaded.value.push({ url: res.url, name: toUpload.name });
      if (uploaded.value.length >= targetCount.value) break;
    }
  } catch (err) {
    error.value = err.message || '上传失败';
  } finally {
    uploading.value = false;
  }
}

function removeAt(i) {
  uploaded.value.splice(i, 1);
}

function thumbSrc(url) {
  return url ? mediaPreviewUrl(url) : '';
}

function onInsert() {
  const urls = previewUrls.value;
  if (!urls.some(Boolean)) return;
  emit('insert', buildPhotoGridHtml(urls, targetCols.value, sizeId.value));
  emit('close');
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-surface-border bg-surface-raised shadow-card"
    >
      <header class="flex items-center justify-between border-b border-surface-border px-5 py-3">
        <h2 class="text-sm font-semibold text-white">插入缩略图网格</h2>
        <button type="button" class="btn-ghost h-8 w-8 p-0" @click="emit('close')">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in GALLERY_PRESETS"
            :key="p.id"
            type="button"
            class="chip"
            :class="presetId === p.id ? 'chip-active' : 'chip-inactive'"
            @click="presetId = p.id"
          >
            {{ p.label }}
          </button>
        </div>

        <div v-if="presetId === 'custom'" class="flex flex-wrap gap-3">
          <label class="flex items-center gap-2 text-xs text-gray-400">
            列数
            <input v-model.number="customCols" type="number" min="1" max="6" class="input w-16 py-1 text-xs" />
          </label>
          <label class="flex items-center gap-2 text-xs text-gray-400">
            张数
            <input v-model.number="customCount" type="number" min="1" max="24" class="input w-16 py-1 text-xs" />
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] text-gray-500">缩略图大小</span>
          <button
            v-for="s in GALLERY_SIZES"
            :key="s.id"
            type="button"
            class="chip"
            :class="sizeId === s.id ? 'chip-active' : 'chip-inactive'"
            @click="sizeId = s.id"
          >
            {{ s.label }}
          </button>
        </div>

        <p class="text-[11px] text-gray-500">
          目标 {{ targetCount }} 张 · {{ targetCols }} 列 · 统一裁切为方形缩略图。已传 {{ uploaded.length }} 张，未上传的格子会留空。
        </p>

        <div
          class="photo-grid photo-grid--preview"
          :class="[
            `photo-grid--${Math.min(6, Math.max(1, targetCols))}`,
            `photo-grid--size-${sizeId}`,
          ]"
        >
          <figure
            v-for="(url, i) in previewUrls"
            :key="i"
            class="photo-grid__cell relative"
            :class="url ? '' : 'photo-grid__cell--empty'"
          >
            <img v-if="url" :src="thumbSrc(url)" alt="" loading="lazy" />
            <span v-else class="text-[10px] text-gray-600">{{ i + 1 }}</span>
            <button
              v-if="uploaded[i]"
              type="button"
              class="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-900/80"
              @click="removeAt(i)"
            >
              删
            </button>
          </figure>
        </div>

        <label
          class="btn-outline flex cursor-pointer justify-center text-xs"
          :class="uploading ? 'pointer-events-none opacity-50' : ''"
        >
          {{ uploading ? '上传中…' : '选择图片（可多选）' }}
          <input type="file" class="hidden" accept="image/*" multiple @change="onPickFiles" />
        </label>

        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-surface-border px-5 py-3">
        <button type="button" class="btn-ghost text-xs" @click="emit('close')">取消</button>
        <button type="button" class="btn-primary text-xs" :disabled="!canInsert" @click="onInsert">
          插入图集
        </button>
      </footer>
    </div>
  </div>
</template>
