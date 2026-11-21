<script setup>
import { computed } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
});

const emit = defineEmits(['close', 'step']);

const current = computed(() => props.images[props.index] || null);
const multi = computed(() => props.images.length > 1);
const counter = computed(() => (multi.value ? `${props.index + 1} / ${props.images.length}` : ''));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      class="article-lightbox article-lightbox--visible article-lightbox--manage"
      role="dialog"
      aria-modal="true"
    >
      <div class="article-lightbox__backdrop" @click="emit('close')" />
      <div class="article-lightbox__panel">
        <button type="button" class="article-lightbox__close" aria-label="关闭" @click="emit('close')">
          &times;
        </button>
        <button
          v-show="multi"
          type="button"
          class="article-lightbox__nav article-lightbox__nav--prev"
          aria-label="上一张"
          @click="emit('step', -1)"
        >
          &#10094;
        </button>
        <figure class="article-lightbox__figure">
          <img class="article-lightbox__img" :src="current.src" :alt="current.alt || ''" decoding="async" />
          <figcaption v-if="current.alt" class="article-lightbox__caption">{{ current.alt }}</figcaption>
        </figure>
        <button
          v-show="multi"
          type="button"
          class="article-lightbox__nav article-lightbox__nav--next"
          aria-label="下一张"
          @click="emit('step', 1)"
        >
          &#10095;
        </button>
        <p v-if="multi" class="article-lightbox__counter">{{ counter }}</p>
      </div>
    </div>
  </Teleport>
</template>
