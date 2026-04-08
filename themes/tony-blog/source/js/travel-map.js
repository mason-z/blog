(function () {
  var points = window.__TRAVEL_MARKERS || [];
  var el = document.getElementById('travel-map');
  if (!el || typeof L === 'undefined') {
    if (el) {
      el.innerHTML =
        '<p class="travel-map__err">地图脚本未加载。请用 <code>hexo server</code> 本地预览，或检查网络能否访问 jsDelivr。</p>';
    }
    return;
  }

  var map = L.map(el, { scrollWheelZoom: true });

  // Esri：卫星底图 + 道路 + 行政边界与地名（混合「实拍+标注」，免 Key）
  var esriAttr =
    '&copy; <a href="https://www.esri.com/">Esri</a> — 卫星影像、道路与地名标注';
  var tileOpts = { maxZoom: 19 };

  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    Object.assign({ attribution: esriAttr }, tileOpts)
  ).addTo(map);
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    tileOpts
  ).addTo(map);
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    tileOpts
  ).addTo(map);

  function relayout() {
    map.invalidateSize(true);
  }

  var bounds = [];
  var markers = [];

  points.forEach(function (p, i) {
    var lat = Number(p.lat);
    var lng = Number(p.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    var m = L.marker([lat, lng]).addTo(map);
    var html = '<div class="travel-popup"><strong>' + escapeHtml(String(p.name || '')) + '</strong>';
    if (p.note) html += '<br/>' + escapeHtml(String(p.note));
    if (p.date) html += '<br/><span class="travel-popup__date">' + escapeHtml(String(p.date)) + '</span>';
    html += '</div>';

    if (p.href) {
      m.on('click', function () {
        window.location.href = p.href;
      });
    } else {
      m.bindPopup(html);
    }

    m._travelIndex = i;
    markers.push(m);
    bounds.push([lat, lng]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  } else {
    map.setView([33.5, 106.0], 4);
  }

  requestAnimationFrame(function () {
    relayout();
    setTimeout(relayout, 120);
  });
  window.addEventListener('resize', relayout);

  document.querySelectorAll('.travel-city-list__btn[data-travel-index]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(btn.getAttribute('data-travel-index'), 10);
      if (isNaN(idx) || !markers[idx]) return;
      var m = markers[idx];
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 6), { animate: true });
      m.openPopup();
    });
  });

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
