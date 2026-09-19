/* =========================================================================
   CUSTOMIZE ME — every personal word lives in this object. Edit freely.
   ========================================================================= */
var LETTER = {
  to: 'Halo Magdalena,',
  paragraphs: [
    "Aku menulis ini karena aku mau kamu tahu betapa bersyukurnya aku atas kehadiranmu.",
    "Dari beberapa kali kita jalan dan mengobrol, aku melihat betapa indahnya caramu mengasihi Tuhan dan orang-orang di sekitarmu. Karaktermu, senyummu, dan kesamaan visi yang kita punya membuat aku yakin bahwa aku gak mau jalan sendirian lagi.",
    { verse: "Serahkanlah hidupmu kepada TUHAN dan percayalah kepada-Nya, dan Ia akan bertindak.", ref: "Mazmur 37:5" },
    "Aku tahu kita datang dari latar belakang gereja yang berbeda, tapi aku percaya pusat iman kita sama. Hari ini aku mau berkomitmen penuh untuk berjalan di sampingmu\u2014saling belajar, saling mendukung karier dan pertumbuhan rohani, serta bernavigasi bareng sebagai tim untuk membangun hubungan yang terarah menuju pernikahan.",
    "Terima kasih sudah memilih untuk melangkah bersama. I\u2019m so looking forward to building our future together."
  ],
  sign: 'Soli Deo Gloria,',
  from: 'Andreas',
  ps: '',
  reasons: [
    { title: 'Your Heart for God', text: 'Melihat betapa tulus dan aktifnya kamu melayani Tuhan. Kesungguhan imanmu selalu bikin aku terinspirasi dan makin menghormati siapa dirimu.' },
    { title: 'Your Smile & Warmth', text: 'Senyummu yang selalu berhasil bikin suasana jadi tenang dan adem. Every time we hang out, seeing you smile is always the highlight of my day.' },
    { title: 'Our Honest Talks', text: 'Caramu diajak berdiskusi secara terbuka. Kita bisa ngobrolin banyak hal\u2014mulai dari cerita harian, perbedaan latar belakang, sampai mimpi masa depan\u2014dengan tenang dan saling menghargai.' },
    { title: 'Your Gentle Kindness', text: 'Kebaikan dan keramahanmu ke orang-orang di sekitarmu. You have such a genuine, warm, and loving heart.' },
    { title: 'Our Shared Vision', text: 'Kenyataan bahwa kita punya nilai-nilai hidup dan tujuan masa depan yang sejalan. Rasanya lega dan tenang bisa berjalan ke arah yang sama sama kamu.' },
    { title: 'Being My Teammate', text: 'Keterbukaanmu untuk saling belajar dan bertumbuh bareng. Knowing that from today on, I get to navigate life\u2019s journey with you as my teammate.' }
  ],
  question: 'Will you be my Girlfriend?',
  yesMessage: 'Best. Decision. Ever. \u2661'
};

