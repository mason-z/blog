<script setup>
import { inject } from 'vue';

defineProps({
  active: { type: Boolean, default: true },
});

const hub = inject('publishHub');
if (!hub) throw new Error('publishHub 未注入');

const {
  busy,
  loading,
  status,
  log,
  error,
  pending,
  syncRoot,
  siteUrl,
  cloudflare,
  refresh,
  openSyncFolder,
  openSite,
  handleDeployFull,
  handleSync,
  handleScan,
  handleBuildLocal,
  handleBuildProd,
} = hub;

const scan = () => status.value?.phone_scan;
const lastScan = () => status.value?.scanned_at;
const cf = () => cloudflare.value;
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="border-b border-surface-border px-6 py-5">
      <h2 class="text-lg font-semibold text-white">发布中心</h2>
      <p class="mt-1 text-xs leading-relaxed text-gray-500">
        同步手机、构建站点、部署上线；日志在下方。
      </p>
    </div>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <section class="rounded-xl border border-surface-border bg-surface p-4">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">常用操作</h3>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" class="btn-primary text-xs" :disabled="busy" @click="handleDeployFull()">
            {{ busy ? '执行中…' : '一键部署上线' }}
          </button>
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="handleSync()">同步通道 → 博客</button>
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="handleScan()">扫描手机通道</button>
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="handleBuildProd()">线上构建</button>
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="handleBuildLocal()">本地构建</button>
        </div>
      </section>
      <p v-if="loading && !status" class="text-sm text-gray-500">正在扫描手机通道…</p>
      <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{{ error }}</p>

      <section v-if="status" class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-surface-border bg-surface p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500">手机通道</h3>
            <span v-if="lastScan()" class="text-[10px] text-gray-600">扫描 {{ new Date(lastScan()).toLocaleTimeString() }}</span>
          </div>
          <p class="font-mono text-xs text-gray-300 break-all">{{ syncRoot || '—' }}</p>
          <p class="text-sm text-gray-400">
            待同步文件：<span class="text-accent font-medium">{{ pending }}</span>
            <span v-if="scan() && !scan().exists" class="text-red-400">（目录不存在）</span>
          </p>
          <ul v-if="scan()?.folders" class="text-xs text-gray-500 space-y-1">
            <li v-for="(v, k) in scan().folders" :key="k">
              <span class="text-gray-400">{{ k }}</span> → {{ v.dest }}：待
              <span class="text-amber-400/90">{{ v.pendingCount }}</span>
            </li>
          </ul>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" class="btn-outline text-xs" :disabled="busy" @click="refresh(true)">立即扫描</button>
            <button type="button" class="btn-outline text-xs" :disabled="busy" @click="openSyncFolder()">打开文件夹</button>
          </div>
        </div>

        <div class="rounded-xl border border-surface-border bg-surface p-4 space-y-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500">线上站点</h3>
          <p class="font-mono text-xs text-accent break-all">{{ siteUrl }}</p>
          <p v-if="cf()?.loggedIn !== null" class="text-sm" :class="cf()?.loggedIn ? 'text-green-400' : 'text-amber-400'">
            Cloudflare：
            <template v-if="cf()?.loggedIn">已登录 {{ cf()?.email }}</template>
            <template v-else>未登录（需 npx wrangler login）</template>
          </p>
          <button type="button" class="btn-outline text-xs" @click="openSite()">浏览器打开站点</button>
        </div>
      </section>

      <section v-if="log" class="rounded-xl border border-surface-border bg-black/40 p-3">
        <h3 class="mb-2 text-xs font-semibold text-gray-500">运行日志</h3>
        <pre class="max-h-[50vh] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-gray-400">{{ log }}</pre>
      </section>
      <p v-else class="text-center text-xs text-gray-600">执行上方操作后，日志会显示在这里</p>
    </div>
  </div>
</template>
