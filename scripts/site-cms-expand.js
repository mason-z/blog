'use strict';

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
    if (cms.site_ui) site.data.site_ui = cms.site_ui;
    if (cms.guestbook) site.data.guestbook = cms.guestbook;
    if (cms.theme) site.data.theme_cms = cms.theme;

    return locals;
  },
  1
);
