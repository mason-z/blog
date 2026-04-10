'use strict';

/**
 * 时间轴页共用：排序、日期展示、上传路径解析（与 Decap media_folder 一致）。
 */

function sortTimelineEntries(raw) {
  if (!raw || !raw.slice) return [];
  return raw.slice().sort(function (a, b) {
    var pa = a.pinned === true ? 1 : 0;
    var pb = b.pinned === true ? 1 : 0;
    if (pa !== pb) return pb - pa;
    var da = new Date(a.date != null ? a.date : 0).getTime();
    var db = new Date(b.date != null ? b.date : 0).getTime();
    return db - da;
  });
}

function fmtTimelineDate(d) {
  if (d == null || d === '') return '—';
  var dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  var y = dt.getFullYear();
  var m = dt.getMonth() + 1;
  var day = dt.getDate();
  var hh = dt.getHours();
  var mm = dt.getMinutes();
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }
  return y + ' 年 ' + m + ' 月 ' + day + ' 日 ' + pad(hh) + ':' + pad(mm);
}

/** 字符串路径，或带 .photo 字段的对象（宠物时间轴行） */
function resolveUploadUrl(input) {
  var f = '';
  if (input != null && typeof input === 'object' && !Array.isArray(input)) {
    f = input.photo != null ? String(input.photo).trim() : '';
  } else {
    f = input != null ? String(input).trim() : '';
  }
  if (!f) return '';
  if (/^https?:\/\//i.test(f)) return f;
  var p = f.replace(/^source\//, '');
  if (!p.startsWith('/')) p = '/' + p.replace(/^\/+/, '');
  return p;
}

hexo.extend.helper.register('timeline_sort_entries', function (raw) {
  return sortTimelineEntries(raw);
});

hexo.extend.helper.register('fmt_timeline_date', function (d) {
  return fmtTimelineDate(d);
});

hexo.extend.helper.register('resolve_upload_url', function (input) {
  return resolveUploadUrl(input);
});
