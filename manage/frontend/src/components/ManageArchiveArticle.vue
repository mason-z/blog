<script setup>
import { computed } from 'vue';
import { formatPostDateSite } from '../postDate.js';
import { renderMarkdownPreview } from '../media.js';

const props = defineProps({
  post: { type: Object, required: true },
});

const emit = defineEmits(['select', 'publish', 'toggle-private', 'delete']);

const catName = computed(() => (props.post.categories?.length ? props.post.categories[0] : '随笔'));
const bodyHtml = computed(() => {
  if (props.post.body) return renderMarkdownPreview(props.post.body);
  if (props.post.summary) return `<p>${props.post.summary}</p>`;
  return '';
});
const visibility = computed(() => (props.post.private ? '私有' : '公开'));
</script>

<template>
  <article
    class="archive-full-item archive-panel manage-archive-item"
    :class="post.private ? 'manage-archive-item--private' : ''"
  >
    <div class="manage-archive-toolbar" @click.stop>
      <span class="manage-archive-vis" :class="post.private ? 'is-private' : 'is-public'">{{ visibility }}</span>
      <span v-if="post.from_phone" class="manage-archive-tag">手机同步</span>
      <div class="manage-archive-actions">
        <button type="button" class="manage-archive-btn" @click="emit('select')">编辑</button>
        <button v-if="post.is_draft" type="button" class="manage-archive-btn" @click="emit('publish')">发布</button>
        <button type="button" class="manage-archive-btn" @click="emit('toggle-private')">
          {{ post.private ? '改为公开' : '改为私有' }}
        </button>
        <button type="button" class="manage-archive-btn manage-archive-btn--danger" @click="emit('delete')">
          删除
        </button>
      </div>
    </div>
    <header class="archive-full-header" @click="emit('select')">
      <h2 class="archive-full-title">
        <span class="manage-archive-title-link">{{ post.title || post.id }}</span>
      </h2>
      <p class="archive-full-meta">
        <time>{{ formatPostDateSite(post.date) }}</time>
        <span class="dot">·</span>
        <span class="cat">{{ catName }}</span>
      </p>
    </header>
    <div
      class="article-body archive-full-body manage-archive-body"
      v-html="bodyHtml"
      @click="emit('select')"
    />
  </article>
</template>

<style scoped>
.manage-archive-item {
  position: relative;
  margin-bottom: 1rem;
}

.manage-archive-item--private {
  opacity: 0.92;
}

.manage-archive-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  margin-bottom: 0.65rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.manage-archive-vis {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.manage-archive-vis.is-public {
  background: rgba(52, 211, 153, 0.15);
  color: #6ee7b7;
}

.manage-archive-vis.is-private {
  background: rgba(167, 139, 250, 0.15);
  color: #c4b5fd;
}

.manage-archive-tag {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.45);
}

.manage-archive-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.manage-archive-btn {
  font-size: 0.65rem;
  padding: 0.2rem 0.45rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.manage-archive-btn:hover {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.06);
}

.manage-archive-btn--danger {
  color: #fca5a5;
}

.manage-archive-title-link {
  cursor: pointer;
}

.manage-archive-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.35rem;
}

.manage-archive-body :deep(.photo-grid) {
  margin: 0.5rem 0;
}
</style>
