'use strict';

/**
 * 在 EJS 中把站点配置里的多行/Markdown 文案渲染为 HTML（与 hexo-renderer-marked 一致）。
 * 另提供 plain_from_md 供 <meta name="description"> 等需纯文本的场景。
 */
hexo.extend.helper.register('render_md', function (text) {
  if (text == null) return '';
  const s = String(text).trim();
  if (!s) return '';
  return hexo.render.renderSync({ text: s, engine: 'md' });
});

hexo.extend.helper.register('plain_from_md', function (text) {
  if (text == null) return '';
  const s = String(text).trim();
  if (!s) return '';
  const html = hexo.render.renderSync({ text: s, engine: 'md' });
  const plain = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 280 ? plain.slice(0, 277) + '…' : plain;
});
