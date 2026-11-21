<script setup>
import { computed } from 'vue';
import ManageArchiveArticle from './ManageArchiveArticle.vue';

const props = defineProps({
  posts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyHint: { type: String, default: '暂无文章' },
});

const emit = defineEmits(['select', 'publish', 'toggle-private', 'delete']);

function monthKey(dateStr) {
  const s = String(dateStr || '');
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}.${m[2]}`;
  return '未注明日期';
}

const byMonth = computed(() => {
  const map = new Map();
  for (const p of props.posts) {
    const ym = monthKey(p.date);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym).push(p);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
});
</script>

<template>
  <div class="manage-site-mirror" data-theme="dark">
    <section class="archive-shell archive-shell--full manage-site-archive">
      <p v-if="loading" class="manage-site-placeholder">加载中…</p>
      <p v-else-if="!posts.length" class="manage-site-placeholder">{{ emptyHint }}</p>
      <div v-else class="archive-layout manage-archive-layout">
        <aside class="archive-toc archive-panel archive-toc--float manage-archive-toc" aria-label="月份导航">
          <div class="archive-toc__nav">
            <h2 class="archive-toc__title">目录</h2>
            <div v-for="[ym, items] in byMonth" :key="ym" class="archive-toc__block">
              <h3 class="archive-toc__month">{{ ym }}</h3>
              <ul class="archive-toc__list">
                <li v-for="p in items" :key="p.id" class="archive-toc__item">
                  <button type="button" class="archive-toc__link manage-toc-link" @click="emit('select', p)">
                    {{ p.title || p.id }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </aside>
        <div class="archive-full-list">
          <template v-for="[ym, items] in byMonth" :key="`list-${ym}`">
            <ManageArchiveArticle
              v-for="p in items"
              :id="`manage-${p.id}`"
              :key="p.id"
              :post="p"
              @select="emit('select', p)"
              @publish="emit('publish', p)"
              @toggle-private="emit('toggle-private', p)"
              @delete="emit('delete', p)"
            />
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.manage-site-mirror {
  min-height: 100%;
  color-scheme: dark;
}

.manage-site-archive {
  padding: 1.25rem 1.5rem 2rem;
  min-height: 100%;
}

.manage-archive-layout {
  max-width: 56rem;
  margin: 0 auto;
}

.manage-archive-toc {
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
}

.manage-toc-link {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  padding: 0;
}

.manage-site-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .manage-archive-toc {
    display: none;
  }
}
</style>
