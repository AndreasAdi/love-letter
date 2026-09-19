/* =========================================================================
   Floating pastel-heart + sparkle background, rendered with three.js.
   Exposes window.LOVE.burst(clientX, clientY, count) for confetti moments.
   ========================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('bg');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfdeefa, 15, 32);

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c9ff, 1.1));
  var sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(4, 8, 10);
  scene.add(sun);

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- heart geometry (classic bezier heart, extruded) ---------- */
  function makeHeartGeometry() {
    var s = new THREE.Shape();
    s.moveTo(0.5, 0.5);
    s.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    s.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    s.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    s.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    s.bezierCurveTo(1.6, 0.7, 1.6, 0, 1, 0);
    s.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);
    var geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.45, bevelEnabled: true, bevelSegments: 3,
      bevelSize: 0.12, bevelThickness: 0.12, curveSegments: 24
    });
    geo.center();
    geo.rotateZ(Math.PI); // raw shape points down; flip upright
    return geo;
  }

  // Candy-shop pastels: bubblegum, mint, butter, lilac, sky.
  var PALETTE = ['#ff8fb1', '#ffb3c9', '#7fdcc4', '#ffd45c', '#c7a8ff', '#8fcaff'];
  var heartGeo = makeHeartGeometry();
  var heartMats = PALETTE.map(function (c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 });
  });

  var BOUNDS = { x: 15, top: 11, bottom: -12, zNear: 3, zFar: -12 };

  /* ---------- drifting heart field ---------- */
  var hearts = [];
  var HEART_COUNT = reduceMotion ? 16 : 48;
  for (var i = 0; i < HEART_COUNT; i++) {
    var m = new THREE.Mesh(heartGeo, heartMats[i % heartMats.length]);
    var size = rand(0.12, 0.42);
    m.scale.setScalar(size);
    m.position.set(rand(-BOUNDS.x, BOUNDS.x), rand(BOUNDS.bottom, BOUNDS.top), rand(BOUNDS.zFar, BOUNDS.zNear));
    m.rotation.set(rand(-0.4, 0.4), rand(0, Math.PI * 2), rand(-0.2, 0.2));
    hearts.push({
      m: m,
      rise: rand(0.25, 0.9) * (reduceMotion ? 0.35 : 1),
      swayAmp: rand(0.3, 1.1),
      swaySpd: rand(0.4, 1.1),
      phase: rand(0, Math.PI * 2),
      spin: rand(-0.6, 0.6),
      baseX: m.position.x
    });
    scene.add(m);
  }

  /* ---------- sparkles ---------- */
  function makeSparkleTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,210,228,0.85)');
    grad.addColorStop(1, 'rgba(255,210,228,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var SPARKS = reduceMotion ? 50 : 150;
  var sparkPos = new Float32Array(SPARKS * 3);
  for (var j = 0; j < SPARKS; j++) {
    sparkPos[j * 3] = rand(-BOUNDS.x, BOUNDS.x);
    sparkPos[j * 3 + 1] = rand(BOUNDS.bottom, BOUNDS.top);
    sparkPos[j * 3 + 2] = rand(BOUNDS.zFar, BOUNDS.zNear);
  }
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  var sparkMat = new THREE.PointsMaterial({
    size: 0.45, map: makeSparkleTexture(), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8
  });
  scene.add(new THREE.Points(sparkGeo, sparkMat));

  /* ---------- burst / confetti pool ---------- */
  var burstPool = [];
  function getBurstHeart() {
    for (var k = 0; k < burstPool.length; k++) {
      if (burstPool[k].life <= 0) return burstPool[k];
    }
    var mat = new THREE.MeshStandardMaterial({ color: PALETTE[0], roughness: 0.5, transparent: true });
    var bm = new THREE.Mesh(heartGeo, mat);
    scene.add(bm);
    var item = { m: bm, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, maxLife: 1 };
    burstPool.push(item);
    return item;
  }

  var _v = new THREE.Vector3();
  function clientToWorld(cx, cy) {
    _v.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, 0.5).unproject(camera);
    _v.sub(camera.position).normalize();
    var dist = -camera.position.z / _v.z;
    return camera.position.clone().addScaledVector(_v, dist);
  }

  function burst(cx, cy, count) {
    count = count || 26;
    if (reduceMotion) count = Math.min(count, 8);
    var origin = clientToWorld(cx, cy);
    for (var n = 0; n < count; n++) {
      var b = getBurstHeart();
      b.m.material.color.set(PALETTE[Math.floor(rand(0, PALETTE.length))]);
      b.m.material.opacity = 1;
      b.m.position.copy(origin);
      b.m.scale.setScalar(rand(0.1, 0.26));
      b.vel.set(rand(-3.4, 3.4), rand(1.5, 6.5), rand(-1.5, 1.5));
      b.spin.set(rand(-4, 4), rand(-4, 4), rand(-4, 4));
      b.life = b.maxLife = rand(1.1, 1.8);
    }
  }

  /* ---------- gentle mouse parallax ---------- */
  var px = 0, py = 0;
  window.addEventListener('pointermove', function (e) {
    px = (e.clientX / window.innerWidth - 0.5) * 2;
    py = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var clock = new THREE.Clock();
  var t = 0;
  renderer.setAnimationLoop(function () {
    var dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    var i, h;
    for (i = 0; i < hearts.length; i++) {
      h = hearts[i];
      h.m.position.y += h.rise * dt;
      h.m.position.x = h.baseX + Math.sin(t * h.swaySpd + h.phase) * h.swayAmp;
      h.m.rotation.y += h.spin * dt;
      if (h.m.position.y > BOUNDS.top) {
        h.m.position.y = BOUNDS.bottom;
        h.baseX = rand(-BOUNDS.x, BOUNDS.x);
      }
    }

    for (i = 0; i < burstPool.length; i++) {
      var b = burstPool[i];
      if (b.life <= 0) continue;
      b.life -= dt;
      b.vel.y -= 3.4 * dt;
      b.m.position.addScaledVector(b.vel, dt);
      b.m.rotation.x += b.spin.x * dt;
      b.m.rotation.y += b.spin.y * dt;
      b.m.rotation.z += b.spin.z * dt;
      b.m.material.opacity = Math.max(b.life / b.maxLife, 0);
    }

    sparkMat.opacity = 0.55 + 0.3 * Math.sin(t * 1.6);

    camera.position.x += (px * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (-py * 1.0 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  });

  window.LOVE = { burst: burst };
})();
