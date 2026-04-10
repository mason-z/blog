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
  var seek = document.getElementById('music-player-seek');
  var seekFill = document.getElementById('music-player-seek-fill');
  var vol = document.getElementById('music-player-vol');
  var elCur = document.getElementById('music-player-cur');
  var elDur = document.getElementById('music-player-dur');
  var elName = document.getElementById('music-player-trackname');

  if (!audio || !btnToggle || !panel || !btnPlay) return;

  audio.playbackRate = 1;

  /** 仅在用户点击播放后，从 0 线性淡入到滑块目标音量；rAF 逐帧更新，无极分段感 */
  var FADE_MS = 8000;
  var VOL_TARGET_DEFAULT = 0.5;
  var fadeActive = false;
  /** 代码改 vol.value 时忽略 input，避免打断淡入 */
  var volFromCode = false;
  /** 每次换源递增，防止上一资源注册的 loadedmetadata 晚到后误写 currentTime */
  var loadGeneration = 0;

  var idx = 0;
  try {
    var si = sessionStorage.getItem(SK.i);
    if (si !== null && si !== '') idx = Math.max(0, Math.min(tracks.length - 1, parseInt(si, 10) || 0));
  } catch (e) {}

  function getTargetVol() {
    if (!vol) return VOL_TARGET_DEFAULT;
    var v = parseFloat(vol.value);
    return isFinite(v) ? Math.min(1, Math.max(0, v)) : VOL_TARGET_DEFAULT;
  }

  function cancelFade() {
    fadeActive = false;
  }

  function startFadeIn() {
    cancelFade();
    var target = getTargetVol();
    if (target <= 0) {
      audio.volume = 0;
      if (vol) {
        volFromCode = true;
        vol.value = '0';
        volFromCode = false;
      }
      return;
    }
    fadeActive = true;
    var t0 = performance.now();
    function tick() {
      if (!fadeActive) return;
      var elapsed = performance.now() - t0;
      var u = Math.min(1, elapsed / FADE_MS);
      var v = target * u;
      audio.volume = v;
      if (vol) {
        volFromCode = true;
        vol.value = String(v);
        volFromCode = false;
      }
      if (u >= 1) {
        fadeActive = false;
        audio.volume = target;
        if (vol) {
          volFromCode = true;
          vol.value = String(target);
          volFromCode = false;
        }
        try {
          sessionStorage.setItem(SK.vol, String(target));
        } catch (e) {}
        return;
      }
      requestAnimationFrame(tick);
    }
    audio.volume = 0;
    if (vol) {
      volFromCode = true;
      vol.value = '0';
      volFromCode = false;
    }
    requestAnimationFrame(tick);
  }

  /** doFade：从静音无极淡入到滑块目标；否则保持当前音量（暂停后续播、刷新恢复） */
  function safePlay(doFade) {
    if (doFade) {
      cancelFade();
      audio.volume = 0;
    }
    return audio
      .play()
      .then(function () {
        setPlayIcon(true);
        try {
          sessionStorage.setItem(SK.playing, '1');
        } catch (err) {}
        if (doFade) startFadeIn();
      })
      .catch(function () {
        setPlayIcon(false);
      });
  }

  audio.volume = 0;
  if (vol) {
    try {
      var sv = sessionStorage.getItem(SK.vol);
      if (sv !== null && sv !== '' && sv !== '1') {
        var restored = parseFloat(sv);
        if (isFinite(restored) && restored >= 0 && restored <= 1) vol.value = String(restored);
        else vol.value = String(VOL_TARGET_DEFAULT);
      } else vol.value = String(VOL_TARGET_DEFAULT);
    } catch (e) {
      vol.value = String(VOL_TARGET_DEFAULT);
    }
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /**
   * @param {number} i track index（单曲模式恒为 0）
   * @param {{ skipResume?: boolean }} [opts] 须跳过时间恢复时传 skipResume，避免误用旧 session 时间
   */
  function loadTrack(i, opts) {
    opts = opts || {};
    loadGeneration++;
    var myGen = loadGeneration;
    idx = (i + tracks.length) % tracks.length;
    var tr = tracks[idx];
    if (elName) elName.textContent = tr.title || '—';
    audio.src = tr.url;
    audio.load();
    try {
      sessionStorage.setItem(SK.i, String(idx));
    } catch (e) {}
    if (opts.skipResume) {
      try {
        sessionStorage.removeItem(SK.t);
      } catch (e) {}
    } else {
      var st = sessionStorage.getItem(SK.t);
      if (st !== null && st !== '') {
        var tt = parseFloat(st);
        if (!isNaN(tt) && tt > 0) {
          audio.addEventListener(
            'loadedmetadata',
            function once() {
              audio.removeEventListener('loadedmetadata', once);
              if (myGen !== loadGeneration) return;
              try {
                var dur = audio.duration;
                if (!isFinite(dur) || dur <= 0) return;
                audio.currentTime = Math.min(tt, dur);
              } catch (e) {}
            },
            { once: true }
          );
        }
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
    var willOpen = panel.hasAttribute('hidden');
    togglePanel(willOpen);
    if (willOpen && audio.paused) {
      var low = audio.volume < 0.02;
      safePlay(low);
    }
  });

  document.addEventListener('click', function (e) {
    if (!panel.hasAttribute('hidden') && !e.target.closest('.music-player-wrap')) {
      togglePanel(false);
    }
  });

  loadTrack(idx);

  function syncSeek() {
    if (!seek || !elCur || !elDur) return;
    if (audio.seeking) return;
    var d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    var pct = (audio.currentTime / d) * 100;
    pct = Math.min(100, Math.max(0, pct));
    if (seekFill) seekFill.style.width = pct + '%';
    seek.setAttribute('aria-valuenow', String(Math.round((audio.currentTime / d) * 1000)));
    elCur.textContent = fmt(audio.currentTime);
    elDur.textContent = fmt(d);
  }

  audio.addEventListener('timeupdate', function () {
    syncSeek();
    try {
      sessionStorage.setItem(SK.t, String(audio.currentTime));
    } catch (e) {}
  });

  audio.addEventListener('seeked', function () {
    syncSeek();
  });

  audio.addEventListener('ended', function () {
    try {
      audio.currentTime = 0;
    } catch (e) {}
    safePlay(true);
  });

  function setPlayIcon(playing) {
    if (!btnPlay) return;
    btnPlay.textContent = playing ? '❚❚' : '▶';
    btnPlay.setAttribute('aria-label', playing ? '暂停' : '播放');
  }

  btnPlay.addEventListener('click', function (e) {
    e.stopPropagation();
    if (audio.paused) {
      var low = audio.volume < 0.02;
      safePlay(low);
    } else {
      cancelFade();
      audio.pause();
      setPlayIcon(false);
      try {
        sessionStorage.setItem(SK.playing, '0');
      } catch (err) {}
    }
  });

  audio.addEventListener('error', function () {
    setPlayIcon(false);
  });

  if (vol) {
    vol.addEventListener('input', function () {
      if (volFromCode) return;
      cancelFade();
      audio.volume = parseFloat(vol.value) || 0;
      try {
        sessionStorage.setItem(SK.vol, String(audio.volume));
      } catch (e) {}
    });
  }

  try {
    if (sessionStorage.getItem(SK.playing) === '1') {
      audio.volume = getTargetVol();
      safePlay(false);
    }
  } catch (e) {}

  window.addEventListener('beforeunload', function () {
    try {
      sessionStorage.setItem(SK.t, String(audio.currentTime));
      sessionStorage.setItem(SK.playing, audio.paused ? '0' : '1');
    } catch (e) {}
  });
})();
