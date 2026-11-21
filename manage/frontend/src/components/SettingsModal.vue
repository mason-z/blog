<script setup>
import { ref, onMounted } from 'vue';
import {
  fetchConfig,
  saveConfig,
  openBlogRoot,
  openLivePreview,
  openDecapAdmin,
  getStoredApiKey,
  setStoredApiKey,
} from '../api';

const emit = defineEmits(['close', 'saved']);

defineProps({
  version: { type: String, default: '1.0.0' },
});

const blogRootInput = ref('');
const resolvedRoot = ref('');
const title = ref('');
const previewUrl = ref('');
const decapAdminUrl = ref('');
const serverPort = ref(8770);
const paths = ref(null);
const busy = ref(false);
const error = ref('');
const hint = ref('');
const apiKey = ref('');

async function load() {
  error.value = '';
  try {
    const cfg = await fetchConfig();
    blogRootInput.value = cfg.blog_root_input || '..';
    resolvedRoot.value = cfg.blog_root || '';
    title.value = cfg.title || 'meiso 管理';
    previewUrl.value = cfg.preview_url || 'http://127.0.0.1:4010';
    decapAdminUrl.value = cfg.decap_admin_url || 'http://127.0.0.1:4010/admin/';
    serverPort.value = cfg.server_port || 8770;
    paths.value = cfg.paths || null;
  } catch (e) {
    error.value = e.message || '加载配置失败';
  }
}

onMounted(() => {
  apiKey.value = getStoredApiKey();
  load();
});

function saveApiKey() {
  setStoredApiKey(apiKey.value);
  hint.value = 'API 密钥已保存到本浏览器（与 manage/config.json 中 server.apiToken 一致）';
}

async function save() {
  busy.value = true;
  error.value = '';
  hint.value = '';
  try {
    const cfg = await saveConfig({
      blog_root_input: blogRootInput.value.trim(),
      title: title.value.trim(),
      preview_url: previewUrl.value.trim(),
      decap_admin_url: decapAdminUrl.value.trim(),
    });
    resolvedRoot.value = cfg.blog_root || '';
    paths.value = cfg.paths || null;
    hint.value = '设置已保存';
    emit('saved', cfg);
  } catch (e) {
    error.value = e.message || '保存失败';
  } finally {
    busy.value = false;
  }
}

async function openFolder() {
  busy.value = true;
  error.value = '';
  try {
    await openBlogRoot();
  } catch (e) {
    error.value = e.message || '打开文件夹失败';
  } finally {
    busy.value = false;
  }
}

async function openSitePreview() {
  busy.value = true;
  error.value = '';
  try {
    await openLivePreview();
  } catch (e) {
    error.value = e.message || '打开预览失败';
  } finally {
    busy.value = false;
  }
}

async function openDecap() {
  busy.value = true;
  error.value = '';
  try {
    await openDecapAdmin();
  } catch (e) {
    error.value = e.message || '打开 Decap 后台失败';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-2xl rounded-2xl border border-surface-border bg-surface-raised shadow-card">
      <header class="flex items-center justify-between border-b border-surface-border px-6 py-4">
        <h2 class="text-base font-semibold text-white">设置</h2>
        <button class="btn-ghost h-8 w-8 p-0" @click="$emit('close')">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">管理界面标题</label>
          <input v-model="title" class="input text-sm" placeholder="meiso 管理" />
        </section>

        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">博客仓库路径</label>
          <p class="text-[11px] leading-relaxed text-gray-500">
            相对 manage/ 目录（如 <span class="font-mono">..</span>）或绝对路径。保存后立即生效。
          </p>
          <textarea
            v-model="blogRootInput"
            class="input min-h-[72px] resize-y font-mono text-xs leading-relaxed"
            placeholder="例如 .. 或 E:\desktop\pycode\mcblog_git\mcblog_git_public"
          />
          <p v-if="resolvedRoot" class="truncate font-mono text-[10px] text-gray-600" :title="resolvedRoot">
            当前解析：{{ resolvedRoot }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn-primary text-xs" :disabled="busy" @click="save">保存</button>
            <button type="button" class="btn-ghost text-xs" :disabled="busy" @click="openFolder">打开博客文件夹</button>
          </div>
        </section>

        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">API 密钥（手机 App / 写入接口）</label>
          <p class="text-[11px] leading-relaxed text-gray-500">
            与 <span class="font-mono">manage/config.json</span> → <span class="font-mono">server.apiToken</span> 相同；首次启动 manage 会自动生成。
          </p>
          <input v-model="apiKey" class="input font-mono text-xs" placeholder="粘贴 apiToken" autocomplete="off" />
          <button type="button" class="btn-outline text-xs" @click="saveApiKey">保存密钥到本机浏览器</button>
        </section>

        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">本地预览地址</label>
          <input v-model="previewUrl" class="input font-mono text-xs" placeholder="http://127.0.0.1:4010" />
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="openSitePreview">打开站点预览</button>
        </section>

        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">图片（方案 3）</label>
          <p class="text-[11px] leading-relaxed text-gray-500">
            原图写入 <span class="font-mono">assets/</span>（不进 Git），Markdown 插入
            <span class="font-mono">../../assets/文件名</span>，Obsidian 可直接预览。构建时压缩到
            <span class="font-mono">public/images/web/</span>，部署命令
            <span class="font-mono">npm run deploy</span>。
          </p>
        </section>

        <section class="space-y-2">
          <label class="text-xs font-medium text-gray-300">Decap CMS 后台</label>
          <input v-model="decapAdminUrl" class="input font-mono text-xs" placeholder="http://127.0.0.1:4010/admin/" />
          <p class="text-[11px] text-gray-500">需先运行 <span class="font-mono">npm run dev:admin</span></p>
          <button type="button" class="btn-outline text-xs" :disabled="busy" @click="openDecap">打开 Decap 后台</button>
        </section>

        <section
          v-if="paths"
          class="rounded-xl border border-surface-border bg-surface p-3 text-[11px] text-gray-500 space-y-1"
        >
          <p><span class="text-gray-400">文章：</span><span class="font-mono">{{ paths.posts }}</span></p>
          <p><span class="text-gray-400">站点配置：</span><span class="font-mono">{{ paths.site_cms }}</span></p>
          <p><span class="text-gray-400">原图 assets：</span><span class="font-mono">{{ paths.assets }}</span></p>
          <p><span class="text-gray-400">网页图 web：</span><span class="font-mono">{{ paths.web_images }}</span></p>
          <p class="pt-1 text-gray-600">API 端口 {{ serverPort }}（修改需编辑 manage/config.json 并重启）</p>
        </section>

        <p v-if="hint" class="text-[11px] text-accent/90">{{ hint }}</p>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      </div>

      <footer class="flex items-center justify-between border-t border-surface-border px-6 py-4">
        <span class="text-[10px] text-gray-600">meiso 管理 v{{ version }}</span>
        <button type="button" class="btn-ghost" @click="$emit('close')">关闭</button>
      </footer>
    </div>
  </div>
</template>
