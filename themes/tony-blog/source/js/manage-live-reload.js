/**
 * 本地预览（layout 仅在 config.url 为 localhost 时加载）：读 /manage-live-revision.json，变更则刷新（含 /archives/）
 */
(function () {
  var host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;

  var INTERVAL = 3000;
  var REV_URL = '/manage-live-revision.json';
  var knownRev = null;

  function tick() {
    if (document.visibilityState === 'hidden') return;
    fetch(REV_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('no file');
        return r.json();
      })
      .then(function (j) {
        var rev = j && j.revision;
        if (typeof rev !== 'number') return;
        if (knownRev === null) {
          knownRev = rev;
          return;
        }
        if (rev !== knownRev) {
          knownRev = rev;
          var u = new URL(location.href);
          u.searchParams.set('_lv', String(rev));
          location.replace(u.toString());
        }
      })
      .catch(function () {
        /* 管理未开或尚未 generate：不刷页、不报错 */
      });
  }

  tick();
  setInterval(tick, INTERVAL);
})();
