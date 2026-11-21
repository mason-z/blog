import { ref, computed, watch, onUnmounted } from 'vue';
import {
  fetchPublishStatus,
  publishScan,
  publishSync,
  publishDeployFull,
  publishBuildProd,
  publishBuildLocal,
  publishOpenSite,
  publishOpenSyncFolder,
} from '../api';

/**
 * @param {{ pollWhen?: import('vue').Ref<boolean> | boolean, pollMs?: number, afterAction?: (result: unknown) => void | Promise<void> }} options
 */
export function usePublishHub(options = {}) {
  const busy = ref(false);
  const loading = ref(false);
  const status = ref(null);
  const log = ref('');
  const error = ref('');
  let pollTimer = null;

  const pending = computed(() => status.value?.phone_scan?.pendingTotal ?? 0);
  const syncRoot = computed(
    () =>
      status.value?.sync_root ||
      status.value?.phone_scan?.syncRoot ||
      status.value?.sync_config?.syncRoot ||
      '',
  );
  const siteUrl = computed(() => status.value?.site_url || '');
  const cloudflare = computed(() => status.value?.cloudflare || null);

  async function refresh(full = false) {
    if (full) loading.value = true;
    error.value = '';
    try {
      status.value = await fetchPublishStatus(!full);
    } catch (e) {
      if (!full) return;
      const raw = e.message || '加载失败';
      const msg =
        raw === 'Failed to fetch' || raw.includes('fetch')
          ? '无法连接管理 API（8770）。请运行「博客控制台.bat」；异常见 .manage-console.log'
          : raw;
      error.value = msg.includes('X-Api-Key')
        ? `${msg} — 本机请用 http://127.0.0.1:5174 打开`
        : msg;
    } finally {
      loading.value = false;
    }
  }

  function startPolling() {
    stopPolling();
    void refresh(true);
    const ms = options.pollMs ?? 15000;
    pollTimer = setInterval(() => refresh(false), ms);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  const pollWhen = options.pollWhen;
  if (pollWhen != null) {
    watch(
      () => (typeof pollWhen === 'object' && 'value' in pollWhen ? pollWhen.value : pollWhen),
      (on) => {
        if (on) startPolling();
        else stopPolling();
      },
      { immediate: true },
    );
    onUnmounted(stopPolling);
  }

  function appendLog(title, result) {
    const chunk = `\n=== ${title} ===\n${result?.log || JSON.stringify(result, null, 2)}`;
    log.value = (log.value + chunk).slice(-24000);
  }

  async function run(action, title) {
    busy.value = true;
    error.value = '';
    try {
      const result = await action();
      if (result?.steps) {
        for (const s of result.steps) {
          appendLog(s.step || title, s);
        }
      } else {
        appendLog(title, result);
      }
      if (result?.detail && result.ok === false) error.value = result.detail;
      else if (result?.ok === false) error.value = `${title} 未成功，请查看日志`;
      await refresh(true);
      if (options.afterAction) await options.afterAction(result);
      return result;
    } catch (e) {
      error.value = e.message || `${title} 失败`;
      throw e;
    } finally {
      busy.value = false;
    }
  }

  return {
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
    startPolling,
    stopPolling,
    handleScan: () => run(publishScan, '扫描手机通道'),
    handleSync: () => run(publishSync, '同步到博客'),
    handleBuildProd: () => run(publishBuildProd, '线上构建 build:prod'),
    handleBuildLocal: () => run(publishBuildLocal, '本地构建 build'),
    handleDeployFull: () => run(publishDeployFull, '一键：扫描 + 同步 + 上线'),
    openSyncFolder: publishOpenSyncFolder,
    openSite: publishOpenSite,
  };
}
