/* =========================================================================
   Gacha-gacha interactions: crank -> capsule -> sticker, then the super rare
   golden capsule (the letter), then the question.
   Content comes from LETTER (js/main.js), sound from window.sound.
   ========================================================================= */
(function () {
  'use strict';

  var LETTER = window.LETTER;
  var sound = window.sound;

  function $(id) { return document.getElementById(id); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function puff(x, y, n) { if (window.LOVE) window.LOVE.burst(x, y, n); }
  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var machine = $('machine');
  var globe = $('globe');
  var pile = $('pile');
  var face = $('face');
  var knob = $('knob');
  var grip = knob.querySelector('.knob-grip');
  var chute = machine.querySelector('.chute');
  var floor = $('floor');
  var stage = floor.parentNode;
  var marquee = $('marquee');
  var hint = $('hint');
  var coinsBox = machine.querySelector('.coins');
  var coinCount = $('coin-count');
  var tray = $('tray');
  var trayCount = $('tray-count');

  // One capsule color per reason, gold for the letter.
  var COLORS = ['#ff8fb1', '#7fdcc4', '#ffd45c', '#c7a8ff', '#8fcaff', '#ffb38a'];
  var GOLD = '#ffc93c';
  var TOTAL = LETTER.reasons.length + 1;

  /* ---------------------------------------------------------------------
     The pile of capsules inside the globe (bottom row first so upper rows
     overlap the ones below). Positions are % of the globe, top-left.
     --------------------------------------------------------------------- */
  var SPOTS = [
    [19, 70], [39, 71], [59, 70],
    [7, 52], [28, 53], [50, 51], [71, 53],
    [12, 35], [32, 35], [53, 34], [72, 36],
    [23, 19], [43, 18], [62, 20]
  ];
  var GOLD_SPOT = 5;
  var pileCaps = SPOTS.map(function (spot, i) {
    var cap = document.createElement('span');
    cap.className = 'cap' + (i === GOLD_SPOT ? ' gold' : '');
    cap.style.left = spot[0] + '%';
    cap.style.top = spot[1] + '%';
    cap.style.setProperty('--r', rand(-40, 40).toFixed(0) + 'deg');
    if (i !== GOLD_SPOT) cap.style.setProperty('--c', COLORS[i % COLORS.length]);
    pile.appendChild(cap);
    return cap;
  });

  // Take the highest regular capsule still in the globe (or the gold one).
  function takeFromPile(gold) {
    if (gold) return pileCaps[GOLD_SPOT];
    for (var i = pileCaps.length - 1; i >= 0; i--) {
      if (i !== GOLD_SPOT && !pileCaps[i].classList.contains('gone')) return pileCaps[i];
    }
    return null;
  }

  /* ---------------------------------------------------------------------
     Tray slots
     --------------------------------------------------------------------- */
  var slots = [];
  for (var s = 0; s < TOTAL; s++) {
    var li = document.createElement('li');
    li.className = 'slot' + (s === TOTAL - 1 ? ' gold-slot' : '');
    li.textContent = s === TOTAL - 1 ? '★' : String(s + 1);
    tray.appendChild(li);
    slots.push(li);
  }
  var collected = 0;

  function fillSlot(i) {
    var li = slots[i];
    if (li.firstElementChild) return;
    var gold = i === TOTAL - 1;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.style.setProperty('--c', gold ? GOLD : COLORS[i]);
    btn.textContent = gold ? '♥' : String(i + 1);
    btn.setAttribute('aria-label', gold ? 'Read the letter again' : 'Reason ' + (i + 1) + ': ' + LETTER.reasons[i].title);
    btn.addEventListener('click', function () {
      if (gold) openLetter(true);
      else openPrize(i, true);
    });
    li.textContent = '';
    li.appendChild(btn);
    collected++;
    trayCount.textContent = collected + '/' + TOTAL;
    var c = centerOf(li);
    puff(c.x, c.y, 8);
  }

  /* ---------------------------------------------------------------------
     Face: eyes follow the pointer, moods via classes
     --------------------------------------------------------------------- */
  var pupils = face.querySelectorAll('.pupil');
  window.addEventListener('pointermove', function (e) {
    var c = centerOf(face);
    var dx = e.clientX - c.x;
    var dy = e.clientY - c.y;
    var d = Math.max(Math.hypot(dx, dy), 1);
    var k = Math.min(d / 120, 1) * 4;
    pupils.forEach(function (p) {
      p.style.setProperty('--px', (dx / d * k).toFixed(1) + 'px');
      p.style.setProperty('--py', (dy / d * k).toFixed(1) + 'px');
    });
  }, { passive: true });

  function mood(name) {
    face.classList.remove('squish', 'happy', 'love');
    if (name) face.classList.add(name);
  }

  function say(text) { marquee.textContent = text; }

  /* ---------------------------------------------------------------------
     Crank -> capsule drops out of the chute and rolls onto the floor
     --------------------------------------------------------------------- */
  var coins = TOTAL;
  var turn = 0;
  var turns = 0;
  var busy = false;
  var dropped = null;

  coinCount.textContent = coins;
  knob.classList.add('ready');

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function crank() {
    if (dropped) {
      restart(dropped, 'wiggle');
      hint.textContent = 'open your capsule first!';
      sound.bonk();
      return;
    }
    if (busy || coins <= 0) return;
    busy = true;
    coins--;
    coinCount.textContent = coins;
    restart(coinsBox, 'spend');
    knob.classList.remove('ready');

    turns++;
    grip.style.setProperty('--turn', (turns * 360) + 'deg');
    mood('squish');
    restart(globe, 'rattle');
    restart(machine, 'shake');
    sound.crank();

    var gold = turn === TOTAL - 1;
    say(gold ? '★ !!! SUPER RARE !!! ★' : 'gacha… gacha…');

    setTimeout(function () {
      var cap = takeFromPile(gold);
      if (cap) cap.classList.add('gone');
      chute.classList.add('open');
      mood('happy');
      dropCapsule(gold);
      if (gold) {
        sound.fanfare();
        var c = centerOf(chute);
        puff(c.x, c.y, 30);
      } else {
        sound.tinklePick();
        say('♡ LUCKY! ♡');
      }
    }, 650);
  }

  function dropCapsule(gold) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dropped';
    btn.setAttribute('aria-label', gold ? 'Open the golden capsule' : 'Open the capsule');
    var cap = document.createElement('span');
    cap.className = 'cap' + (gold ? ' gold' : '');
    if (!gold) cap.style.setProperty('--c', COLORS[turn]);
    btn.appendChild(cap);
    floor.appendChild(btn);
    dropped = btn;

    var st = stage.getBoundingClientRect();
    var ch = chute.getBoundingClientRect();
    var size = 58;
    var x0 = ch.left + ch.width / 2 - st.left - size / 2;
    var y0 = ch.top + ch.height * 0.2 - st.top;
    var yFloor = st.height - size - 6;
    var dir = Math.random() < 0.5 ? -1 : 1;
    var x1 = x0 + dir * Math.min(st.width * 0.26, 110);
    btn.style.left = x0 + 'px';
    btn.style.top = y0 + 'px';

    var dx = x1 - x0;
    var dy = yFloor - y0;
    var anim = btn.animate([
      { transform: 'translate(0, 0) scale(0.5) rotate(0)', opacity: 0 },
      { transform: 'translate(0, ' + (dy * 0.25) + 'px) scale(0.9) rotate(' + (dir * 40) + 'deg)', opacity: 1, offset: 0.2 },
      { transform: 'translate(' + (dx * 0.35) + 'px, ' + dy + 'px) scale(1) rotate(' + (dir * 160) + 'deg)', offset: 0.45 },
      { transform: 'translate(' + (dx * 0.65) + 'px, ' + (dy - 34) + 'px) scale(1) rotate(' + (dir * 280) + 'deg)', offset: 0.65 },
      { transform: 'translate(' + (dx * 0.85) + 'px, ' + dy + 'px) scale(1.08, 0.92) rotate(' + (dir * 350) + 'deg)', offset: 0.82 },
      { transform: 'translate(' + (dx * 0.95) + 'px, ' + (dy - 10) + 'px) scale(1) rotate(' + (dir * 370) + 'deg)', offset: 0.91 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(1) rotate(' + (dir * 360) + 'deg)' }
    ], { duration: reduceMotion ? 1 : 1300, easing: 'linear', fill: 'forwards' });

    anim.onfinish = function () {
      // Bake the end state into left/top so the wiggle animation is clean.
      anim.cancel();
      btn.style.left = x1 + 'px';
      btn.style.top = yFloor + 'px';
      btn.classList.add('wiggle');
      chute.classList.remove('open');
      sound.bonk();
      busy = false;
      hint.textContent = gold ? 'ooh, a golden one… tap it!' : 'tap the capsule!';
      btn.focus({ preventScroll: true });
    };

    btn.addEventListener('click', function () {
      if (busy) return;
      var c = centerOf(btn);
      puff(c.x, c.y, gold ? 24 : 12);
      btn.remove();
      dropped = null;
      var i = turn;
      turn++;
      if (gold) openLetter(false);
      else openPrize(i, false);
    });
  }

  knob.addEventListener('click', crank);

  /* ---------------------------------------------------------------------
     Modals
     --------------------------------------------------------------------- */
  var openModal = null;
  var onClose = null;
  var returnFocus = null;

  function showModal(el, focusEl, after) {
    returnFocus = document.activeElement;
    openModal = el;
    onClose = after || null;
    el.hidden = false;
    el.classList.remove('open', 'closing');
    void el.offsetWidth;
    el.classList.add('open');
    el.scrollTop = 0;
    if (focusEl) setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 60);
  }

  function hideModal() {
    var el = openModal;
    if (!el) return;
    openModal = null;
    el.classList.add('closing');
    setTimeout(function () {
      el.hidden = true;
      el.classList.remove('open', 'closing');
      var cb = onClose;
      onClose = null;
      if (returnFocus && document.body.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      else knob.focus({ preventScroll: true });
      if (cb) cb();
    }, 240);
  }

  document.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', hideModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModal && openModal !== ask) hideModal();
  });

  /* A reason sticker */
  var prize = $('prize');
  var prizeCapsule = $('prize-capsule');
  var prizeCard = $('prize-card');

  function openPrize(i, again) {
    var reason = LETTER.reasons[i];
    prizeCapsule.style.setProperty('--c', COLORS[i]);
    prizeCard.style.setProperty('--c', COLORS[i]);
    $('prize-num').textContent = 'No. ' + ('0' + (i + 1)).slice(-2);
    $('prize-title').textContent = reason.title;
    $('prize-text').textContent = reason.text;
    $('prize-keep').textContent = again ? 'aww, okay' : 'add to collection';
    sound.pop();
    showModal(prize, $('prize-keep'), again ? null : function () {
      fillSlot(i);
      afterPrize();
    });
    setTimeout(function () {
      var c = centerOf(prizeCard);
      puff(c.x, c.y, 16);
    }, 700);
  }

  function afterPrize() {
    mood(null);
    if (coins > 0) {
      knob.classList.add('ready');
      var left = TOTAL - turn;
      say(left === 1 ? '★ 1 PLAY LEFT ★' : 'INSERT ♡ TO PLAY');
      hint.textContent = left === 1 ? 'something sparkly is in there…' : 'again! again!';
    }
  }

  /* The letter */
  var reader = $('reader');

  function renderBlock(item) {
    var el;
    if (item && typeof item === 'object' && item.verse) {
      el = document.createElement('blockquote');
      el.className = 'verse';
      el.appendChild(document.createTextNode('“' + item.verse + '”'));
      var cite = document.createElement('cite');
      cite.textContent = item.ref;
      el.appendChild(cite);
    } else {
      el = document.createElement('p');
      el.textContent = item;
    }
    return el;
  }

  $('letter-to').textContent = LETTER.to;
  var body = $('letter-body');
  LETTER.paragraphs.forEach(function (item) { body.appendChild(renderBlock(item)); });
  $('letter-sign').textContent = LETTER.sign;
  $('letter-from').textContent = LETTER.from;
  if (LETTER.ps) $('letter-ps').textContent = LETTER.ps;
  else $('letter-ps').classList.add('hidden');

  var answered = false;

  function openLetter(again) {
    if (!again) sound.pop();
    else sound.tinklePick();
    $('close-letter').textContent = answered ? 'fold it back up' : 'okay… now what?';
    showModal(reader, $('close-letter'), function () {
      fillSlot(TOTAL - 1);
      if (!answered) {
        say('one more thing…');
        hint.textContent = '';
        mood('happy');
        setTimeout(openAsk, 500);
      }
    });
  }

  /* The question */
  var ask = $('ask');
  var askCard = ask.querySelector('.ask');
  var yesBtn = $('yes-btn');
  var noBtn = $('no-btn');
  var actions = $('ask-actions');
  var dodges = 0;
  var taunts = ['no', 'sure?', 'really??', 'think again!', 'nope, not here', 'catch me!'];

  $('ask-q').textContent = LETTER.question;

  function openAsk() {
    showModal(ask, yesBtn, celebrateMachine);
  }

  function dodgeNo() {
    dodges++;
    noBtn.textContent = taunts[Math.min(dodges, taunts.length - 1)];
    yesBtn.style.transform = 'translate(-50%, -50%) scale(' + Math.min(1 + dodges * 0.12, 1.7) + ')';

    // Keep No off the growing Yes: resample until the two are clear of each
    // other on at least one axis, else fall back to the far corner.
    var areaRect = actions.getBoundingClientRect();
    var yesRect = yesBtn.getBoundingClientRect();
    var noRect = noBtn.getBoundingClientRect();
    var yesX = yesRect.left + yesRect.width / 2 - areaRect.left;
    var yesY = yesRect.top + yesRect.height / 2 - areaRect.top;
    var clearX = (yesRect.width + noRect.width) / 2 + 6;
    var clearY = (yesRect.height + noRect.height) / 2 + 6;

    var xPct, yPct, px, py, tries = 0, clear = false;
    while (!clear && tries < 24) {
      xPct = rand(16, 84);
      yPct = rand(18, 82);
      px = (xPct / 100) * areaRect.width;
      py = (yPct / 100) * areaRect.height;
      clear = Math.abs(px - yesX) > clearX || Math.abs(py - yesY) > clearY;
      tries++;
    }
    if (!clear) {
      xPct = yesX < areaRect.width / 2 ? 84 : 16;
      yPct = yesY < areaRect.height / 2 ? 82 : 18;
    }
    noBtn.style.left = xPct + '%';
    noBtn.style.top = yPct + '%';
    sound.bonk();
  }

  noBtn.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') dodgeNo();
  });
  noBtn.addEventListener('click', function (e) { e.preventDefault(); dodgeNo(); });

  yesBtn.addEventListener('click', function () {
    answered = true;
    askCard.classList.add('done');
    var yes = $('ask-yes');
    yes.textContent = LETTER.yesMessage;
    yes.hidden = false;
    $('ask-done').hidden = false;
    $('ask-done').focus({ preventScroll: true });
    // Let the hearts fly over the card for the big moment.
    document.body.classList.add('party');
    sound.fanfare();
    // Burst from the card's corners so the yes message stays readable.
    var r = askCard.getBoundingClientRect();
    puff(r.left + 10, r.bottom - 10, 30);
    puff(r.right - 10, r.bottom - 10, 30);
    for (var i = 0; i < 10; i++) {
      (function (n) {
        setTimeout(function () {
          var edge = n % 2 ? r.bottom + 30 : r.top - 30;
          puff(rand(window.innerWidth * 0.1, window.innerWidth * 0.9), edge, 10);
        }, n * 110);
      })(i);
    }
  });

  $('ask-done').addEventListener('click', hideModal);

  function celebrateMachine() {
    document.body.classList.remove('party');
    if (!answered) return;
    mood('love');
    say('♥ JACKPOT ♥');
    hint.textContent = 'forever my favorite prize ♡';
    restart(machine, 'jackpot');
    sound.fanfare();
    var c = centerOf(globe);
    puff(c.x, c.y, 40);
  }

  /* ---------------------------------------------------------------------
     Poking the machine / the background
     --------------------------------------------------------------------- */
  globe.addEventListener('pointerdown', function () {
    if (busy) return;
    restart(globe, 'rattle');
    sound.tinklePick();
  });

  face.parentNode.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.knob, .coins')) return;
    if (face.classList.contains('love')) return;
    mood('happy');
    sound.bonk();
    setTimeout(function () { if (!busy && face.classList.contains('happy')) mood(null); }, 700);
  });

  document.addEventListener('pointerdown', function (e) {
    if (openModal) return;
    if (e.target.closest('.machine, .dropped, .tray, .sound-toggle')) return;
    puff(e.clientX, e.clientY, 6);
    if (Math.random() < 0.35) sound.tinklePick();
  });

  /* ---------------------------------------------------------------------
     Sound toggle
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
