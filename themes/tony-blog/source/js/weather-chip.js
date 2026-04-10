/**
 * 固定经纬度 · Open-Meteo 当前天气（无 API Key）。支持页面上多个 [data-weather-chip]（共用一次请求）。
 */
(function () {
  var chips = document.querySelectorAll('[data-weather-chip]');
  if (!chips.length) return;

  var first = chips[0];
  var lat = parseFloat(first.getAttribute('data-lat'));
  var lon = parseFloat(first.getAttribute('data-lon'));
  var label = (first.getAttribute('data-label') || '').trim() || '本地';
  if (!isFinite(lat) || !isFinite(lon)) {
    chips.forEach(function (el) {
      var inner = el.querySelector('.weather-chip__inner');
      if (inner) inner.textContent = '天气 —';
    });
    return;
  }

  function wmoToZh(code) {
    var c = code == null ? -1 : Number(code);
    if (c === 0 || c === 1) return '晴';
    if (c === 2 || c === 3) return '多云';
    if (c >= 45 && c <= 48) return '雾';
    if (c >= 51 && c <= 57) return '小雨';
    if (c >= 61 && c <= 67) return '雨';
    if (c >= 71 && c <= 77) return '雪';
    if (c >= 80 && c <= 82) return '阵雨';
    if (c >= 95) return '雷雨';
    return '其他';
  }

  function renderAll(text) {
    chips.forEach(function (el) {
      var inner = el.querySelector('.weather-chip__inner');
      if (inner) inner.textContent = text;
    });
  }

  var url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lon) +
    '&current_weather=true';

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('wx');
      return r.json();
    })
    .then(function (data) {
      var cw = data && data.current_weather;
      if (!cw) throw new Error('wx');
      var t = cw.temperature;
      var wx = wmoToZh(cw.weathercode);
      var tempStr = t != null && !isNaN(t) ? Math.round(t) + '°C' : '';
      var line = label + ' · ' + wx + (tempStr ? ' ' + tempStr : '');
      renderAll(line);
    })
    .catch(function () {
      renderAll(label + ' · 天气 —');
    });
})();
