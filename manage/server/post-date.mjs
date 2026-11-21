/**
 * Hexo 文章 date 统一为本地墙钟：YYYY-MM-DD HH:mm:ss（与手机 QuickNote 一致）
 */

const LOCAL_SPACE_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_T_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatPostDateLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** @param {Date|string|number} raw */
export function parsePostDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const s = String(raw ?? '').trim();
  if (!s) return null;

  let m = s.match(LOCAL_SPACE_RE);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }

  const noTz = !/[Zz]|[+-]\d{2}:?\d{2}$/.test(s);
  if (noTz) {
    m = s.match(LOCAL_T_RE);
    if (m) {
      return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    }
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {Date|string|number} [raw] */
export function normalizePostDate(raw) {
  const d = parsePostDate(raw) || new Date();
  return formatPostDateLocal(d);
}
