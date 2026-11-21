<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { mediaPreviewUrl } from '../media.js';

defineProps({
  post: { type: Object, required: true },
});

const emit = defineEmits(['restore', 'purge', 'select']);

const menuOpen = ref(false);
const rootRef = ref(null);

function onDocClick(e) {
  if (!menuOpen.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) menuOpen.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <article ref="rootRef" class="post-feed-card post-feed-card--trash relative rounded-lg border p-4 shadow-sm">
    <div class="pr-8">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-800">{{ post.title }}</span>
        <span class="ml-auto text-[11px] text-gray-500">垃圾桶</span>
      </div>
      <p v-if="post.trashed_at" class="mt-1 text-xs text-gray-400">删除于 {{ String(post.trashed_at).slice(0, 10) }}</p>
      <p v-if="post.summary" class="mt-2 line-clamp-3 text-sm text-gray-600">{{ post.summary }}</p>
      <div
        v-if="post.preview_images?.length"
        class="photo-grid photo-grid--5 photo-grid--preview photo-grid--size-m mt-3"
      >
        <figure v-for="name in post.preview_images" :key="name" class="photo-grid__cell opacity-80">
          <img :src="mediaPreviewUrl(`../../assets/${name}`)" alt="" loading="lazy" />
        </figure>
      </div>
    </div>
    <div class="absolute right-2 top-2">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-black/[0.06]"
        aria-label="设置"
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
        class="absolute right-0 z-30 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
        @click.stop
      >
        <button type="button" class="post-feed-menu-item text-emerald-700" @click="menuOpen = false; $emit('restore')">
          恢复
        </button>
        <button type="button" class="post-feed-menu-item text-red-600" @click="menuOpen = false; $emit('purge')">
          彻底删除
        </button>
      </div>
    </div>
  </article>
</template>
