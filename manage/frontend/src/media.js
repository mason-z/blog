/** 轻量 Markdown 预览（含 photo-grid HTML 块） */
import { PHOTO_GRID_RE, rewriteGalleryHtmlForPreview } from './gallery.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function mediaPreviewUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  if (s.startsWith('/api/media/')) return s;

  const assetsMatch = s.match(/(?:\.\.\/)*assets\/([^?#]+)/i);
  if (assetsMatch) return `/api/media/${encodeURIComponent(assetsMatch[1])}`;

  const imagesMatch = s.match(/(?:\.\.\/)*images\/([^?#]+)/i);
  if (imagesMatch) return `/api/media/${encodeURIComponent(pathBasename(imagesMatch[1]))}`;

  if (!s.includes('/') && /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(s)) {
    return `/api/media/${encodeURIComponent(s)}`;
  }

  return s;
}

function pathBasename(p) {
  const parts = String(p || '').split(/[/\\]/);
  return parts[parts.length - 1] || p;
}

function normalizeMarkdown(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export function renderMarkdownPreview(markdown) {
  const src = normalizeMarkdown(markdown);
  if (!src.trim()) return '<p class="preview-empty">暂无内容</p>';

  const chunks = [];
  let last = 0;
  const re = new RegExp(PHOTO_GRID_RE.source, 'gi');
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) chunks.push({ type: 'md', text: src.slice(last, m.index) });
    chunks.push({ type: 'gallery', html: m[0] });
    last = m.index + m[0].length;
  }
  if (last < src.length) chunks.push({ type: 'md', text: src.slice(last) });
  if (!chunks.length) chunks.push({ type: 'md', text: src });

  return chunks
    .map((chunk) => {
      if (chunk.type === 'gallery') return rewriteGalleryHtmlForPreview(chunk.html, mediaPreviewUrl);
      return renderMarkdownPart(chunk.text);
    })
    .join('');
}

function renderMarkdownPart(markdown) {
  const lines = normalizeMarkdown(markdown).split('\n');
  const out = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let paraLines = [];

  function flushParagraph() {
    if (!paraLines.length) return;
    const merged = paraLines.join(' ').trim();
    paraLines.length = 0;
    if (merged) out.push(renderInlineParagraph(merged));
  }

  function flushCode() {
    if (!codeLines.length) return;
    out.push(
      `<pre class="preview-pre"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
    );
    codeLines = [];
    codeLang = '';
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^<div class="photo-grid/.test(trimmed)) {
      flushParagraph();
      out.push(rewriteGalleryHtmlForPreview(trimmed, mediaPreviewUrl));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      out.push(renderHeading(heading[1].length, heading[2]));
      continue;
    }

    const imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgOnly) {
      flushParagraph();
      out.push(renderImageMarkdown(imgOnly[1], imgOnly[2]));
      continue;
    }

    paraLines.push(trimmed);
  }

  if (inCode) flushCode();
  flushParagraph();
  return out.join('');
}

function renderHeading(level, text) {
  const n = Math.min(6, Math.max(1, level));
  const tag = `h${n}`;
  return `<${tag} class="preview-h preview-h${n}">${renderInline(escapeHtml(text))}</${tag}>`;
}

function renderImageMarkdown(alt, url) {
  const href = mediaPreviewUrl(url);
  const safeAlt = escapeHtml(alt);
  return `<figure class="article-figure"><img src="${escapeHtml(href)}" alt="${safeAlt}" loading="lazy" /><figcaption>${safeAlt || '图片'}</figcaption></figure>`;
}

function renderInlineParagraph(text) {
  return `<p class="preview-p">${renderInline(escapeHtml(text))}</p>`;
}

function renderInline(escapedText) {
  return String(escapedText || '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
      const href = mediaPreviewUrl(url);
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" class="article-inline-img" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
      const href = /^https?:\/\//i.test(url) ? url : mediaPreviewUrl(url);
      return `<a href="${escapeHtml(href)}" class="preview-link" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
    })
    .replace(/`([^`]+)`/g, '<code class="preview-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
