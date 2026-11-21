/** 与 manage/server/post-date.mjs 规则一致（仅前端展示 / datetime-local） */

const LOCAL_SPACE_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function parsePostDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const m = s.match(LOCAL_SPACE_RE);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  const noTz = !/[Zz]|[+-]\d{2}:?\d{2}$/.test(s);
  if (noTz && s.includes('T')) {
    const d = new Date(s.length === 16 ? `${s}:00` : s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** datetime-local 用：YYYY-MM-DDTHH:mm */
export function toDatetimeLocalInput(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return new Date().toISOString().slice(0, 16);
  const m = s.match(LOCAL_PREFIX_RE);
  if (m) return `${m[1]}T${m[2]}`;
  const d = parsePostDate(s);
  if (d) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return new Date().toISOString().slice(0, 16);
}

/** 管理端卡片：M月D日 HH:mm */
/** 与线上一致：YYYY-MM-DD HH:mm */
export function formatPostDateSite(raw) {
  const d = parsePostDate(raw);
  if (!d) return String(raw || '').slice(0, 16);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatPostDateFeed(raw) {
  const d = parsePostDate(raw);
  if (!d) {
    const s = String(raw || '').slice(0, 10);
    return s || '';
  }
  return `${pad2(d.getMonth() + 1)}月${pad2(d.getDate())}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
