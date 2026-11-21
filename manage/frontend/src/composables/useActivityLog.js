import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fetchActivityLog, clearActivityLogApi } from '../api';

const STORAGE_EXPANDED = 'meiso_activity_log_expanded';
const STORAGE_DETAILS = 'meiso_activity_log_details';

function isStatusEntry(e) {
  return e.kind !== 'detail';
}

export function useActivityLog() {
  const entries = ref([]);
  const afterId = ref(0);
  const polling = ref(false);
  const expanded = ref(localStorage.getItem(STORAGE_EXPANDED) === '1');
  const showDetails = ref(localStorage.getItem(STORAGE_DETAILS) === '1');
  const unseen = ref(0);
  const visibleEntries = computed(() =>
    showDetails.value ? entries.value : entries.value.filter(isStatusEntry),
  );
  const lastLine = computed(() => {
    const list = entries.value.filter(isStatusEntry);
    if (list.length) return list[list.length - 1].text;
    if (entries.value.length) return '后台运行中…（可勾选「技术详情」查看命令输出）';
    return '暂无任务，保存文章或点部署后会在这里显示进度';
  });
  const displayText = computed(() => visibleEntries.value.map((e) => e.text).join('\n'));
  let timer = null;
  const logEl = ref(null);

  async function pull() {
    try {
      const data = await fetchActivityLog(afterId.value);
      const batch = data.entries || [];
      if (batch.length) {
        entries.value.push(...batch);
        if (entries.value.length > 600) entries.value.splice(0, entries.value.length - 600);
        afterId.value = data.lastId ?? afterId.value;
        const statusNew = batch.filter(isStatusEntry).length;
        if (!expanded.value && statusNew) unseen.value += statusNew;
      }
    } catch {
      /* API 未就绪时静默 */
    }
  }

  function startPoll() {
    stopPoll();
    polling.value = true;
    const ms = expanded.value ? 1200 : 2500;
    void pull();
    timer = setInterval(() => void pull(), ms);
  }

  function stopPoll() {
    polling.value = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function toggleExpanded() {
    expanded.value = !expanded.value;
    localStorage.setItem(STORAGE_EXPANDED, expanded.value ? '1' : '0');
    if (expanded.value) {
      unseen.value = 0;
      nextTick(scrollToEnd);
    }
    startPoll();
  }

  function toggleDetails() {
    showDetails.value = !showDetails.value;
    localStorage.setItem(STORAGE_DETAILS, showDetails.value ? '1' : '0');
    nextTick(scrollToEnd);
  }

  function scrollToEnd() {
    const el = logEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function clearLog() {
    try {
      await clearActivityLogApi();
      entries.value = [];
      afterId.value = 0;
      unseen.value = 0;
      await pull();
    } catch (e) {
      console.warn(e);
    }
  }

  watch(expanded, (v) => {
    if (v) nextTick(scrollToEnd);
  });

  watch(showDetails, () => nextTick(scrollToEnd));

  watch(
    () => visibleEntries.value.length,
    () => {
      if (expanded.value) nextTick(scrollToEnd);
    },
  );

  onMounted(startPoll);
  onUnmounted(stopPoll);

  return {
    entries,
    expanded,
    showDetails,
    unseen,
    lastLine,
    displayText,
    logEl,
    toggleExpanded,
    toggleDetails,
    clearLog,
    refresh: pull,
  };
}
