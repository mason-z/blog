(function () {
  var dataEl = document.getElementById('music-player-data');
  if (!dataEl) return;

  var cfg;
  try {
    cfg = JSON.parse(dataEl.textContent || '{}');
  } catch (e) {
    return;
  }
  var tracks = cfg.tracks || [];
  if (!tracks.length) return;

  var SK = {
    i: 'tony-music-idx',
    t: 'tony-music-time',
    playing: 'tony-music-playing',
    vol: 'tony-music-vol',
  };

  var audio = document.getElementById('music-player-audio');
  var btnToggle = document.getElementById('music-player-toggle');
  var panel = document.getElementById('music-player-panel');
  var btnPlay = document.getElementById('music-player-play');
  var btnPrev = document.getElementById('music-player-prev');
  var btnNext = document.getElementById('music-player-next');
  var seek = document.getElementById('music-player-seek');
  var vol = document.getElementById('music-player-vol');
  var elCur = document.getElementById('music-player-cur');
  var elDur = document.getElementById('music-player-dur');
  var elName = document.getElementById('music-player-trackname');

  if (!audio || !btnToggle || !panel) return;

  var idx = 0;
  try {
    var si = sessionStorage.getItem(SK.i);
    if (si !== null && si !== '') idx = Math.max(0, Math.min(tracks.length - 1, parseInt(si, 10) || 0));
  } catch (e) {}

  try {
    var sv = sessionStorage.getItem(SK.vol);
    if (sv !== null && sv !== '') {
      var v = parseFloat(sv);
      if (!isNaN(v)) {
        audio.volume = v;
        if (vol) vol.value = String(v);
      }
    } else if (vol) {
      audio.volume = parseFloat(vol.value) || 0.85;
    }
  } catch (e) {
    audio.volume = 0.85;
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function loadTrack(i) {
    idx = (i + tracks.length) % tracks.length;
    var tr = tracks[idx];
    elName.textContent = tr.title || '—';
    audio.src = tr.url;
    audio.load();
    try {
      sessionStorage.setItem(SK.i, String(idx));
    } catch (e) {}
    var st = sessionStorage.getItem(SK.t);
    if (st !== null && st !== '') {
      var tt = parseFloat(st);
      if (!isNaN(tt) && tt > 0) {
        audio.addEventListener(
          'loadedmetadata',
          function once() {
            audio.removeEventListener('loadedmetadata', once);
            try {
              audio.currentTime = Math.min(tt, audio.duration || tt);
            } catch (e) {}
          },
          { once: true }
        );
      }
    }
  }

  function togglePanel(open) {
    var isOpen = open !== undefined ? open : panel.hasAttribute('hidden');
    if (isOpen) {
      panel.removeAttribute('hidden');
      btnToggle.setAttribute('aria-expanded', 'true');
    } else {
      panel.setAttribute('hidden', '');
      btnToggle.setAttribute('aria-expanded', 'false');
    }
  }

  btnToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePanel(panel.hasAttribute('hidden'));
  });

  document.addEventListener('click', function (e) {
    if (!panel.hasAttribute('hidden') && !e.target.closest('.music-player-wrap')) {
      togglePanel(false);
    }
  });

  loadTrack(idx);

  function syncSeek() {
    var d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    seek.value = String(Math.round((audio.currentTime / d) * 1000));
    elCur.textContent = fmt(audio.currentTime);
    elDur.textContent = fmt(d);
  }

  audio.addEventListener('timeupdate', function () {
    syncSeek();
    try {
      sessionStorage.setItem(SK.t, String(audio.currentTime));
    } catch (e) {}
  });

  audio.addEventListener('ended', function () {
    loadTrack(idx + 1);
    audio
      .play()
      .then(function () {
        setPlayIcon(true);
        try {
          sessionStorage.setItem(SK.playing, '1');
        } catch (e) {}
      })
      .catch(function () {
        setPlayIcon(false);
      });
  });

  function setPlayIcon(playing) {
    btnPlay.textContent = playing ? '❚❚' : '▶';
    btnPlay.setAttribute('aria-label', playing ? '暂停' : '播放');
  }

  btnPlay.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().then(function () {
        setPlayIcon(true);
        try {
          sessionStorage.setItem(SK.playing, '1');
        } catch (e) {}
      });
    } else {
      audio.pause();
      setPlayIcon(false);
      try {
        sessionStorage.setItem(SK.playing, '0');
      } catch (e) {}
    }
  });

  btnPrev.addEventListener('click', function () {
    loadTrack(idx - 1);
    audio.play().then(function () {
      setPlayIcon(true);
    });
  });

  btnNext.addEventListener('click', function () {
    loadTrack(idx + 1);
    audio.play().then(function () {
      setPlayIcon(true);
    });
  });

  seek.addEventListener('input', function () {
    var d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    audio.currentTime = (parseFloat(seek.value) / 1000) * d;
  });

  if (vol) {
    vol.addEventListener('input', function () {
      audio.volume = parseFloat(vol.value) || 0;
      try {
        sessionStorage.setItem(SK.vol, String(audio.volume));
      } catch (e) {}
    });
  }

  try {
    if (sessionStorage.getItem(SK.playing) === '1') {
      audio.play().then(function () {
        setPlayIcon(true);
      }).catch(function () {});
    }
  } catch (e) {}

  window.addEventListener('beforeunload', function () {
    try {
      sessionStorage.setItem(SK.t, String(audio.currentTime));
      sessionStorage.setItem(SK.playing, audio.paused ? '0' : '1');
    } catch (e) {}
  });
})();