(function () {
  'use strict';

  var HEART_SVG = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  function $(id) { return document.getElementById(id); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function fireBurst(cx, cy, count) {
    if (window.LOVE) window.LOVE.burst(cx, cy, count);
  }

  /* ---------------------------------------------------------------------
     Tiny WebAudio chime kit — no audio files, toggle-able, gesture-gated.
     --------------------------------------------------------------------- */
  var sound = (function () {
    var ctx = null;
    var enabled = localStorage.getItem('love-sound') !== 'off';

    function audioCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function pluck(freq, when, vol) {
      if (!enabled) return;
      var a = audioCtx();
      var o = a.createOscillator();
      var g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      var t0 = a.currentTime + (when || 0);
      var v = vol || 0.16;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(v, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g).connect(a.destination);
      o.start(t0);
      o.stop(t0 + 0.7);
    }

    return {
      pluck: pluck,
      fanfare: function () {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { pluck(f, i * 0.09); });
      },
      tinklePick: function () {
        var notes = [523.25, 587.33, 659.25, 783.99, 880];
        pluck(notes[Math.floor(rand(0, notes.length))], 0, 0.08);
      },
      toggle: function () {
        enabled = !enabled;
        localStorage.setItem('love-sound', enabled ? 'on' : 'off');
        return enabled;
      },
      isEnabled: function () { return enabled; }
    };
  })();

  /* ---------------------------------------------------------------------
     Populate personal content
     --------------------------------------------------------------------- */
  $('letter-to').textContent = LETTER.to;

  var body = $('letter-body');
  LETTER.paragraphs.forEach(function (item, i) {
    var el;
    if (item && typeof item === 'object' && item.verse) {
      el = document.createElement('blockquote');
      el.className = 'p-line letter-verse';
      el.innerHTML = '<span class="letter-verse-mark">\u201C</span>' + item.verse +
        '<span class="letter-verse-mark">\u201D</span><cite>' + item.ref + '</cite>';
    } else {
      el = document.createElement('p');
      el.className = 'p-line text-lg leading-relaxed';
      el.textContent = item;
    }
    el.style.setProperty('--d', (0.25 + i * 0.32) + 's');
    body.appendChild(el);
  });
  var afterParagraphs = 0.25 + LETTER.paragraphs.length * 0.32;
  $('letter-sign').textContent = LETTER.sign;
  $('letter-sign').style.setProperty('--d', afterParagraphs + 's');
  $('letter-from-text').textContent = '\u2014 ' + LETTER.from;
  $('letter-from').style.setProperty('--d', (afterParagraphs + 0.25) + 's');
  if (LETTER.ps) {
    $('letter-ps').textContent = LETTER.ps;
    $('letter-ps').style.setProperty('--d', (afterParagraphs + 0.55) + 's');
  } else {
    $('letter-ps').classList.add('hidden');
  }

  var grid = $('reasons-grid');
  LETTER.reasons.forEach(function (r) {
    var tilt = rand(-1.6, 1.6).toFixed(2);
    var card = document.createElement('article');
    card.className = 'reason-card bg-white/80 backdrop-blur rounded-2xl p-6 border border-blush-100 shadow-[0_10px_30px_-14px_rgba(226,67,122,0.35)]';
    card.style.transform = 'rotate(' + tilt + 'deg)';
    card.innerHTML =
      '<div class="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center mb-4 text-blush-500">' +
      HEART_SVG.replace('<svg ', '<svg class="w-5 h-5 fill-current" ') +
      '</div>' +
      '<h3 class="font-display font-bold text-xl">' + r.title + '</h3>' +
      '<p class="mt-2 text-plum/70">' + r.text + '</p>';
    grid.appendChild(card);
  });

  $('question-title').textContent = LETTER.question;

  /* ---------------------------------------------------------------------
     Envelope open / close sequence
     --------------------------------------------------------------------- */
  var env = $('envelope');
  var overlay = $('letter-overlay');
  var opened = false;
  var busy = false;

  function lockScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function showOverlay() {
    overlay.classList.remove('hidden');
    // force layout so the opacity transition actually runs
    void overlay.offsetWidth;
    overlay.classList.add('show');
    lockScroll(true);
    busy = false;
  }

  function hideOverlay() {
    overlay.classList.remove('show');
    lockScroll(false);
    setTimeout(function () { overlay.classList.add('hidden'); }, 350);
  }

  function openLetter() {
    if (opened || busy) return;
    busy = true;
    opened = true;
    env.classList.add('open');
    sound.fanfare();
    var r = env.getBoundingClientRect();
    fireBurst(r.left + r.width / 2, r.top + r.height * 0.3, 30);
    setTimeout(function () { env.classList.add('pull'); }, 600);
    setTimeout(function () {
      env.classList.add('fade-letter');
      showOverlay();
    }, 1350);
  }

  function closeLetter() {
    hideOverlay();
    env.classList.remove('fade-letter');
    env.classList.remove('pull');
    setTimeout(function () {
      env.classList.remove('open');
      opened = false;
    }, 450);
  }

  env.addEventListener('click', openLetter);
  env.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLetter();
    }
  });
  $('close-letter').addEventListener('click', closeLetter);
  overlay.querySelectorAll('[data-close-letter]').forEach(function (el) {
    el.addEventListener('click', closeLetter);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('show')) closeLetter();
  });

  /* ---------------------------------------------------------------------
     Mini DOM hearts that bloom from every click/tap
     --------------------------------------------------------------------- */
  var heartsLayer = $('hearts-layer');
  var MINI_PALETTE = ['#ff86ab', '#f96292', '#ffa5c4', '#e2437a', '#c22f63'];

  function spawnMiniHeart(x, y) {
    var el = document.createElement('span');
    el.className = 'mini-heart';
    el.innerHTML = HEART_SVG;
    var size = rand(14, 26);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--s', size + 'px');
    el.style.setProperty('--c', MINI_PALETTE[Math.floor(rand(0, MINI_PALETTE.length))]);
    el.style.setProperty('--dx', rand(-45, 45) + 'px');
    el.style.setProperty('--dy', rand(70, 140) + 'px');
    el.style.setProperty('--r', rand(-30, 30) + 'deg');
    el.style.setProperty('--t', rand(0.9, 1.4) + 's');
    heartsLayer.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }

  document.addEventListener('pointerdown', function (e) {
    if (overlay.classList.contains('show')) return;
    spawnMiniHeart(e.clientX, e.clientY);
    if (Math.random() < 0.35) sound.tinklePick();
  });

  /* ---------------------------------------------------------------------
     Playful "Will you be my Valentine?" dodge game
     --------------------------------------------------------------------- */
  var yesBtn = $('yes-btn');
  var noBtn = $('no-btn');
  var yesMessage = $('yes-message');
  var answerArea = $('answer-area');
  var dodges = 0;
  var taunts = ['No', 'Are you sure?', 'Really?', 'Think again!', 'Last chance!', "Can't catch me!"];

  function dodgeNo() {
    dodges++;
    noBtn.textContent = taunts[Math.min(dodges - 1, taunts.length - 1)];
    var scale = Math.min(1 + dodges * 0.11, 1.65);
    yesBtn.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';

    // Keep No from landing on top of the now-larger Yes button: resample
    // candidates until their boxes (plus a margin) don't overlap on either
    // axis; fall back to the corner farthest from Yes if none land clean.
    var areaRect = answerArea.getBoundingClientRect();
    var yesRect = yesBtn.getBoundingClientRect();
    var noRect = noBtn.getBoundingClientRect();
    var yesCx = yesRect.left + yesRect.width / 2 - areaRect.left;
    var yesCy = yesRect.top + yesRect.height / 2 - areaRect.top;
    var margin = 10;
    var clearX = (yesRect.width + noRect.width) / 2 + margin;
    var clearY = (yesRect.height + noRect.height) / 2 + margin;

    var xPct, yPct, px, py, tries = 0, clear = false;
    while (!clear && tries < 24) {
      xPct = rand(4, 88);
      yPct = rand(3, 88);
      px = (xPct / 100) * areaRect.width;
      py = (yPct / 100) * areaRect.height;
      clear = Math.abs(px - yesCx) > clearX || Math.abs(py - yesCy) > clearY;
      tries++;
    }
    if (!clear) {
      xPct = yesCx < areaRect.width / 2 ? 88 : 4;
      yPct = yesCy < areaRect.height / 2 ? 88 : 3;
    }

    noBtn.style.left = xPct + '%';
    noBtn.style.top = yPct + '%';
    sound.tinklePick();
  }
  noBtn.addEventListener('pointerenter', dodgeNo);
  noBtn.addEventListener('click', function (e) { e.preventDefault(); dodgeNo(); });

  yesBtn.addEventListener('click', function () {
    answerArea.classList.add('hidden');
    yesMessage.textContent = LETTER.yesMessage;
    yesMessage.classList.remove('hidden');
    yesMessage.classList.add('fade-up');
    sound.fanfare();
    var r = yesBtn.getBoundingClientRect();
    fireBurst(r.left + r.width / 2, r.top + r.height / 2, 55);
    for (var i = 0; i < 14; i++) {
      (function (idx) {
        setTimeout(function () {
          spawnMiniHeart(rand(window.innerWidth * 0.15, window.innerWidth * 0.85), rand(window.innerHeight * 0.25, window.innerHeight * 0.8));
        }, idx * 70);
      })(i);
    }
  });

  /* ---------------------------------------------------------------------
     Sound toggle button
     --------------------------------------------------------------------- */
  var soundToggle = $('sound-toggle');
  var iconOn = $('icon-sound-on');
  var iconOff = $('icon-sound-off');
  function syncSoundIcon() {
    var on = sound.isEnabled();
    iconOn.classList.toggle('hidden', !on);
    iconOff.classList.toggle('hidden', on);
    soundToggle.setAttribute('aria-pressed', String(on));
  }
  syncSoundIcon();
  soundToggle.addEventListener('click', function () {
    sound.toggle();
    syncSoundIcon();
    if (sound.isEnabled()) sound.tinklePick();
  });
})();
