<script setup>
import { useActivityLog } from '../composables/useActivityLog';

const {
  expanded,
  showDetails,
  unseen,
  lastLine,
  displayText,
  logEl,
  toggleExpanded,
  toggleDetails,
  clearLog,
} = useActivityLog();
</script>

<template>
  <div
    class="shrink-0 border-t border-surface-border bg-[#0d0d0f]"
    :class="expanded ? 'shadow-[0_-4px_24px_rgba(0,0,0,0.35)]' : ''"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition hover:bg-white/[0.03]"
      @click="toggleExpanded"
    >
      <span class="shrink-0 font-semibold text-gray-500">运行日志</span>
      <span v-if="unseen && !expanded" class="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
        +{{ unseen }}
      </span>
      <span class="min-w-0 flex-1 truncate text-[11px] text-gray-300">{{ lastLine }}</span>
      <span class="shrink-0 text-gray-600">{{ expanded ? '收起 ▾' : '展开 ▸' }}</span>
    </button>

    <div v-show="expanded" class="border-t border-surface-border/60">
      <div class="flex items-center justify-between gap-2 border-b border-surface-border/40 px-3 py-1">
        <label class="flex cursor-pointer items-center gap-1.5 text-[10px] text-gray-500">
          <input
            type="checkbox"
            class="rounded border-gray-600 bg-transparent"
            :checked="showDetails"
            @click.prevent="toggleDetails"
          />
          技术详情（npm / hexo 逐行输出）
        </label>
        <button type="button" class="text-[10px] text-gray-500 hover:text-gray-300" @click.stop="clearLog">
          清空
        </button>
      </div>
      <pre
        ref="logEl"
        class="max-h-44 overflow-y-auto whitespace-pre-wrap break-all px-4 py-2 text-[11px] leading-relaxed"
        :class="showDetails ? 'font-mono text-gray-500' : 'text-gray-300'"
      >{{ displayText || '保存文章、生成预览、构建或部署时，进度会显示在这里' }}</pre>
    </div>
  </div>
</template>
