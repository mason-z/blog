<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { mediaPreviewUrl } from '../media.js';
import { formatPostDateFeed } from '../postDate.js';

const props = defineProps({
  post: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'publish', 'delete', 'toggle-private']);

const menuOpen = ref(false);
const rootRef = ref(null);

const statusLabel = computed(() => (props.post.private ? '私有' : '公开'));

const cardClass = computed(() => (props.post.private ? 'post-feed-card--private' : ''));

const images = computed(() => props.post.preview_images || []);

function onDocClick(e) {
  if (!menuOpen.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) menuOpen.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

function pickAction(type) {
  menuOpen.value = false;
  emit(type);
}
</script>

<template>
  <article
    ref="rootRef"
    class="post-feed-card relative cursor-pointer rounded-lg border p-4 shadow-sm transition hover:shadow"
    :class="[cardClass, active ? 'ring-2 ring-emerald-400/50' : '']"
    @click="emit('select')"
  >
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 pr-8">
          <span class="text-sm font-semibold text-gray-800">{{ post.title || post.id }}</span>
          <span class="ml-auto shrink-0 text-[11px] font-medium text-gray-500">{{ statusLabel }}</span>
        </div>
        <time v-if="post.date" class="mt-1 block text-xs text-gray-400">{{ formatPostDateFeed(post.date) }}</time>
        <p v-if="post.summary" class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
          {{ post.summary }}
        </p>
        <div
          v-if="images.length"
          class="photo-grid photo-grid--5 photo-grid--preview photo-grid--size-m mt-3"
          @click.stop
        >
          <figure v-for="name in images" :key="name" class="photo-grid__cell">
            <img :src="mediaPreviewUrl(`../../assets/${name}`)" alt="" loading="lazy" decoding="async" />
          </figure>
        </div>
      </div>
    </div>

    <div class="absolute right-2 top-2">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/[0.06] hover:text-gray-800"
        title="文章设置"
        aria-label="文章设置"
        @click.stop="menuOpen = !menuOpen"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      <div
        v-if="menuOpen"
        class="absolute right-0 z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-lg border border-gray-200/90 bg-white py-1 text-sm shadow-lg"
        @click.stop
      >
        <button type="button" class="post-feed-menu-item" @click="pickAction('select')">编辑</button>
        <button
          v-if="post.is_draft"
          type="button"
          class="post-feed-menu-item text-emerald-700"
          @click="pickAction('publish')"
        >
          发布
        </button>
        <button type="button" class="post-feed-menu-item" @click="pickAction('toggle-private')">
          {{ post.private ? '设为公开' : '设为私有' }}
        </button>
        <button type="button" class="post-feed-menu-item text-red-600" @click="pickAction('delete')">
          移到垃圾桶
        </button>
      </div>
    </div>
  </article>
</template>
