<script setup>
import { ref, watch } from 'vue';
import { uploadFile } from '../api';
import { toDatetimeLocalInput } from '../postDate.js';

const props = defineProps({
  post: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  categoryPresets: { type: Array, default: () => ['随笔'] },
  defaultCategory: { type: String, default: '随笔' },
});

const emit = defineEmits(['save', 'delete']);

const form = ref(emptyForm());

function emptyForm() {
  return {
    title: '',
    date: new Date().toISOString().slice(0, 16),
    updated: '',
    categoriesText: props.defaultCategory || '随笔',
    tagsText: '',
    sticky: 0,
    cover: '',
    body: '',
  };
}

function fromPost(post) {
  if (!post) {
    form.value = emptyForm();
    return;
  }
  const d = post.data || {};
  form.value = {
    title: d.title || '',
    date: toDatetimeLocalInput(d.date),
    updated: d.updated ? toDatetimeLocalInput(d.updated) : '',
    categoriesText: (d.categories || []).join(', '),
    tagsText: (d.tags || []).join(', '),
    sticky: Number(d.sticky) || 0,
    cover: d.cover || '',
    body: post.body || '',
  };
}

function toPayload() {
  const cats = form.value.categoriesText
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = form.value.tagsText
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: form.value.title,
    date: form.value.date,
    updated: form.value.updated || undefined,
    categories: cats.length ? cats : [props.defaultCategory || '随笔'],
    tags,
    sticky: Number(form.value.sticky) || 0,
    cover: form.value.cover || undefined,
    body: form.value.body,
  };
}

watch(
  () => props.post,
  (p) => fromPost(p),
  { immediate: true }
);

function onSave() {
  emit('save', toPayload());
}

function onDelete() {
  if (!props.post?.id) return;
  if (confirm(`确定删除「${props.post.data?.title || props.post.id}」？`)) {
    emit('delete');
  }
}

async function onUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const res = await uploadFile(file);
    form.value.cover = res.url;
  } catch (err) {
    alert(err.message || '上传失败');
  }
  e.target.value = '';
}

function pickCategory(name) {
  form.value.categoriesText = name;
}
</script>

<template>
  <div class="flex h-full flex-col animate-slide-up">
    <div class="border-b border-surface-border px-5 py-4">
      <h2 class="text-sm font-semibold text-white">
        {{ post?.id ? '编辑文章' : '新建文章' }}
      </h2>
      <p v-if="post?.filename" class="mt-1 font-mono text-[10px] text-gray-600">{{ post.filename }}</p>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-gray-500">加载中…</div>

    <div v-else class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
      <label class="block space-y-1">
        <span class="text-xs text-gray-500">标题</span>
        <input v-model="form.title" class="input" />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1">
          <span class="text-xs text-gray-500">发布日期</span>
          <input v-model="form.date" type="datetime-local" class="input" />
        </label>
        <label class="block space-y-1">
          <span class="text-xs text-gray-500">置顶权重</span>
          <input v-model.number="form.sticky" type="number" min="0" class="input" />
        </label>
      </div>

      <label class="block space-y-1">
        <span class="text-xs text-gray-500">分类（逗号分隔）</span>
        <input v-model="form.categoriesText" class="input" />
        <div v-if="categoryPresets.length" class="flex flex-wrap gap-1 pt-1">
          <button
            v-for="c in categoryPresets"
            :key="c"
            type="button"
            class="chip-inactive"
            @click="pickCategory(c)"
          >
            {{ c }}
          </button>
        </div>
      </label>

      <label class="block space-y-1">
        <span class="text-xs text-gray-500">标签（逗号分隔）</span>
        <input v-model="form.tagsText" class="input" />
      </label>

      <label class="block space-y-1">
        <span class="text-xs text-gray-500">封面 URL</span>
        <div class="flex gap-2">
          <input v-model="form.cover" class="input flex-1" placeholder="../../assets/..." />
          <label class="btn-outline shrink-0 cursor-pointer">
            上传
            <input type="file" class="hidden" accept="image/*" @change="onUpload" />
          </label>
        </div>
      </label>

      <label class="block space-y-1">
        <span class="text-xs text-gray-500">正文 Markdown</span>
        <textarea v-model="form.body" class="textarea min-h-[280px]" />
      </label>
    </div>

    <div class="flex gap-2 border-t border-surface-border px-5 py-4">
      <button class="btn-primary flex-1" @click="onSave">保存</button>
      <button v-if="post?.id" class="btn-outline text-red-300" @click="onDelete">删除</button>
    </div>
  </div>
</template>
