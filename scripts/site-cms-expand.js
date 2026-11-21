'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 将 source/_data/site_cms.yml 展开为与旧版多文件一致的结构（site_name / site_ui / guestbook / theme_cms）。
 *
 * 必须用 template_locals：before_generate 执行时 _data 往往尚未并入 locals，
 * 会导致合并被跳过，页面仍用根目录 _config.yml、themes/tony-blog/_config.yml 的旧值。
 *
 * @see https://hexo.io/api/filter#template_locals
 */
// priority 数字越小越先执行，保证其它 template_locals 能读到合并后的 site.data
hexo.extend.filter.register(
  'template_locals',
  function (locals) {
    const site = locals.site;
    if (!site || !site.data || !site.data.site_cms) return locals;

    const cms = site.data.site_cms;
    if (cms.site_name) site.data.site_name = cms.site_name;
    if (cms.site_ui) site.data.site_ui = rewriteSiteUiMedia(cms.site_ui);
    if (cms.guestbook) site.data.guestbook = cms.guestbook;
    if (cms.theme) site.data.theme_cms = rewriteThemeMedia(cms.theme);

    return locals;
  },
  1
);

function loadWebImageManifest() {
  try {
    const p = path.join(hexo.base_dir, 'tools', '.web-image-manifest.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function rewriteMediaUrl(url, manifest) {
  if (!url || typeof url !== 'string') return url;
  const s = url.trim();
  if (!s || /^https?:\/\//i.test(s)) return url;
  if (manifest[s]) return manifest[s];
  const base = path.basename(s);
  if (manifest['../../assets/' + base]) return manifest['../../assets/' + base];
  if (manifest['/images/uploads/' + base]) return manifest['/images/uploads/' + base];
  if (manifest['assets/' + base]) return manifest['assets/' + base];
  return url;
}

function rewriteThemeMedia(theme) {
  const manifest = loadWebImageManifest();
  if (!theme || !Object.keys(manifest).length) return theme;
  const out = JSON.parse(JSON.stringify(theme));
  if (out.dark_mode_bg_image) {
    out.dark_mode_bg_image = rewriteMediaUrl(out.dark_mode_bg_image, manifest);
  }
  return out;
}

function rewriteSiteUiMedia(siteUi) {
  const manifest = loadWebImageManifest();
  if (!siteUi || !Object.keys(manifest).length) return siteUi;
  const out = JSON.parse(JSON.stringify(siteUi));
  if (out.meta && out.meta.favicon) {
    out.meta.favicon = rewriteMediaUrl(out.meta.favicon, manifest);
  }
  return out;
}
