/**
 * 音乐分享页：根据访问者网络 IP 估算城市 + Open-Meteo 实时天气（无需密钥）。
 * 与时间轴里「当日手写」的天气/地点无关，仅供写稿时参考；可复制到后台。
 */
(function () {
  var root = document.getElementById('music-share-live');
  var out = document.getElementById('music-share-live-out');
  var errEl = document.getElementById('music-share-live-err');
  var btnCopy = document.getElementById('music-share-live-copy');
  if (!root || !out) return;

  var clipboardText = '';

  function wmoToZh(code) {
    var c = code == null ? -1 : Number(code);
    if (c === 0 || c === 1) return '晴';
    if (c === 2 || c === 3) return '多云';
    if (c >= 45 && c <= 48) return '雾';
    if (c >= 51 && c <= 57) return '毛毛雨';
    if (c >= 61 && c <= 67) return '雨';
    if (c >= 71 && c <= 77) return '雪';
    if (c >= 80 && c <= 82) return '阵雨';
    if (c >= 95) return '雷雨';
    return '其他';
  }

  function showErr(msg) {
    if (out) {
      out.hidden = true;
    }
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = msg;
    }
    if (btnCopy) btnCopy.hidden = true;
  }

  function setClipboard(t) {
    clipboardText = t;
    if (btnCopy) btnCopy.hidden = !t;
  }

  function render(city, region, weatherZh, tempC) {
    var loc = [city, region].filter(Boolean).join(' · ') || '未知地区';
    out.innerHTML =
      '<span class="music-share-live__loc">' +
      loc +
      '</span>' +
      '<span class="music-share-live__wx">天气 ' +
      weatherZh +
      '</span>' +
      '<span class="music-share-live__temp">' +
      (tempC != null && !isNaN(tempC) ? Math.round(tempC) + '°C' : '') +
      '</span>';
    out.hidden = false;
    setClipboard(weatherZh + '\n' + (city || loc.split(' · ')[0] || ''));
    if (errEl) errEl.hidden = true;
  }

  btnCopy &&
    btnCopy.addEventListener('click', function () {
      if (!clipboardText) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(clipboardText).then(
          function () {
            btnCopy.textContent = '已复制';
            setTimeout(function () {
              btnCopy.textContent = '复制天气与地点（粘贴到后台）';
            }, 2000);
          },
          function () {
            prompt('请手动复制：', clipboardText);
          }
        );
      } else {
        prompt('请手动复制：', clipboardText);
      }
    });

  function fetchWeather(lat, lon, city, region) {
    var u =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      encodeURIComponent(lat) +
      '&longitude=' +
      encodeURIComponent(lon) +
      '&current_weather=true';
    return fetch(u)
      .then(function (r) {
        if (!r.ok) throw new Error('weather');
        return r.json();
      })
      .then(function (data) {
        var cw = data && data.current_weather;
        var code = cw && cw.weathercode;
        var temp = cw && cw.temperature;
        render(city, region, wmoToZh(code), temp);
      })
  }

  function fromIpJson(j) {
    var lat = parseFloat(j.latitude);
    var lon = parseFloat(j.longitude);
    var city = (j.city && String(j.city).trim()) || '';
    var region = (j.region && String(j.region).trim()) || '';
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('noloc');
    return fetchWeather(lat, lon, city, region);
  }

  function tryIpWho() {
    return fetch('https://ipwho.is/json/')
      .then(function (r) {
        if (!r.ok) throw new Error('ipwho');
        return r.json();
      })
      .then(function (j) {
        if (!j.success) throw new Error('ipwho');
        return fromIpJson(j);
      });
  }

  fetch('https://ipapi.co/json/')
    .then(function (r) {
      if (!r.ok) throw new Error('ip');
      return r.json();
    })
    .then(function (j) {
      if (j.error) throw new Error(j.reason || 'ip');
      return fromIpJson(j);
    })
    .catch(function () {
      return tryIpWho();
    })
    .catch(function () {
      showErr('无法根据网络位置获取天气（可能被广告拦截或网络限制）。请在后台手动填写天气与地点。');
    });
})();
