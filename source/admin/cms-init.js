/**
 * 手动加载 config.yml，避免 Decap 双份 init。
 * 媒体：assets/ 相对路径（../../assets/），构建时压缩到 /images/web/
 */
(function () {
  var CMS = window.CMS;
  if (!CMS || typeof CMS.init !== 'function') {
    console.error('[cms-init] Decap CMS 未加载');
    return;
  }

  if (window.__MEISO_CMS_INITIALIZED__) {
    return;
  }
  window.__MEISO_CMS_INITIALIZED__ = true;

  function cmsAlreadyInitialized() {
    try {
      if (CMS._initialized) return true;
    } catch (e) {}
    try {
      var state = CMS.store && CMS.store.getState && CMS.store.getState();
      if (!state || !state.config) return false;
      var cols = state.config.collections;
      if (cols && typeof cols.size === 'number' && cols.size > 0) return true;
      if (Array.isArray(cols) && cols.length > 0) return true;
    } catch (e2) {}
    return false;
  }

  if (cmsAlreadyInitialized()) {
    console.warn('[cms-init] CMS 已初始化，跳过重复 init');
    return;
  }

  fetch('./config.yml', { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('无法读取 config.yml (' + res.status + ')');
      return res.text();
    })
    .then(function (text) {
      if (!window.jsyaml || typeof window.jsyaml.load !== 'function') {
        throw new Error('js-yaml 未加载');
      }
      var config = window.jsyaml.load(text);
      return CMS.init({ load_config_file: false, config: config });
    })
    .catch(function (err) {
      window.__MEISO_CMS_INITIALIZED__ = false;
      console.error('[cms-init]', err);
      alert('后台配置加载失败：' + (err.message || err));
    });
})();
