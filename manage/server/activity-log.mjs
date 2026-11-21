const MAX_ENTRIES = 800;
/** @type {{ id: number, at: string, text: string, kind: 'status'|'detail' }[]} */
const entries = [];
let nextId = 1;

function pushEntry(text, kind) {
  const line = String(text ?? '').trimEnd();
  if (!line) return;
  entries.push({
    id: nextId++,
    at: new Date().toISOString(),
    text: line,
    kind: kind === 'detail' ? 'detail' : 'status',
  });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
}

/** 给人看的状态说明（默认展示） */
export function activityLogStatus(text) {
  pushEntry(text, 'status');
}

/** 命令行逐行输出等技术细节（需在前端勾选「技术详情」） */
export function activityLogDetail(text) {
  pushEntry(text, 'detail');
}

/** @deprecated 请用 activityLogStatus / activityLogDetail */
export function activityLog(text) {
  activityLogStatus(text);
}

export function activityLogBanner(title) {
  activityLogStatus(`—— ${title} ${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ——`);
}

export function getActivityLog(afterId = 0) {
  const n = Number(afterId) || 0;
  const slice = entries.filter((e) => e.id > n);
  return {
    entries: slice,
    lastId: entries.length ? entries[entries.length - 1].id : n,
    total: entries.length,
  };
}

export function clearActivityLog() {
  entries.length = 0;
  nextId = 1;
  activityLogStatus('日志已清空');
}
