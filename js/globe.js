/* =========================================================================
   Capsule physics for the gacha globe. Gravity follows the phone's tilt,
   shaking the phone (or kick()) tosses the capsules around.
   Exposes window.makeGlobe(pileEl, capEls, opts).
   ========================================================================= */
(function () {
  'use strict';

  var D2R = Math.PI / 180;
  var R = 0.1;                // capsule radius, in pile widths (.pile .cap is 20% wide)
  var WALL = 0.5 - R - 0.005; // max distance of a capsule centre from the middle
  var G = 3.2;                // gravity, pile widths / s^2
  var DAMP = 0.998;           // per substep air drag
  var E_WALL = 0.35;          // restitution against the glass
  var E_BALL = 0.45;          // restitution capsule vs capsule
  var TILT_BIAS = 0.25;       // keeps capsules settling "down" when the phone lies flat
  var SHAKE_AT = 12;          // m/s^2 of motion before it counts as a shake
  var REST = 0.05;            // below this speed a capsule is settling: bleed it off
  var ROLL = 0.06;            // below this speed a capsule doesn't visibly roll
  var TILT_DEADBAND = 0.03;   // ignore hand tremor smaller than this in the tilt

  function rand(a, b) { return a + Math.random() * (b - a); }

  // opts: { still: bool, onHit(speed), onShake(strength) }
  window.makeGlobe = function (pile, caps, opts) {
    opts = opts || {};
    var balls = caps.map(function (el) {
      var b = {
        el: el,
        x: parseFloat(el.style.left) / 100 + R,
        y: parseFloat(el.style.top) / 100 + R,
        vx: 0,
        vy: 0,
        a: parseFloat(el.style.getPropertyValue('--r')) || 0,
        alive: true
      };
      el.style.left = '0';
      el.style.top = '0';
      return b;
    });

    var gx = 0, gy = 1;   // current gravity direction (screen space)
    var tx = 0, ty = 1;   // tilt target, eased towards
    var motion = false;   // listening for device events
    var live = false;     // ...and actually receiving tilt readings

    /* ---------- simulation ---------- */
    function step(h) {
      var i, j, b, c;
      gx += (tx - gx) * 0.02;
      gy += (ty - gy) * 0.02;

      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        if (!b.alive) continue;
        b.vx = (b.vx + gx * G * h) * DAMP;
        b.vy = (b.vy + gy * G * h) * DAMP;
        b.x += b.vx * h;
        b.y += b.vy * h;

        // Glass wall: push back inside, bounce the normal velocity, roll.
        var dx = b.x - 0.5, dy = b.y - 0.5;
        var d = Math.hypot(dx, dy);
        if (d > WALL) {
          var nx = dx / d, ny = dy / d;
          b.x = 0.5 + nx * WALL;
          b.y = 0.5 + ny * WALL;
          var vn = b.vx * nx + b.vy * ny;
          if (vn > 0) {
            b.vx -= (1 + E_WALL) * vn * nx;
            b.vy -= (1 + E_WALL) * vn * ny;
            hit(vn);
          }
          b.vx *= 0.99;
          b.vy *= 0.99;
        }
      }

      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        if (!b.alive) continue;
        for (j = i + 1; j < balls.length; j++) {
          c = balls[j];
          if (!c.alive) continue;
          var ex = c.x - b.x, ey = c.y - b.y;
          var dist = Math.hypot(ex, ey);
          if (dist >= 2 * R) continue;
          if (dist < 1e-6) { ex = rand(-1, 1); ey = rand(-1, 1); dist = Math.hypot(ex, ey); }
          var mx = ex / dist, my = ey / dist;
          var push = (2 * R - dist) / 2;
          b.x -= mx * push; b.y -= my * push;
          c.x += mx * push; c.y += my * push;
          var rel = (c.vx - b.vx) * mx + (c.vy - b.vy) * my;
          if (rel < 0) {
            var k = -(1 + E_BALL) * rel / 2;
            b.vx -= k * mx; b.vy -= k * my;
            c.vx += k * mx; c.vy += k * my;
            hit(-rel);
          }
        }
      }
    }

    // Spin only from real travel, and let resting capsules come to a stop
    // instead of trembling against each other under gravity.
    function settle(h) {
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.alive) continue;
        var v = Math.hypot(b.vx, b.vy);
        if (v < REST) { b.vx *= 0.8; b.vy *= 0.8; }
        if (v > ROLL) b.a += (b.vx * h / R) / D2R;
      }
    }

    function hit(speed) {
      if (speed > 0.5 && opts.onHit) opts.onHit(speed);
    }

    function render() {
      var size = pile.clientWidth;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.alive) continue;
        b.el.style.transform =
          'translate(' + ((b.x - R) * size).toFixed(1) + 'px,' + ((b.y - R) * size).toFixed(1) + 'px) ' +
          'rotate(' + b.a.toFixed(1) + 'deg)';
      }
    }

    var last = 0;
    function frame(t) {
      var dt = last ? Math.min((t - last) / 1000, 0.033) : 0.016;
      last = t;
      for (var s = 0; s < 4; s++) { step(dt / 4); settle(dt / 4); }
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ---------- phone tilt + shake ---------- */
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      live = true;
      // Gravity projected onto the screen plane, in device axes (x right, y down).
      var sx = Math.sin(e.gamma * D2R) * Math.cos(e.beta * D2R);
      var sy = Math.sin(e.beta * D2R);
      // ...then rotated into screen axes when the phone is held sideways.
      var ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * D2R;
      var nx = sx * Math.cos(ang) - sy * Math.sin(ang);
      var ny = sx * Math.sin(ang) + sy * Math.cos(ang) + TILT_BIAS;
      if (Math.hypot(nx - tx, ny - ty) < TILT_DEADBAND) return;
      tx = nx;
      ty = ny;
    }

    var prev = null;
    var lastShake = 0;
    function onMotion(e) {
      var m;
      var a = e.acceleration;
      if (a && a.x != null) {
        m = Math.hypot(a.x, a.y, a.z);
      } else {
        // No gravity-free reading: use the jolt between two samples instead.
        var g = e.accelerationIncludingGravity;
        if (!g || g.x == null) return;
        m = prev ? Math.hypot(g.x - prev.x, g.y - prev.y, g.z - prev.z) : 0;
        prev = { x: g.x, y: g.y, z: g.z };
      }
      var now = Date.now();
      if (m < SHAKE_AT || now - lastShake < 90) return;
      lastShake = now;
      var strength = Math.min((m - SHAKE_AT) * 0.12 + 0.6, 2.6);
      kick(strength);
      if (opts.onShake) opts.onShake(strength);
    }

    function listen() {
      if (motion) return;
      motion = true;
      window.addEventListener('deviceorientation', onOrient);
      window.addEventListener('devicemotion', onMotion);
    }

    // iOS only hands out motion data after a tap asks for it; Android just does.
    function enableMotion() {
      if (opts.still) return;
      var asks = [];
      [window.DeviceOrientationEvent, window.DeviceMotionEvent].forEach(function (E) {
        if (E && typeof E.requestPermission === 'function') asks.push(E.requestPermission());
      });
      if (!asks.length) { listen(); return; }
      Promise.all(asks).then(function (res) {
        if (res.every(function (r) { return r === 'granted'; })) listen();
      }).catch(function () {});
    }

    if (!opts.still) {
      if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) listen();
      document.addEventListener('click', enableMotion, { once: true });
    }

    /* ---------- API ---------- */
    function kick(strength) {
      if (opts.still) return;
      strength = strength || 1;
      balls.forEach(function (b) {
        if (!b.alive) return;
        b.vx += rand(-1, 1) * strength;
        b.vy -= rand(0.3, 1.2) * strength;
      });
    }

    // Lowest capsule (nearest the chute) that passes the filter leaves the sim.
    function take(filter) {
      var pick = null;
      balls.forEach(function (b) {
        if (b.alive && filter(b.el) && (!pick || b.y > pick.y)) pick = b;
      });
      if (!pick) return null;
      pick.alive = false;
      return pick.el;
    }

    return {
      kick: kick,
      take: take,
      hasMotion: function () { return live; }
    };
  };
})();
