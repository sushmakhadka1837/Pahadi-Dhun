(function () {
  "use strict";

  var DEV_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  function devNum(n) {
    return String(n).replace(/\d/g, function (d) { return DEV_DIGITS[+d]; });
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function nepalNow() {
    var now = new Date();
    var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    utc.setMinutes(utc.getMinutes() + 345);
    return utc;
  }

  function hourInNepal() { return nepalNow().getHours(); }

  function rotationByKey(key) {
    for (var i = 0; i < ROTATIONS.length; i++) {
      if (ROTATIONS[i].key === key) return ROTATIONS[i];
    }
    return null;
  }

  function rotationForHour(h) {
    for (var i = 0; i < ROTATIONS.length; i++) {
      var r = ROTATIONS[i];
      if (r.from < r.to) {
        if (h >= r.from && h < r.to) return r;
      } else {
        if (h >= r.from || h < r.to) return r;
      }
    }
    return ROTATIONS[0];
  }

  function rotationLabel(r) {
    return r.en + " · " + devNum(pad2(r.from)) + "–" + devNum(pad2(r.to)) + " NPT";
  }

  function songsFor(rotationKey) {
    return SONGS.filter(function (s) { return s.rotation === rotationKey; });
  }

  /* ---------- shared playback state (radio ⇄ playlist page) ---------- */
  var LAST_KEY = "pdh_play";
  function readLast() {
    try {
      var raw = localStorage.getItem(LAST_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && o.id ? o : null;
    } catch (e) { return null; }
  }
  function saveLast(s) {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({
        id: s.id, title: s.title, artist: s.artist, rotation: s.rotation
      }));
    } catch (e) {}
  }

  /* ---------- resume playback across page navigation ---------- */
  var RESUME_KEY = "pdh_resume";
  function readResume() {
    try {
      var raw = localStorage.getItem(RESUME_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function saveResume(playing, t) {
    try {
      if (!queue.length || !queue[queueIndex] || !player) return;
      if (t === undefined) {
        t = 0;
        if (typeof player.getCurrentTime === "function") {
          try { t = player.getCurrentTime() || 0; } catch (e) { t = 0; }
        }
      }
      localStorage.setItem(RESUME_KEY, JSON.stringify({
        id: queue[queueIndex].id, t: t, playing: !!playing, ts: Date.now()
      }));
    } catch (e) {}
  }

  /* ---------- state ---------- */
  var queue = [];
  var queueIndex = 0;
  var shuffleOn = false;
  var player = null;
  var apiReady = false;
  var lastErrorCount = 0;
  var pendingResume = null;

  var PAGE_ID = "radio";
  var bc = null;

  var els = {};

  /* ---------- dom helpers ---------- */
  function $(id) { return document.getElementById(id); }

  function findSong(id) {
    for (var i = 0; i < SONGS.length; i++) {
      if (SONGS[i].id === id) return SONGS[i];
    }
    return null;
  }

  function bind() {
    els.clock = $("clock");
    els.nptTime = $("nptTime");
    els.online = $("online");
    els.art = $("artWrap");
    els.nowTitle = $("nowTitle");
    els.nowArtist = $("nowArtist");
    els.btnPrev = $("btnPrev");
    els.btnPlay = $("btnPlay");
    els.btnNext = $("btnNext");
    els.btnShuffle = $("btnShuffle");
    els.nowPlayingRotation = $("nowPlayingRotation");
    els.nowRotationBadge = $("nowRotationBadge");
    els.lyricsCard = $("lyrics");
    els.lyricsToggle = $("lyricsToggle");
    els.lyricsBody = $("lyricsBody");
    els.progressCur = $("progressCur");
    els.progressTotal = $("progressTotal");
    els.progressFill = $("progressFill");
    els.photoNote = $("photoNote");
    els.heroCats = $("heroCats");
    els.categoryList = $("categoryList");
    els.catPrev = $("catPrev");
    els.catNext = $("catNext");
  }

  /* ---------- clock ---------- */
  function tickClock() {
    var n = nepalNow();
    var t = devNum(pad2(n.getHours())) + ":" + devNum(pad2(n.getMinutes()));
    els.clock.textContent = t;
    if (els.nptTime) els.nptTime.textContent = t;
  }

  /* ---------- online counter ---------- */
  function onlineBase() {
    var k = "pahadidhun_online";
    var v = parseInt(localStorage.getItem(k), 10);
    if (isNaN(v)) v = 18 + Math.floor(Math.random() * 24);
    v = Math.max(4, Math.min(80, v));
    localStorage.setItem(k, v);
    return v;
  }
  function tickOnline() {
    var v = onlineBase();
    v += Math.floor(Math.random() * 6) - 2;
    v = Math.max(3, Math.min(84, v));
    localStorage.setItem("pahadidhun_online", v);
    els.online.textContent = devNum(v) + " online";
    setTimeout(tickOnline, 5000 + Math.random() * 9000);
  }

  /* ---------- player controls ---------- */
  function playIndex(i) {
    if (!queue.length) return;
    queueIndex = ((i % queue.length) + queue.length) % queue.length;
    var s = queue[queueIndex];
    lastErrorCount = 0;
    if (apiReady && player) {
      player.loadVideoById(s.id);
    } else if (player && player.nodeName === "IFRAME") {
      player.src = "https://www.youtube.com/embed/" + s.id + "?autoplay=1&rel=0";
    }
    setNow(s);
    saveResume(true, 0);
    if (bc) {
      try { bc.postMessage({ type: "play", id: s.id, page: PAGE_ID }); } catch (e) {}
    }
  }

  function setLyrics(s) {
    if (!els.lyricsBody) return;
    els.lyricsCard.classList.add("open");
    els.lyricsBody.innerHTML = "";
    if (s.lyrics) {
      var p = document.createElement("p");
      p.className = "lyrics-text";
      p.textContent = s.lyrics;
      els.lyricsBody.appendChild(p);
    } else {
      var q = encodeURIComponent(s.title + " " + s.artist + " lyrics");
      els.lyricsBody.innerHTML =
        '<p class="lyrics-none">Lyrics not added yet.</p>' +
        '<a class="lyrics-link" href="https://www.youtube.com/results?search_query=' + q + '" target="_blank" rel="noopener">Search lyrics on YouTube →</a>';
    }
  }

  function setNow(s) {
    els.nowTitle.textContent = s.title;
    els.nowArtist.textContent = s.artist;
    els.art.classList.remove("playing");
    els.btnPlay.textContent = "▶";
    saveLast(s);
    setLyrics(s);
    document.title = "Pahadi Dhun · " + s.title;
  }

  function next() {
    if (!queue.length) return;
    var i = shuffleOn
      ? Math.floor(Math.random() * queue.length)
      : queueIndex + 1;
    playIndex(i);
  }

  function prev() {
    if (!queue.length) return;
    playIndex(queueIndex - 1);
  }

  function togglePlay() {
    if (!player || !queue.length) return;
    if (apiReady) {
      if (player.getPlayerState() === 1 || player.getPlayerState() === 3) {
        player.pauseVideo();
        els.btnPlay.textContent = "▶";
        els.art.classList.remove("playing");
        saveResume(false);
      } else {
        player.playVideo();
        els.btnPlay.textContent = "⏸";
        els.art.classList.add("playing");
        saveResume(true);
      }
    }
  }

  function toggleShuffle() {
    shuffleOn = !shuffleOn;
    els.btnShuffle.classList.toggle("on", shuffleOn);
    if (shuffleOn && queue.length > 1) {
      var cur = queue[queueIndex];
      var rest = queue.filter(function (s) { return s.id !== cur.id; });
      for (var i = rest.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = rest[i]; rest[i] = rest[j]; rest[j] = t;
      }
      queue = [cur].concat(rest);
      queueIndex = 0;
    }
  }

  function loadRotation(key, preferredId) {
    var r = rotationByKey(key);
    if (!r) return;
    queue = songsFor(key);
    if (!queue.length) return;
    if (shuffleOn) toggleShuffle();
    else { shuffleOn = false; els.btnShuffle.classList.remove("on"); }
    queueIndex = 0;
    if (preferredId) {
      var idx = queue.findIndex(function (q) { return q.id === preferredId; });
      if (idx >= 0) queueIndex = idx;
    }
    setActiveRotation(key);
    if (els.heroCats) {
      els.heroCats.querySelectorAll(".hero-cat").forEach(function (b) {
        b.classList.remove("active");
      });
    }
    if (els.nowPlayingRotation) els.nowPlayingRotation.textContent = rotationLabel(r);
    els.nowRotationBadge.textContent = rotationLabel(r);
    playIndex(queueIndex);
  }

  function setActiveRotation(key) {
    var grid = document.querySelector("#rotations .rotation-grid, #rotationGrid");
    if (!grid) return;
    var cards = grid.querySelectorAll(".rot-card");
    cards.forEach(function (c) {
      c.classList.toggle("active", c.dataset.key === key);
    });
  }

  /* ---------- photo note ---------- */
  function checkPhoto() {
    var img = new Image();
    img.onload = function () { els.photoNote.classList.remove("show"); };
    img.onerror = function () { els.photoNote.classList.add("show"); };
    img.src = "images/sudur.png";
  }

  /* ---------- song categories ---------- */
  var CATEGORIES = [
    { key: "deuda",     ne: "ड्यौड़ा",        en: "Deuda Songs" },
    { key: "old",       ne: "पुराना गीत",     en: "Old Nepali Songs" },
    { key: "evergreen", ne: "एभरग्रिन",       en: "Evergreen" },
    { key: "dohori",    ne: "पुरानो लोक दोहोरी", en: "Old Lok Dohori" },
    { key: "modern",    ne: "आधुनिक",         en: "Modern" }
  ];
  function renderCategories() {
    if (!els.categoryList) return;
    var counts = {};
    SONGS.forEach(function (s) {
      (s.tags || []).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    els.categoryList.innerHTML = CATEGORIES.map(function (c) {
      var n = counts[c.key] || 0;
      if (!n) return "";
      return '<article class="cat-card">' +
        '<span class="cat-tag">' + c.ne + '</span>' +
        '<h3>' + c.en + '</h3>' +
        '<p class="cat-count">' + devNum(n) + ' songs</p>' +
        '</article>';
    }).join("");
  }

  function renderHeroCats() {
    if (!els.heroCats) return;
    var counts = {};
    SONGS.forEach(function (s) {
      (s.tags || []).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    els.heroCats.innerHTML = CATEGORIES.map(function (c) {
      var n = counts[c.key] || 0;
      if (!n) return "";
      return '<button type="button" class="hero-cat" data-key="' + c.key + '">' +
        c.ne + '<span class="hero-cat-count">' + devNum(n) + '</span></button>';
    }).join("");
    els.heroCats.querySelectorAll(".hero-cat").forEach(function (btn) {
      btn.addEventListener("click", function () {
        loadCategory(btn.dataset.key);
      });
    });
  }

  function loadCategory(key) {
    var c = null;
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) { c = CATEGORIES[i]; break; }
    }
    if (!c) return;
    var catSongs = SONGS.filter(function (s) {
      return (s.tags || []).indexOf(key) >= 0;
    });
    if (!catSongs.length) return;
    queue = catSongs;
    queueIndex = 0;
    shuffleOn = false;
    els.btnShuffle.classList.remove("on");
    els.heroCats.querySelectorAll(".hero-cat").forEach(function (b) {
      b.classList.toggle("active", b.dataset.key === key);
    });
    if (els.nowPlayingRotation) els.nowPlayingRotation.textContent = c.en;
    els.nowRotationBadge.textContent = c.en + " · " + devNum(catSongs.length) + " songs";
    playIndex(0);
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- youtube ---------- */
  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    createPlayer();
  };

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return pad2(m) + ":" + pad2(s);
  }

  function updateProgress() {
    if (!els.progressFill) return;
    if (!apiReady || !player) return;
    try {
      var cur = player.getCurrentTime() || 0;
      var dur = player.getDuration() || 0;
      var pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
      els.progressFill.style.width = pct + "%";
      if (els.progressCur) els.progressCur.textContent = fmtTime(cur);
      if (els.progressTotal) els.progressTotal.textContent = fmtTime(dur);
    } catch (e) {}
  }

  function createPlayer() {
    var vid = queue.length ? queue[queueIndex].id : "M7lc1UVf-VE";
    player = new YT.Player("player", {
      height: "100%",
      width: "100%",
      videoId: vid,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: function () {
          var r = pendingResume || readResume();
          if (r && queue.length && queue[queueIndex] && queue[queueIndex].id === r.id) {
            try {
              if (r.t > 1) player.seekTo(r.t, true);
              if (r.playing) {
                player.playVideo();
              } else {
                els.btnPlay.textContent = "▶";
                els.art.classList.remove("playing");
              }
            } catch (e) {}
          }
          updateProgress();
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            els.btnPlay.textContent = "⏸";
            els.art.classList.add("playing");
          } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
            els.btnPlay.textContent = "▶";
            els.art.classList.remove("playing");
          }
          updateProgress();
          if (e.data === YT.PlayerState.ENDED) next();
        },
        onError: function () {
          lastErrorCount++;
          if (lastErrorCount < queue.length) next();
        }
      }
    });
  }

  function loadYouTubeApi() {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(tag, first);
    setTimeout(function () {
      if (!apiReady && !window.YT && els.nowPlayingRotation) {
        els.nowPlayingRotation.textContent = "Check your internet connection — the YouTube API could not load";
      }
    }, 12000);
  }

  /* ---------- live sync between radio ⇄ playlist pages ---------- */
  function initSync() {
    if (!("BroadcastChannel" in window)) return;
    try {
      bc = new BroadcastChannel("pdh_sync");
    } catch (e) { return; }
    bc.onmessage = function (e) {
      var d = e.data;
      if (!d || d.type !== "play" || d.page === PAGE_ID) return;
      if (queue.length && queue[queueIndex] && queue[queueIndex].id === d.id) return;
      var song = findSong(d.id);
      if (!song) return;
      loadRotation(song.rotation, song.id);
    };
  }

  /* ---------- story cards slider ---------- */
  function initStorySlider() {
    var grid = $("storyGrid");
    var btn = $("storySlideBtn");
    if (!grid || !btn) return;
    var card = grid.querySelector(".story-card");
    if (!card) return;
    var step = function () {
      return Math.ceil(card.getBoundingClientRect().width + 16);
    };
    btn.addEventListener("click", function () {
      var max = grid.scrollWidth - grid.clientWidth;
      if (max <= 0) return;
      if (grid.scrollLeft >= max - 6) {
        grid.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        grid.scrollBy({ left: step(), behavior: "smooth" });
      }
    });
  }

  /* ---------- init ---------- */
  function init() {
    bind();
    tickClock();
    setInterval(tickClock, 30000);
    tickOnline();
    setInterval(function () {
      if (apiReady && player && typeof player.getPlayerState === "function") {
        var st = player.getPlayerState();
        if (st === 1 || st === 3) saveResume(true);
      }
    }, 5000);
    checkPhoto();
    renderCategories();
    renderHeroCats();
    initStorySlider();

    if (els.categoryList) {
      var catTimer = null;
      function catAutoStop() { if (catTimer) { clearInterval(catTimer); catTimer = null; } }
      function catAutoStart() {
        catAutoStop();
        catTimer = setInterval(function () {
          var el = els.categoryList;
          var max = el.scrollWidth - el.clientWidth;
          if (max <= 0) return;
          if (el.scrollLeft >= max - 10) el.scrollTo({ left: 0, behavior: "smooth" });
          else el.scrollBy({ left: 260, behavior: "smooth" });
        }, 3800);
      }
      function catStep(dir) {
        catAutoStop();
        els.categoryList.scrollBy({ left: dir * 260, behavior: "smooth" });
        setTimeout(catAutoStart, 4500);
      }
      catAutoStart();
      els.categoryList.addEventListener("mouseenter", catAutoStop);
      els.categoryList.addEventListener("mouseleave", catAutoStart);
      els.categoryList.addEventListener("touchstart", catAutoStop, { passive: true });
      els.categoryList.addEventListener("scroll", catAutoStart);
      if (els.catPrev) els.catPrev.addEventListener("click", function () { catStep(-1); });
      if (els.catNext) els.catNext.addEventListener("click", function () { catStep(1); });
    }
    initReveal();
    initSync();

    els.btnPrev.addEventListener("click", prev);
    els.btnNext.addEventListener("click", next);
    els.btnPlay.addEventListener("click", togglePlay);
    els.btnShuffle.addEventListener("click", toggleShuffle);
    if (els.lyricsToggle) {
      els.lyricsToggle.addEventListener("click", function () {
        els.lyricsCard.classList.toggle("open");
      });
    }

    var current = rotationForHour(hourInNepal());
    var startSong = null;
    var last = readLast();
    if (last && last.id) {
      for (var i = 0; i < SONGS.length; i++) {
        if (SONGS[i].id === last.id) { startSong = SONGS[i]; break; }
      }
    }
    var startKey = startSong ? startSong.rotation : current.key;
    els.nowRotationBadge.textContent = rotationLabel(startSong ? rotationByKey(startSong.rotation) : current);
    pendingResume = readResume();
    loadRotation(startKey, startSong ? startSong.id : null);
    setInterval(updateProgress, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      loadYouTubeApi();
    });
  } else {
    init();
    loadYouTubeApi();
  }
})();
