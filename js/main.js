/* =========================================================================
   CUSTOMIZE ME — every personal word lives in this object. Edit freely.
   ========================================================================= */
var LETTER = {
  to: 'Halo Magdalena,',
  paragraphs: [
    "Aku menulis ini karena aku mau kamu tahu betapa bersyukurnya aku atas kehadiranmu.",
    "Dari beberapa kali kita jalan dan mengobrol, aku melihat betapa indahnya caramu mengasihi Tuhan dan orang-orang di sekitarmu. Karaktermu, senyummu, dan kesamaan visi yang kita punya membuat aku yakin bahwa aku gak mau jalan sendirian lagi.",
    { verse: "Berdua lebih baik dari pada seorang diri, karena mereka menerima upah yang baik dalam jerih payah mereka\u2026 Dan bilamana seorang dapat dialahkan, dua orang akan dapat bertahan. Tali tiga lembar tak mudah diputuskan.", ref: "Pengkhotbah 4:9, 12" },
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
    { title: 'Your Brilliant, Caring Mind', text: 'Kamu wanita karier yang cerdas dan sangat bertanggung jawab. Bahkan rela lembur demi kepentingan kantor, karena kamu memang se-care itu. I admire you so much, tapi jangan lupa istirahat juga ya, biar aku yang ingetin.' },
    { title: 'Our Shared Vision', text: 'Kenyataan bahwa kita punya nilai-nilai hidup dan tujuan masa depan yang sejalan. Rasanya lega dan tenang bisa berjalan ke arah yang sama sama kamu.' },
    { title: 'Being My Teammate', text: 'Keterbukaanmu untuk saling belajar dan bertumbuh bareng. Knowing that from today on, I get to navigate life\u2019s journey with you as my teammate.' }
  ],
  question: 'Will you be my Girlfriend?',
  yesMessage: 'Best. Decision. Ever. \u2661'
};

/* =========================================================================
   Sound kit, shared with the desk UI (js/ui.js) through window.sound.
   ========================================================================= */
(function () {
  'use strict';

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------------------------------------------------------------
     WebAudio chime kit — FM bell voices through a synthetic plate reverb.
     No audio files, toggle-able, gesture-gated. Signal path:

       voice ─┬─ dry ─────────────────┐
              └─ convolver ─ wet ─────┴─ soft clip ─ out

     Each voice is a sine carrier frequency-modulated by an inharmonic
     partial whose modulation index collapses in ~0.3s: bright glockenspiel
     strike, pure singing tail. Notes stay in C major pentatonic so random
     picks are always consonant.
     --------------------------------------------------------------------- */
  var sound = (function () {
    var ctx = null;
    var bus = null;
    var enabled = localStorage.getItem('love-sound') !== 'off';
    var PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

    // Dense noise with an exponential tail, one-pole filtered per sample so
    // the tail is warm instead of hissy (~2s small-room impulse response).
    function impulse(a, seconds, decay) {
      var len = Math.max(1, Math.round(a.sampleRate * seconds));
      var buf = a.createBuffer(2, len, a.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        var lp = 0;
        for (var i = 0; i < len; i++) {
          lp = lp * 0.74 + (Math.random() * 2 - 1) * 0.26;
          d[i] = lp * Math.pow(1 - i / len, decay);
        }
      }
      return buf;
    }

    // tanh curve: overlapping notes compress instead of crackling.
    function softClip(a) {
      var shaper = a.createWaveShaper();
      var curve = new Float32Array(1024);
      var norm = Math.tanh(1.5);
      for (var i = 0; i < curve.length; i++) {
        curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.5) / norm;
      }
      shaper.curve = curve;
      shaper.oversample = '2x';
      return shaper;
    }

    function build(a) {
      var out = softClip(a);
      out.connect(a.destination);

      var master = a.createGain();
      master.gain.value = 0.85;
      master.connect(out);

      bus = a.createGain();
      bus.connect(master); // dry

      var verb = a.createConvolver();
      verb.buffer = impulse(a, 2.1, 2.6);
      var wet = a.createGain();
      wet.gain.value = 0.34;
      bus.connect(verb);
      verb.connect(wet).connect(master);
    }

    function audioCtx() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        build(ctx);
      }
      if (ctx.state === 'suspended' && ctx.resume) {
        var p = ctx.resume();
        if (p && p.catch) p.catch(function () {});
      }
      return ctx;
    }

    // freq Hz, when = seconds from now, vol = linear peak gain, dur = tail
    // length, pan = -1..1 (omitted = centred).
    function voice(freq, when, vol, dur, pan) {
      if (!enabled) return;
      var a = audioCtx();
      var t0 = a.currentTime + Math.max(0, when || 0);
      var len = dur || 1.2;

      var carrier = a.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = freq;

      var mod = a.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = freq * 3.5;

      var index = a.createGain(); // FM deviation in Hz = index * modFreq
      index.gain.setValueAtTime(freq * 3.9, t0);
      index.gain.exponentialRampToValueAtTime(freq * 0.28, t0 + 0.3);
      mod.connect(index).connect(carrier.frequency);

      var amp = a.createGain();
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(vol, t0 + 0.007);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      carrier.connect(amp);

      var head = amp;
      if (pan && a.createStereoPanner) {
        var panner = a.createStereoPanner();
        panner.pan.value = pan;
        amp.connect(panner);
        head = panner;
      }
      head.connect(bus);

      carrier.start(t0);
      mod.start(t0);
      carrier.stop(t0 + len + 0.02);
      mod.stop(t0 + len + 0.02);
    }

    return {
      fanfare: function () {
        // Rising arpeggio over a soft root, for the big reveal moments.
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (f, i) {
          voice(f, i * 0.085, 0.13 + i * 0.012, 1.5 + i * 0.16);
        });
        voice(261.63, 0, 0.08, 1.9);
      },
      tinklePick: function () {
        voice(PENTATONIC[Math.floor(rand(0, PENTATONIC.length))], 0, 0.06, 0.9, rand(-0.25, 0.25));
      },
      crank: function () {
        // Ratchet clicks while the knob turns: short, low, dull strikes.
        for (var i = 0; i < 6; i++) voice(rand(180, 230), i * 0.1, 0.05, 0.08, rand(-0.2, 0.2));
      },
      pop: function () {
        // Capsule halves springing apart: a quick upward blip, then a sparkle.
        voice(392, 0, 0.1, 0.25);
        voice(784, 0.06, 0.09, 0.4);
        voice(1567.98, 0.12, 0.05, 0.7, 0.2);
      },
      clink: function (v) {
        // Plastic capsules knocking together; v = 0..1 impact strength.
        voice(rand(1100, 1600), 0, 0.012 + v * 0.03, 0.09, rand(-0.35, 0.35));
      },
      bonk: function () {
        voice(130.81, 0, 0.1, 0.3);
      },
      toggle: function () {
        enabled = !enabled;
        localStorage.setItem('love-sound', enabled ? 'on' : 'off');
        return enabled;
      },
      isEnabled: function () { return enabled; }
    };
  })();

  window.sound = sound;
})();
