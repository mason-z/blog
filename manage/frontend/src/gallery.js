/** 生成博客正文用的缩略图网格 HTML（Hexo Markdown 内嵌 HTML） */
export const GALLERY_SIZES = [
  { id: 's', label: '小', max: 88 },
  { id: 'm', label: '中', max: 120 },
  { id: 'l', label: '大', max: 160 },
];

export function buildPhotoGridHtml(urls, cols = 5, size = 'm') {
  const slots = Array.isArray(urls) ? urls.map((u) => String(u || '').trim()) : [];
  if (!slots.length || !slots.some(Boolean)) return '';
  const c = Math.max(1, Math.min(6, Number(cols) || 3));
  const sz = GALLERY_SIZES.some((x) => x.id === size) ? size : 'm';
  const cells = slots
    .map((url) => {
      if (!url) {
        return `<figure class="photo-grid__cell photo-grid__cell--empty" aria-hidden="true"></figure>`;
      }
      const safe = url.replace(/"/g, '&quot;');
      return `<figure class="photo-grid__cell"><img src="${safe}" alt="" loading="lazy" decoding="async" /></figure>`;
    })
    .join('\n');
  return `\n<div class="photo-grid photo-grid--${c} photo-grid--size-${sz}">\n${cells}\n</div>\n`;
}

export const GALLERY_PRESETS = [
  { id: '5', label: '1 行 × 5 张', cols: 5, count: 5 },
  { id: '10', label: '2 行 × 5 张', cols: 5, count: 10 },
  { id: '15', label: '3 行 × 5 张', cols: 5, count: 15 },
  { id: 'custom', label: '自定义', cols: 5, count: 6 },
];

export function rewriteGalleryHtmlForPreview(html, mediaPreviewUrl) {
  return String(html || '').replace(/src="([^"]+)"/g, (_m, url) => {
    const href = mediaPreviewUrl(url);
    return `src="${String(href).replace(/"/g, '&quot;')}"`;
  });
}

export const PHOTO_GRID_RE = /<div class="photo-grid[\s\S]*?<\/div>/gi;
