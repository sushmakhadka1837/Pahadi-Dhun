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
  var player = null;
  var apiReady = false;
  var lastErrorCount = 0;
  var currentOpenKey = null;
  var allSongsOpen = false;

  var PAGE_ID = "playlist";
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
    els.btnAllSongs = $("btnAllSongs");
    els.playlistBlocks = $("playlistBlocks");
    els.lyricsCard = $("lyrics");
    els.lyricsToggle = $("lyricsToggle");
    els.lyricsBody = $("lyricsBody");
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
    els.art.classList.add("playing");
    els.btnPlay.textContent = "⏸";
    saveLast(s);
    setLyrics(s);
    highlightSong(s.id);
    document.title = "Pahadi Dhun · " + s.title;
  }

  function next() {
    if (!queue.length) return;
    playIndex(queueIndex + 1);
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

  function loadRotation(key, preferredId) {
    var r = rotationByKey(key);
    if (!r) return;
    queue = songsFor(key);
    if (!queue.length) return;
    queueIndex = 0;
    if (preferredId) {
      var idx = queue.findIndex(function (q) { return q.id === preferredId; });
      if (idx >= 0) queueIndex = idx;
    }
    playIndex(queueIndex);
  }

  function highlightSong(id) {
    var rows = document.querySelectorAll(".song[data-id]");
    rows.forEach(function (row) {
      var on = row.dataset.id === id;
      row.classList.toggle("playing", on);
      var b = row.querySelector(".song-play");
      if (b) b.textContent = on ? "⏸" : "▶";
    });
  }

  /* ---------- render ---------- */
  function songRow(s, idx, withRot) {
    var r = withRot ? rotationByKey(s.rotation) : null;
    return '<div class="song" data-id="' + s.id + '">' +
      '<span class="song-num">' + devNum(idx + 1) + '</span>' +
      '<span class="song-play">▶</span>' +
      '<div class="song-body">' +
      '<p class="song-title">' + s.title + '</p>' +
      '<p class="song-artist">' + s.artist + '</p>' +
      '</div>' +
      (r ? '<span class="song-rot">' + r.en + '</span>' : '') +
      '</div>';
  }

  function attachSongClicks(container) {
    container.querySelectorAll(".song").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.dataset.id;
        var song = null;
        for (var i = 0; i < SONGS.length; i++) {
          if (SONGS[i].id === id) { song = SONGS[i]; break; }
        }
        if (!song) return;
        loadRotation(song.rotation, song.id);
      });
    });
  }

  function setAllBtn(open) {
    els.btnAllSongs.textContent = open ? "Hide All Songs ▴" : "All Songs ▾";
    els.btnAllSongs.classList.toggle("on", open);
  }

  function renderSongsInto(container, songs, withRot) {
    var list = document.createElement("div");
    list.className = "song-list";
    list.innerHTML = songs.map(function (s, idx) {
      return songRow(s, idx, withRot);
    }).join("");
    container.appendChild(list);
    attachSongClicks(list);
  }

  function openCard(key) {
    var r = rotationByKey(key);
    if (!r) return;
    var songs = songsFor(key);
    currentOpenKey = key;
    allSongsOpen = false;
    els.plBody.innerHTML =
      '<div class="pl-open-head">' +
      '<h3>' + r.en + '</h3>' +
      '<p class="pl-time">' + devNum(pad2(r.from)) + '–' + devNum(pad2(r.to)) + ' NPT · ' + devNum(songs.length) + ' songs</p>' +
      '</div>';
    renderSongsInto(els.plBody, songs, false);
    var cards = els.playlistBlocks.querySelectorAll(".pl-card");
    cards.forEach(function (c) { c.classList.toggle("active", c.dataset.key === key); });
    setAllBtn(false);
  }

  function openAllSongs() {
    allSongsOpen = true;
    els.plBody.innerHTML =
      '<div class="pl-open-head">' +
      '<h3>All Songs</h3>' +
      '<p class="pl-time">' + devNum(SONGS.length) + ' songs · play via YouTube</p>' +
      '</div>';
    renderSongsInto(els.plBody, SONGS, true);
    var cards = els.playlistBlocks.querySelectorAll(".pl-card");
    cards.forEach(function (c) { c.classList.remove("active"); });
    setAllBtn(true);
  }

  function renderPlaylists() {
    els.playlistBlocks.innerHTML =
      '<div class="pl-grid">' + ROTATIONS.map(function (r) {
        var songs = songsFor(r.key);
        return '<button type="button" class="pl-card" data-key="' + r.key + '">' +
          '<h3>' + r.en + '</h3>' +
          '<p class="pl-time">' + devNum(pad2(r.from)) + '–' + devNum(pad2(r.to)) + ' NPT</p>' +
          '<p class="pl-blurb">' + r.blurb + '</p>' +
          '<span class="pl-count">' + devNum(songs.length) + ' songs</span>' +
          '</button>';
      }).join('') +
      '</div>' +
      '<div class="pl-body" id="plBody"></div>';

    els.plBody = $("plBody");

    els.playlistBlocks.querySelectorAll(".pl-card").forEach(function (card) {
      card.addEventListener("click", function () { openCard(card.dataset.key); });
    });
    els.btnAllSongs.addEventListener("click", function () {
      if (allSongsOpen) openCard(currentOpenKey || rotationForHour(hourInNepal()).key);
      else openAllSongs();
    });

    var openKey = null;
    var last = readLast();
    if (last && last.id) {
      for (var i = 0; i < SONGS.length; i++) {
        if (SONGS[i].id === last.id) { openKey = SONGS[i].rotation; break; }
      }
    }
    if (!openKey) openKey = rotationForHour(hourInNepal()).key;

    if (location.hash === "#songs") openAllSongs();
    else openCard(openKey);
  }

  /* ---------- youtube ---------- */
  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    createPlayer();
  };

  function createPlayer() {
    var vid = queue.length ? queue[queueIndex].id : "M7lc1UVf-VE";
    player = new YT.Player("player", {
      height: "100%",
      width: "100%",
      videoId: vid,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: function () {
          var r = readResume();
          if (!r || !r.playing) return;
          if (!queue.length || !queue[queueIndex]) return;
          if (queue[queueIndex].id !== r.id) return;
          try {
            if (r.t > 1) player.seekTo(r.t, true);
            player.playVideo();
            els.btnPlay.textContent = "⏸";
            els.art.classList.add("playing");
          } catch (e) {}
        },
        onStateChange: function (e) {
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
    renderPlaylists();
    initSync();

    els.btnPrev.addEventListener("click", prev);
    els.btnNext.addEventListener("click", next);
    els.btnPlay.addEventListener("click", togglePlay);
    els.lyricsToggle.addEventListener("click", function () {
      els.lyricsCard.classList.toggle("open");
    });

    var startSong = null;
    var last = readLast();
    if (last && last.id) {
      for (var i = 0; i < SONGS.length; i++) {
        if (SONGS[i].id === last.id) { startSong = SONGS[i]; break; }
      }
    }
    if (startSong) loadRotation(startSong.rotation, startSong.id);
    else loadRotation(rotationForHour(hourInNepal()).key);
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
