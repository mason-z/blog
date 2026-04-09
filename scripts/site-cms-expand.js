'use strict';

/**
 * 将 source/_data/site_cms.yml 展开为与旧版多文件一致的结构，避免改大量模板。
 * theme 覆盖放在 site.data.theme_cms，由 header / index / footer 优先读取。
 */
hexo.extend.filter.register('before_generate', function () {
  const data = this.locals.get('data');
  if (!data || !data.site_cms) return;

  const cms = data.site_cms;
  if (cms.site_name) data.site_name = cms.site_name;
  if (cms.site_ui) data.site_ui = cms.site_ui;
  if (cms.guestbook) data.guestbook = cms.guestbook;
  if (cms.theme) data.theme_cms = cms.theme;
});
