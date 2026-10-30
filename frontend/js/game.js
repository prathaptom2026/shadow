/* =====================================================================
   BATTLE ZONE ROYALE  -  single-player battle royale (Three.js)
   Screens: Splash -> Lobby (map select) -> Match
   ===================================================================== */
(function () {
'use strict';

/* ------------------------------ helpers ------------------------------ */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a, b) => a + Math.random() * (b - a);
function mkRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------ data ------------------------------ */
const MAPS = {
  erangel: {
    name: 'ERANGEL', seed: 11, skyTop: 0x4f98d8, skyBot: 0xcfe6f5, fog: 0xc4dcee, fogFar: 380,
    gA: 0x5b8a35, gB: 0x7aa845, sand: 0xcdbd8e, dirt: 0x8d805f, amp: 4.5, freq: 0.011, towns: 6,
    houses: [0xcfc8b8, 0xb9ab96, 0xc2a98a], roof: 0x9a3b2c, floor: 0x6b6355,
    tree: { kind: 'pine', count: 430, trunk: 0x5a3d25, crown: 0x1f5a2a, h: [3, 6] },
    rocks: 55, rock: 0x7d8084, sun: 0xfff1cf, sunI: 0.95, hemi: [0xbcd8f0, 0x4a5a3a, 0.75], water: 0x2c6fa8
  },
  miramar: {
    name: 'MIRAMAR', seed: 23, skyTop: 0xd9884a, skyBot: 0xf6dfae, fog: 0xe8c995, fogFar: 420,
    gA: 0xcfa66a, gB: 0xdcbf82, sand: 0xe2c88f, dirt: 0xa98657, amp: 3.0, freq: 0.008, towns: 6,
    houses: [0xe3cca4, 0xd5b78c, 0xcba57d], roof: 0xa5502d, floor: 0x8a6e4c,
    tree: { kind: 'cactus', count: 170, trunk: 0x4f8a3a, crown: 0x4f8a3a, h: [1.8, 3.6] },
    rocks: 150, rock: 0xa17f59, sun: 0xffe2b0, sunI: 1.05, hemi: [0xf3d9a8, 0x8a6a3a, 0.8], water: 0x3a8aa0
  },
  sanhok: {
    name: 'SANHOK', seed: 37, skyTop: 0x5aa88f, skyBot: 0xd2ebdc, fog: 0xa2cdb6, fogFar: 300,
    gA: 0x2f6b2f, gB: 0x429044, sand: 0xb7ad78, dirt: 0x6b5c3a, amp: 7.5, freq: 0.014, towns: 5,
    houses: [0x8a6a45, 0x9b7b52, 0x7a5a3a], roof: 0x7d8a3a, floor: 0x4f3c27,
    tree: { kind: 'jungle', count: 900, trunk: 0x6b4a2b, crown: 0x1d7a34, h: [4, 8] },
    rocks: 80, rock: 0x6c7068, sun: 0xf3ffd8, sunI: 0.8, hemi: [0xb6e0c8, 0x2a4a2a, 0.8], water: 0x2a8a8a
  }
};

// m: model dims  bl body length, bh body height, bar barrel length, stock, mag length, scope length
const WEAPONS = {
  p18:   { name: 'P18C',  type: 'PISTOL', dmg: 24, rate: 0.2,  auto: false, mag: 15, reload: 1.3, spread: 0.010, recoil: 0.014, bloom: 0.5, range: 60, color: 0xbfc4cc, snd: 1, ads: 58,
           m: { bl: 0.2, bh: 0.08, bar: 0.06, stock: 0, mag: 0.1, scope: 0, color: 0x2a2d33 } },
  ump:   { name: 'UMP45', type: 'SMG',    dmg: 21, rate: 0.085, auto: true, mag: 30, reload: 1.9, spread: 0.014, recoil: 0.010, bloom: 0.35, range: 70, color: 0x4aa3ff, snd: 2, ads: 52,
           m: { bl: 0.38, bh: 0.09, bar: 0.1, stock: 0.15, mag: 0.14, scope: 0, color: 0x23272e } },
  akm:   { name: 'AKM',   type: 'AR',     dmg: 33, rate: 0.1,  auto: true, mag: 30, reload: 2.3, spread: 0.016, recoil: 0.020, bloom: 0.6, range: 120, color: 0xffb347, snd: 3, ads: 44, sightName: 'RED DOT',
           m: { bl: 0.5, bh: 0.1, bar: 0.28, stock: 0.28, mag: 0.18, scope: 0, color: 0x5a3b22 } },
  m416:  { name: 'M416',  type: 'AR',     dmg: 28, rate: 0.085, auto: true, mag: 30, reload: 2.1, spread: 0.011, recoil: 0.014, bloom: 0.45, range: 130, color: 0xb06cff, snd: 3, fp: true, zooms: [22], zoomNames: ['4x'],
           m: { bl: 0.5, bh: 0.1, bar: 0.22, stock: 0.24, mag: 0.18, scope: 0.12, color: 0x2b2f36 } },
  kar98: { name: 'KAR98K', type: 'SNIPER', dmg: 88, rate: 1.4, auto: false, mag: 5, reload: 3.0, spread: 0.002, recoil: 0.045, bloom: 0.2, range: 300, color: 0xff5555, snd: 4, fp: true, zooms: [18, 8], zoomNames: ['4x', '8x'],
           m: { bl: 0.65, bh: 0.08, bar: 0.5, stock: 0.35, mag: 0.06, scope: 0.3, color: 0x4a3420 } }
};
const LOOT_TABLE = [['p18', 28], ['ump', 22], ['akm', 20], ['m416', 18], ['kar98', 12]];
function pickWeapon(tbl) {
  tbl = tbl || LOOT_TABLE;
  let sum = 0; tbl.forEach(t => sum += t[1]);
  let r = Math.random() * sum;
  for (const t of tbl) { r -= t[1]; if (r <= 0) return t[0]; }
  return tbl[0][0];
}
const BOT_NAMES = ['Rex', 'Viper', 'Ghost', 'Blaze', 'Hunter', 'Raven', 'Shadow', 'Nova', 'Titan', 'Fang', 'Storm', 'Ace', 'Jinx', 'Wolf'];
const OUTFITS = [
  { suit: 0x3f5a3a, pants: 0x2d3a2a, vest: 0x4a4f3a, helmet: 0x3a4a33, tint: 0x86a070 },
  { suit: 0x8a6a3a, pants: 0x6a5230, vest: 0x5b4a2e, helmet: 0x7a6038, tint: 0xc8aa78 },
  { suit: 0x2f4a78, pants: 0x1f2f50, vest: 0x2a3550, helmet: 0x2a3d63, tint: 0x7090c8 },
  { suit: 0x6b2d2d, pants: 0x3d1d1d, vest: 0x40282a, helmet: 0x552626, tint: 0xc87474 }
];

/* ------------------------------ audio ------------------------------ */
let AC = null, noiseBuf = null;
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    if (AC) {
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function sfxShot(kind, vol) {
  const a = audio(); if (!a || vol < 0.02) return;
  const t = a.currentTime;
  const src = a.createBufferSource(); src.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.value = { 1: 2600, 2: 3200, 3: 2200, 4: 1500 }[kind] || 2500;
  const g = a.createGain();
  const dur = kind === 4 ? 0.45 : kind === 1 ? 0.12 : 0.18;
  g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t, Math.random() * 0.2, dur + 0.05);
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(kind === 4 ? 120 : 160, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  const g2 = a.createGain(); g2.gain.setValueAtTime(vol * 0.8, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(g2); g2.connect(a.destination); o.start(t); o.stop(t + 0.16);
}
function beep(f1, f2, dur, vol, type) {
  const a = audio(); if (!a) return;
  const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.linearRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfxPick = () => { beep(520, 780, 0.12, 0.08); setTimeout(() => beep(780, 1040, 0.12, 0.08), 90); };
const sfxHit = (head) => beep(head ? 1500 : 1000, 0, 0.06, 0.1, 'triangle');
const sfxHurt = () => beep(110, 60, 0.18, 0.2, 'sawtooth');
const sfxReload = () => { beep(300, 0, 0.05, 0.08); setTimeout(() => beep(420, 0, 0.05, 0.08), 600); };
const sfxEmpty = () => beep(200, 0, 0.04, 0.08);

/* ------------------------------ renderer ------------------------------ */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const matCache = {};
function M(color) { return matCache[color] || (matCache[color] = new THREE.MeshLambertMaterial({ color })); }
function box(w, h, l, mat, x, y, z, parent, cast) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
  m.position.set(x, y, z); m.castShadow = cast !== false; if (parent) parent.add(m); return m;
}

/* ------------------------------ weapon model ------------------------------ */
function makeGun(type) {
  const d = WEAPONS[type].m, g = new THREE.Group();
  const mat = M(d.color), dark = M(0x15171b);
  box(0.07, d.bh, d.bl, mat, 0, 0, 0.08 - d.bl / 2, g);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, d.bar, 8), dark);
  bar.rotation.x = Math.PI / 2; bar.position.set(0, d.bh * 0.15, 0.08 - d.bl - d.bar / 2); bar.castShadow = true; g.add(bar);
  box(0.05, 0.13, 0.06, dark, 0, -d.bh / 2 - 0.06, 0.04, g);
  box(0.045, d.mag, 0.07, dark, 0, -d.bh / 2 - d.mag / 2, 0.08 - d.bl * 0.55, g);
  if (d.stock) box(0.05, 0.11, d.stock, mat, 0, -0.01, 0.08 + d.stock / 2, g);
  if (d.scope) box(0.04, 0.05, d.scope, dark, 0, d.bh / 2 + 0.04, 0.08 - d.bl * 0.5, g);
  const mz = 0.08 - d.bl - d.bar;
  const fm = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flash = new THREE.Group();
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), fm), p2 = p1.clone(); p2.rotation.z = Math.PI / 2;
  const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), fm); p3.rotation.y = Math.PI / 2;
  flash.add(p1, p2, p3); flash.position.z = mz - 0.12; flash.visible = false; g.add(flash);
  const gripR = V3(0, -d.bh / 2 - 0.07, 0.04);
  const gripL = d.bl > 0.3 ? V3(0, -d.bh / 2 - 0.035, 0.08 - d.bl * 0.82) : V3(-0.035, -d.bh / 2 - 0.075, 0.03);
  g.userData = { flash, muzzleZ: mz, type, gripR, gripL };
  return g;
}

/* ------------------------------ character rig ------------------------------ */
function makeChar(o) {
  const root = new THREE.Group(), body = new THREE.Group(), upper = new THREE.Group();
  root.add(body); body.add(upper);
  const suit = M(o.suit), pants = M(o.pants), skin = M(o.skin || 0xd9a77a), helm = M(o.helmet), vest = M(o.vest), dark = M(0x111214);
  const hit = [];
  const tag = (m, mult, head) => { m.userData.mult = mult; m.userData.head = !!head; hit.push(m); return m; };
  tag(box(0.5, 0.6, 0.28, suit, 0, 1.2, 0, upper), 1);
  box(0.54, 0.38, 0.32, vest, 0, 1.2, 0, upper);
  box(0.4, 0.5, 0.2, vest, 0, 1.2, 0.24, upper);
  tag(box(0.26, 0.28, 0.26, skin, 0, 1.68, 0, upper), 2.3, true);
  box(0.31, 0.15, 0.31, helm, 0, 1.8, 0, upper);
  box(0.2, 0.05, 0.02, dark, 0, 1.7, -0.135, upper);
  const mkLeg = (x) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.9, 0); body.add(hip);
    tag(box(0.2, 0.45, 0.22, pants, 0, -0.225, 0, hip), 0.7);
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    tag(box(0.19, 0.45, 0.2, pants, 0, -0.225, 0, knee), 0.7);
    box(0.21, 0.1, 0.3, dark, 0, -0.45, -0.04, knee);
    return { hip, knee };
  };
  const legL = mkLeg(-0.13), legR = mkLeg(0.13);
  const mkArm = (x) => {
    const sh = new THREE.Group(); sh.position.set(x, 1.45, 0); upper.add(sh);
    tag(box(0.13, 0.56, 0.13, suit, 0, -0.28, 0, sh), 0.7);
    box(0.11, 0.1, 0.11, skin, 0, -0.6, 0, sh);
    return sh;
  };
  const armL = mkArm(-0.32), armR = mkArm(0.32);
  const gunHolder = new THREE.Group(); gunHolder.position.set(0.1, 1.38, -0.05); upper.add(gunHolder);

  const c = {
    root, body, upper, hit, gunHolder, gun: null, phase: Math.random() * 6, gunAmt: 0, deadT: 0, dead: false,
    setGun(type) {
      if (c.gun) { gunHolder.remove(c.gun); c.gun = null; }
      if (type) { c.gun = makeGun(type); gunHolder.add(c.gun); }
    },
    update(dt, st) {
      const s = st.s || 0, speed = st.speed || 0;
      const crouch = s <= 1 ? s : Math.max(0, 2 - s), prone = s > 1 ? s - 1 : 0;
      c.phase += dt * speed * 2.1;
      const sw = Math.sin(c.phase) * clamp(speed / 4, 0, 1.25) * 0.75 * (1 - prone);
      const hipY = lerp(0.9, 0.57, crouch);
      upper.position.y = hipY - 0.9;
      legL.hip.position.y = legR.hip.position.y = hipY;
      const a = crouch * 1.3;
      legL.hip.rotation.x = a + sw; legR.hip.rotation.x = a - sw;
      legL.knee.rotation.x = -a - Math.max(0, -sw) * 0.9; legR.knee.rotation.x = -a - Math.max(0, sw) * 0.9;
      const gt = st.gun ? 1 : 0; c.gunAmt += (gt - c.gunAmt) * Math.min(1, dt * 9);
      const p = clamp(st.pitch || 0, -1.1, 1.2);
      const g = lerp(p, Math.PI / 2 + p, prone);
      gunHolder.rotation.x = g;
      armR.rotation.x = lerp(sw * 1.0, Math.PI / 2 + g, c.gunAmt);
      armL.rotation.x = lerp(-sw * 1.0, Math.PI / 2 + g, c.gunAmt);
      armR.position.x = lerp(0.32, 0.16, c.gunAmt); armL.position.x = lerp(-0.32, 0.0, c.gunAmt);
      if (c.dead) {
        c.deadT += dt;
        const k = smooth(0, 0.45, c.deadT);
        body.rotation.x = k * Math.PI / 2; body.position.y = 0.36 * k;
      } else {
        body.rotation.x = -Math.PI / 2 * prone; body.position.y = 0.15 * prone;
      }
    }
  };
  return c;
}

/* ------------------------------ REAL HUMAN MODEL (animated GLB) ------------------------------ */
const HUMAN = { gltf: null, failed: false };
function loadHuman(done) {
  try {
    const bin = atob(window.SOLDIER_B64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    new GLTFLoader().parse(buf.buffer, '', (g) => {
      // desaturate the armour texture so outfit tints (green / desert / navy / red) read properly
      g.scene.traverse(n => {
        if (n.isMesh && n.material && n.material.map && n.material.map.image && !/visor/i.test(n.name)) {
          try {
            const tex = n.material.map, img = tex.image, cv = document.createElement('canvas');
            cv.width = img.width; cv.height = img.height;
            const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
            const d = cx.getImageData(0, 0, cv.width, cv.height), a = d.data;
            for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) * 1.3 + 25); a[i] = a[i + 1] = a[i + 2] = l; }
            cx.putImageData(d, 0, 0);
            const t = new THREE.CanvasTexture(cv); t.flipY = tex.flipY; t.encoding = tex.encoding; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 4;
            n.material.map = t; n.material.needsUpdate = true;
          } catch (e) { /* keep original texture */ }
        }
      });
      HUMAN.gltf = g; done(true);
    }, () => { HUMAN.failed = true; done(false); });
  } catch (e) { HUMAN.failed = true; done(false); }
}
const T1 = V3(), T2 = V3(), T3 = V3(), T4 = V3(), SC = V3();
const QA = new THREE.Quaternion(), QB = new THREE.Quaternion(), QC = new THREE.Quaternion();
// rotate a bone so that (bone -> child) points at target (world space)
function aimBone(bone, child, target) {
  T1.setFromMatrixPosition(bone.matrixWorld); T2.setFromMatrixPosition(child.matrixWorld);
  T2.sub(T1).normalize(); T3.copy(target).sub(T1).normalize();
  QA.setFromUnitVectors(T2, T3);
  bone.matrixWorld.decompose(T4, QB, SC); bone.parent.matrixWorld.decompose(T4, QC, SC);
  QB.premultiply(QA); bone.quaternion.copy(QC.invert().multiply(QB));
  bone.updateMatrixWorld(true);
}
function rotWorld(bone, axis, ang) {
  QA.setFromAxisAngle(axis, ang);
  bone.matrixWorld.decompose(T4, QB, SC); bone.parent.matrixWorld.decompose(T4, QC, SC);
  QB.premultiply(QA); bone.quaternion.copy(QC.invert().multiply(QB));
  bone.updateMatrixWorld(true);
}
const IP0 = V3(), IP1 = V3(), IP2 = V3(), IDIR = V3(), IPERP = V3(), IKT = V3();
function ik2(b0, b1, b2, target, pole) {
  IP0.setFromMatrixPosition(b0.matrixWorld); IP1.setFromMatrixPosition(b1.matrixWorld); IP2.setFromMatrixPosition(b2.matrixWorld);
  const l1 = IP0.distanceTo(IP1), l2 = IP1.distanceTo(IP2);
  const d = clamp(IP0.distanceTo(target), 0.05, l1 + l2 - 0.005);
  IDIR.copy(target).sub(IP0).normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  IPERP.copy(pole).addScaledVector(IDIR, -pole.dot(IDIR));
  if (IPERP.lengthSq() < 1e-6) IPERP.set(0, 1, 0); IPERP.normalize();
  IKT.copy(IP0).addScaledVector(IDIR, a).addScaledVector(IPERP, h);
  aimBone(b0, b1, IKT);
  aimBone(b1, b2, target);
}
const BONE_NAMES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

function makeHuman(o) {
  const root = new THREE.Group(), body = new THREE.Group(), holder = new THREE.Group(), gunHolder = new THREE.Group();
  root.add(body); body.add(holder); body.add(gunHolder);
  const model = SkeletonUtils.clone(HUMAN.gltf.scene);
  holder.scale.setScalar(o.scale || 1); holder.add(model);   // this model already faces -z (= game forward)
  model.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true; n.frustumCulled = false; n.material = n.material.clone();
      if (n.material.metalness !== undefined) n.material.metalness = Math.min(n.material.metalness, 0.25);
      if (o.tint !== undefined && !/visor/i.test(n.name)) n.material.color.setHex(o.tint);
    }
  });
  const B = {}; BONE_NAMES.forEach(n => { B[n] = model.getObjectByName('mixamorig' + n); });
  const mixer = new THREE.AnimationMixer(model);
  const find = n => THREE.AnimationClip.findByName(HUMAN.gltf.animations, n);
  const A = { idle: mixer.clipAction(find('Idle')), walk: mixer.clipAction(find('Walk')), run: mixer.clipAction(find('Run')) };
  Object.keys(A).forEach(k => { A[k].play(); A[k].setEffectiveWeight(0); });
  A.idle.setEffectiveWeight(1); A.idle.time = Math.random() * 1.9;
  const w = { idle: 1, walk: 0, run: 0 };

  // hit spheres (follow the bones, so head/body/limb hit detection works in any pose)
  const hit = [];
  const hdefs = [['Head', null, 2.3, 0.13, true], ['Spine2', null, 1, 0.23], ['Spine', null, 1, 0.2], ['Hips', null, 1, 0.19],
    ['LeftUpLeg', 'LeftLeg', 0.7, 0.12], ['LeftLeg', 'LeftFoot', 0.7, 0.1], ['RightUpLeg', 'RightLeg', 0.7, 0.12], ['RightLeg', 'RightFoot', 0.7, 0.1],
    ['LeftArm', 'LeftForeArm', 0.7, 0.085], ['LeftForeArm', 'LeftHand', 0.7, 0.07], ['RightArm', 'RightForeArm', 0.7, 0.085], ['RightForeArm', 'RightHand', 0.7, 0.07]];
  const sgeo = new THREE.SphereGeometry(1, 8, 6), smat = new THREE.MeshBasicMaterial({ visible: false });
  const hmeta = hdefs.map(d => {
    const m = new THREE.Mesh(sgeo, smat); m.scale.setScalar(d[3] * (o.scale || 1)); m.userData.mult = d[2]; m.userData.head = !!d[4];
    m.matrixAutoUpdate = false; body.add(m); hit.push(m); return { m, a: B[d[0]], b: d[1] ? B[d[1]] : null, head: !!d[4] };
  });
  const hp = V3(), hp2 = V3();
  const savedQ = {};

  const c = {
    root, body, hit, gunHolder, gun: null, gunAmt: 0, deadT: 0, dead: false, phase: 0, upper: null,
    setGun(type) {
      if (c.gun) { gunHolder.remove(c.gun); c.gun = null; }
      if (type) { c.gun = makeGun(type); gunHolder.add(c.gun); }
    },
    update(dt, st) {
      const s = st.s || 0, speed = st.speed || 0, lean = st.lean || 0, pitch = clamp(st.pitch || 0, -1.1, 1.2), far = !!st.far;
      const crouch = s <= 1 ? s : Math.max(0, 2 - s), prone = s > 1 ? s - 1 : 0;
      // whole-body pose (prone / dead)
      if (c.dead) { c.deadT += dt; const k = smooth(0, 0.5, c.deadT); body.rotation.x = k * Math.PI / 2; body.position.y = 0.3 * k; if (c.gun) c.gun.visible = false; }
      else { body.rotation.x = -Math.PI / 2 * prone; body.position.y = 0.2 * prone; }
      if (c.dead && c.deadT > 1.8) return;
      // gun holder (chest height, follows crouch / prone / lean)
      c.gunAmt += ((st.gun && !c.dead ? 1 : 0) - c.gunAmt) * Math.min(1, dt * 9);
      const g = lerp(pitch, Math.PI / 2 + pitch, prone);
      gunHolder.position.set(0.1 + lean * 0.4, lerp(lerp(1.3, 0.88, crouch), 1.5, prone) - Math.abs(lean) * 0.05, lerp(-0.18, 0.08, prone));
      gunHolder.rotation.set(g, 0, -lean * 0.38 * (1 - prone));
      root.updateMatrixWorld(true);
      // animation blend
      let ti = 0, tw = 0, tr = 0;
      if (c.dead || speed < 0.2) ti = 1;
      else if (speed < 2.6) { const k = clamp((speed - 0.2) / 1.0, 0, 1); ti = 1 - k; tw = k; }
      else if (speed < 4.2) { const k = (speed - 2.6) / 1.6; tw = 1 - k; tr = k; }
      else tr = 1;
      const f = Math.min(1, dt * 9);
      w.idle += (ti - w.idle) * f; w.walk += (tw - w.walk) * f; w.run += (tr - w.run) * f;
      A.idle.setEffectiveWeight(w.idle); A.walk.setEffectiveWeight(w.walk); A.run.setEffectiveWeight(w.run);
      const dir = (st.dirZ !== undefined && st.dirZ < -0.3) ? -1 : 1;
      A.walk.timeScale = clamp(speed / 1.6, 0.5, 1.9) * dir; A.run.timeScale = clamp(speed / 4.3, 0.7, 1.7) * dir;
      A.idle.timeScale = prone > 0.5 ? 0.0 : 1;
      mixer.update(dt);
      model.updateMatrixWorld(true);
      if (!c.dead) {
        const yaw = root.rotation.y;
        const AXR = T_AXR.set(Math.cos(yaw), 0, -Math.sin(yaw)), AXF = T_AXF.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        // crouch: lower pelvis, keep feet planted with leg IK
        if (crouch > 0.02 && !far) {
          const fl = FL.setFromMatrixPosition(B.LeftFoot.matrixWorld).clone(), fr = FR.setFromMatrixPosition(B.RightFoot.matrixWorld).clone();
          HP.setFromMatrixPosition(B.Hips.matrixWorld); HP.y -= 0.46 * crouch;
          B.Hips.position.copy(B.Hips.parent.worldToLocal(HP)); B.Hips.updateMatrixWorld(true);
          POLE.copy(AXF).multiplyScalar(1).add(V3(0, 0.1, 0));
          ik2(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, fl, POLE);
          ik2(B.RightUpLeg, B.RightLeg, B.RightFoot, fr, POLE);
        }
        // spine: aim pitch + lean (peek) + crouch forward lean
        const pa = (pitch - 0.14 * crouch) * 0.3, rl = lean * 0.14 * (1 - prone);
        ['Spine', 'Spine1', 'Spine2'].forEach(n => { if (Math.abs(pa) > 1e-3) rotWorld(B[n], AXR, pa); if (Math.abs(rl) > 1e-3) rotWorld(B[n], AXF, rl); });
        // arms IK onto the weapon
        if (c.gunAmt > 0.02 && c.gun && !far) {
          const gd = c.gun.userData;
          const gr = c.gun.localToWorld(gd.gripR.clone()), gl = c.gun.localToWorld(gd.gripL.clone());
          ['RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm'].forEach(n => { savedQ[n] = B[n].quaternion.clone(); });
          POLE.set(0, -0.8, 0).addScaledVector(AXR, 0.55); ik2(B.RightArm, B.RightForeArm, B.RightHand, gr, POLE);
          POLE.set(0, -0.8, 0).addScaledVector(AXR, -0.55); ik2(B.LeftArm, B.LeftForeArm, B.LeftHand, gl, POLE);
          if (c.gunAmt < 0.98) {
            ['RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm'].forEach(n => { QA.copy(savedQ[n]).slerp(B[n].quaternion, c.gunAmt); B[n].quaternion.copy(QA); });
            B.RightArm.updateMatrixWorld(true); B.LeftArm.updateMatrixWorld(true);
          }
        }
      }
      // hit spheres follow bones
      if (!c.dead) {
        body.updateMatrixWorld(false);
        hmeta.forEach(h => {
          hp.setFromMatrixPosition(h.a.matrixWorld);
          if (h.b) { hp2.setFromMatrixPosition(h.b.matrixWorld); hp.add(hp2).multiplyScalar(0.5); }
          else if (h.head) hp.y += 0.1;
          body.worldToLocal(hp); h.m.position.copy(hp); h.m.updateMatrix(); h.m.matrixWorld.multiplyMatrices(body.matrixWorld, h.m.matrix);
        });
      }
    }
  };
  return c;
}
const T_AXR = V3(), T_AXF = V3(), FL = V3(), FR = V3(), HP = V3(), POLE = V3();
function newChar(o) { return (HUMAN.gltf && !HUMAN.failed) ? makeHuman(o) : makeChar(o); }

/* ===================================================================
   LOBBY SCENE
   =================================================================== */
const lobby = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(32, 1, 0.1, 100), char: null, t: 0, outfit: 0 };
(function () {
  const s = lobby.scene; s.background = new THREE.Color(0x0a1018);
  // backdrop texture
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const cx = cv.getContext('2d');
  let gr = cx.createRadialGradient(512, 300, 20, 512, 300, 520);
  gr.addColorStop(0, '#2b4258'); gr.addColorStop(0.5, '#14212f'); gr.addColorStop(1, '#070b11');
  cx.fillStyle = gr; cx.fillRect(0, 0, 1024, 512);
  cx.strokeStyle = 'rgba(255,255,255,0.05)'; cx.lineWidth = 2;
  for (let i = 0; i < 24; i++) { cx.beginPath(); cx.moveTo(i * 44, 0); cx.lineTo(i * 44 - 120, 512); cx.stroke(); }
  cx.strokeStyle = 'rgba(245,166,35,0.25)'; cx.lineWidth = 3;
  cx.beginPath(); cx.arc(512, 300, 200, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(512, 300, 250, 0, 7); cx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: tex }));
  bd.position.set(0, 3.2, -6); s.add(bd);
  // platform
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.16, 48), new THREE.MeshStandardMaterial({ color: 0x1b222c, metalness: 0.6, roughness: 0.4 }));
  plat.position.y = -0.08; s.add(plat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 64), new THREE.MeshBasicMaterial({ color: 0xf5a623, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; s.add(ring);
  // lights
  s.add(new THREE.HemisphereLight(0xaac4e0, 0x1a1410, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, 3, 5); s.add(key);
  const rim = new THREE.DirectionalLight(0x4aa3ff, 0.9); rim.position.set(-4, 2.5, -3); s.add(rim);
  const rim2 = new THREE.PointLight(0xf5a623, 1.2, 8); rim2.position.set(3, 1, -1.5); s.add(rim2);
  buildLobbyChar(0);
  lobby.cam.position.set(0, 0.62, 6.3); lobby.cam.lookAt(0, 0.62, 0);
})();
function buildLobbyChar(i) {
  if (lobby.char) lobby.scene.remove(lobby.char.root);
  const c = newChar(Object.assign({}, OUTFITS[i]));
  c.root.rotation.y = Math.PI;        // faces the camera, standing straight
  lobby.scene.add(c.root); lobby.char = c; lobby.outfit = i;
}

/* ===================================================================
   WORLD (per match)
   =================================================================== */
let W = null;          // current world
const rc = new THREE.Raycaster();

function buildWorld(id) {
  const cfg = MAPS[id], R = mkRng(cfg.seed);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.skyBot);
  scene.fog = new THREE.Fog(cfg.fog, 50, cfg.fogFar);
  const world = {
    id, cfg, scene, walls: [], boxes: [], circles: [], towns: [], houses: [], pickups: [], enemies: [],
    wallMeshes: [], fx: [], zone: null
  };

  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 14), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(cfg.skyTop) }, bot: { value: new THREE.Color(cfg.skyBot) } },
    vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 bot;varying float h;void main(){gl_FragColor=vec4(mix(bot,top,pow(max(h,0.),.55)),1.);}'
  }));
  scene.add(sky); world.sky = sky;

  // lights
  scene.add(new THREE.HemisphereLight(cfg.hemi[0], cfg.hemi[1], cfg.hemi[2]));
  const sun = new THREE.DirectionalLight(cfg.sun, cfg.sunI);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 220;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target); world.sun = sun;
  world.sunDir = V3(0.55, 0.8, 0.35).normalize();

  // ---------- terrain height ----------
  const f = cfg.freq, A = cfg.amp, o1 = R() * 10, o2 = R() * 10, o3 = R() * 10, o4 = R() * 10;
  const nz = (x, z) => A * (0.8 + 0.6 * Math.sin(x * f + o1) * Math.cos(z * f * 1.1 + o2) +
    0.25 * Math.sin((x * 0.7 + z) * f * 2.1 + o3) + 0.15 * Math.sin(x * f * 3.7 + o4) * Math.cos(z * f * 3.1));
  // towns
  for (let i = 0; i < cfg.towns * 40 && world.towns.length < cfg.towns; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 185, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (world.towns.every(t => Math.hypot(t.x - x, t.z - z) > 105)) world.towns.push({ x, z, r: 34, h: nz(x, z) });
  }
  const height = (x, z) => {
    let h = nz(x, z);
    for (const t of world.towns) {
      const k = 1 - smooth(t.r, t.r + 22, Math.hypot(x - t.x, z - t.z));
      if (k > 0) h = lerp(h, t.h, k);
    }
    return h - smooth(235, 312, Math.hypot(x, z)) * 14;
  };
  world.height = height;

  // terrain mesh
  const SIZE = 640, SEG = 160;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, col = new Float32Array(pos.count * 3);
  const cA = new THREE.Color(cfg.gA), cB = new THREE.Color(cfg.gB), cS = new THREE.Color(cfg.sand), cD = new THREE.Color(cfg.dirt), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 0.09 + Math.cos(z * 0.07) * 2) * Math.cos(z * 0.11 + 1);
    tmp.copy(cA).lerp(cB, n);
    if (h < 0.4) tmp.lerp(cS, smooth(0.4, -0.6, h));
    let td = 1e9; for (const t of world.towns) td = Math.min(td, Math.hypot(x - t.x, z - t.z));
    if (td < 36) tmp.lerp(cD, 0.75 * (1 - smooth(10, 36, td)) + 0.1);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: cfg.water, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.4; scene.add(water);

  // ---------- static builder helpers ----------
  const addWallBox = (x, y0, z, w, h, d, color, opts) => {
    opts = opts || {};
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
    m.position.set(x, y0 + h / 2, z); m.castShadow = true; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m); world.wallMeshes.push(m);
    if (opts.collide !== false) world.boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top: y0 + h });
    return m;
  };
  const rot = (lx, lz, k) => { for (let i = 0; i < k; i++) { const t = lx; lx = -lz; lz = t; } return [lx, lz]; };

  // ---------- towns & houses ----------
  world.towns.forEach((t, ti) => {
    const placed = [];
    for (let n = 0; n < 60 && placed.length < 4 + Math.floor(R() * 4); n++) {
      const a = R() * Math.PI * 2, rr = 7 + R() * 20, hx = t.x + Math.cos(a) * rr, hz = t.z + Math.sin(a) * rr;
      const w = 6.5 + R() * 3.5, d = 6 + R() * 3, rad = Math.max(w, d) * 0.72;
      if (placed.some(p => Math.hypot(p.x - hx, p.z - hz) < p.rad + rad + 3.5)) continue;
      placed.push({ x: hx, z: hz, rad, w, d });
      const k = Math.floor(R() * 4), y0 = t.h, H = 3.3, tt = 0.35, gap = 2.2;
      const wc = cfg.houses[Math.floor(R() * cfg.houses.length)];
      const odd = k % 2 === 1;
      const segW = (w - gap) / 2;
      const parts = [
        [0, -d / 2 + tt / 2, w, tt, true], [-w / 2 + tt / 2, 0, tt, d, true], [w / 2 - tt / 2, 0, tt, d, true],
        [-(gap / 2 + segW / 2), d / 2 - tt / 2, segW, tt, true], [(gap / 2 + segW / 2), d / 2 - tt / 2, segW, tt, true]
      ];
      parts.forEach(p => {
        const [rx, rz] = rot(p[0], p[1], k), ww = odd ? p[3] : p[2], dd = odd ? p[2] : p[3];
        addWallBox(hx + rx, y0, hz + rz, ww, H, dd, wc);
      });
      { // lintel above the door
        const [rx, rz] = rot(0, d / 2 - tt / 2, k);
        addWallBox(hx + rx, y0 + 2.45, hz + rz, odd ? tt : gap, H - 2.45, odd ? gap : tt, wc, { collide: false });
      }
      addWallBox(hx, y0 + H, hz, odd ? d + 0.7 : w + 0.7, 0.3, odd ? w + 0.7 : d + 0.7, cfg.roof, { collide: false });
      const fl = new THREE.Mesh(new THREE.BoxGeometry(odd ? d : w, 0.12, odd ? w : d), M(cfg.floor));
      fl.position.set(hx, y0 + 0.04, hz); fl.receiveShadow = true; scene.add(fl);
      world.houses.push({ x: hx, z: hz, w: odd ? d : w, d: odd ? w : d, y: y0, town: ti });
    }
    t.houses = placed;
    // crates
    for (let n = 0; n < 40 && n < 18; n++) {
      const a = R() * Math.PI * 2, rr = 5 + R() * 26, cx = t.x + Math.cos(a) * rr, cz = t.z + Math.sin(a) * rr;
      if (placed.some(p => Math.hypot(p.x - cx, p.z - cz) < p.rad + 2.5)) continue;
      const s = 0.9 + R() * 0.5;
      const m = addWallBox(cx, t.h, cz, s, s, s, 0x8a6a3c); m.rotation.y = 0;
      if (R() < 0.35) addWallBox(cx + 0.3, t.h + s, cz, s * 0.8, s * 0.8, s * 0.8, 0x9b7b4c);
    }
  });

  // ---------- trees / rocks (instanced) ----------
  const TC = cfg.tree, treeSpots = [];
  const farFromTowns = (x, z, pad) => world.towns.every(t => Math.hypot(t.x - x, t.z - z) > t.r + pad);
  for (let i = 0; i < TC.count * 3 && treeSpots.length < TC.count; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 275, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!farFromTowns(x, z, 2) || height(x, z) < 0.1) continue;
    treeSpots.push([x, z]);
  }
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1, 6); trunkGeo.translate(0, 0.5, 0);
  let crownGeo = null;
  if (TC.kind === 'pine') { crownGeo = new THREE.ConeGeometry(1.7, 4, 7); crownGeo.translate(0, 2, 0); }
  else if (TC.kind === 'jungle') { crownGeo = new THREE.IcosahedronGeometry(2.1, 0); crownGeo.scale(1, 0.7, 1); }
  const trunkIM = new THREE.InstancedMesh(trunkGeo, M(TC.trunk), treeSpots.length);
  const crownIM = crownGeo ? new THREE.InstancedMesh(crownGeo, M(TC.crown), treeSpots.length) : null;
  treeSpots.forEach((p, i) => {
    const h = rnd(TC.h[0], TC.h[1]), gy = height(p[0], p[1]), yaw = R() * 6.28;
    q.setFromAxisAngle(V3(0, 1, 0), yaw);
    let r, top;
    if (TC.kind === 'cactus') { r = rnd(0.5, 0.9); sv.set(r, h, r); }
    else { r = 0.35 + h * 0.03; sv.set(r * 1.1, h, r * 1.1); }
    pv.set(p[0], gy - 0.1, p[1]); mtx.compose(pv, q, sv); trunkIM.setMatrixAt(i, mtx);
    top = h;
    if (crownIM) {
      const s = h / 5 + 0.6;
      if (TC.kind === 'pine') { pv.set(p[0], gy + h * 0.3, p[1]); sv.set(s, s, s); top = h * 0.3 + 4 * s; }
      else { pv.set(p[0], gy + h, p[1]); sv.set(s, s, s); top = h + 1.5 * s; }
      mtx.compose(pv, q, sv); crownIM.setMatrixAt(i, mtx);
    }
    world.circles.push({ x: p[0], z: p[1], r: Math.max(0.35, r * 0.9), gy, top });
  });
  [trunkIM, crownIM].forEach(im => { if (im) { im.castShadow = true; im.frustumCulled = false; scene.add(im); } });

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockSpots = [];
  for (let i = 0; i < cfg.rocks * 3 && rockSpots.length < cfg.rocks; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 270, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!farFromTowns(x, z, 0) || height(x, z) < 0.1) continue;
    rockSpots.push([x, z, 0.8 + R() * 1.8]);
  }
  const rockIM = new THREE.InstancedMesh(rockGeo, M(cfg.rock), rockSpots.length);
  rockSpots.forEach((p, i) => {
    const gy = height(p[0], p[1]), s = p[2];
    q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)); sv.set(s, s * 0.7, s); pv.set(p[0], gy + s * 0.2, p[1]);
    mtx.compose(pv, q, sv); rockIM.setMatrixAt(i, mtx);
    world.circles.push({ x: p[0], z: p[1], r: s * 0.85, gy, top: s * 1.0 });
  });
  rockIM.castShadow = true; rockIM.frustumCulled = false; scene.add(rockIM);

  // ---------- zone visual ----------
  const zm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 160, 72, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  zm.position.y = 20; scene.add(zm); world.zoneMesh = zm;

  scene.updateMatrixWorld(true);
  return world;
}

/* ------------------------------ world queries ------------------------------ */
function groundAt(x, z, y) {
  let h = W.height(x, z);
  for (const b of W.boxes) {
    if (x > b.x0 - 0.05 && x < b.x1 + 0.05 && z > b.z0 - 0.05 && z < b.z1 + 0.05 && b.top <= y + 0.36 && b.top > h) h = b.top;
  }
  return h;
}
function resolve(pos, r) {
  for (let it = 0; it < 2; it++) {
    for (const b of W.boxes) {
      if (pos.y >= b.top - 0.35) continue;
      if (pos.x < b.x0 - r || pos.x > b.x1 + r || pos.z < b.z0 - r || pos.z > b.z1 + r) continue;
      const cx = clamp(pos.x, b.x0, b.x1), cz = clamp(pos.z, b.z0, b.z1);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
      else {
        const l = pos.x - b.x0, rr = b.x1 - pos.x, t = pos.z - b.z0, bt = b.z1 - pos.z, m = Math.min(l, rr, t, bt);
        if (m === l) pos.x = b.x0 - r; else if (m === rr) pos.x = b.x1 + r; else if (m === t) pos.z = b.z0 - r; else pos.z = b.z1 + r;
      }
    }
    for (const c of W.circles) {
      const dx = pos.x - c.x, dz = pos.z - c.z, rr = r + c.r;
      if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; pos.x = c.x + dx / d * rr; pos.z = c.z + dz / d * rr; }
    }
  }
}
// ray against static world. returns {dist, kind}
function castWorld(o, dir, maxDist) {
  let best = maxDist, kind = null;
  rc.set(o, dir); rc.near = 0; rc.far = maxDist;
  const hs = rc.intersectObjects(W.wallMeshes, false);
  if (hs.length) { best = hs[0].distance; kind = 'wall'; }
  const L = Math.hypot(dir.x, dir.z);
  if (L > 1e-6) {
    for (const c of W.circles) {
      const dx = c.x - o.x, dz = c.z - o.z;
      if (dx * dx + dz * dz > (best * L + c.r) * (best * L + c.r)) continue;
      const u = (dx * dir.x + dz * dir.z) / L, p = Math.abs(dx * dir.z - dz * dir.x) / L;
      if (p >= c.r || u < -c.r) continue;
      const half = Math.sqrt(c.r * c.r - p * p), uh = Math.max(0, u - half), d3 = uh / L;
      if (d3 >= best) continue;
      const y = o.y + dir.y * d3;
      if (y < c.gy + c.top && y > c.gy - 1) { best = d3; kind = 'tree'; }
    }
  }
  const step = 2.5;
  for (let d = step; d < best + step; d += step) {
    const dd = Math.min(d, best), x = o.x + dir.x * dd, y = o.y + dir.y * dd, z = o.z + dir.z * dd;
    if (y < W.height(x, z)) {
      let lo = Math.max(0, dd - step), hi = dd;
      for (let i = 0; i < 6; i++) { const mid = (lo + hi) / 2; if (o.y + dir.y * mid < W.height(o.x + dir.x * mid, o.z + dir.z * mid)) hi = mid; else lo = mid; }
      best = hi; kind = 'ground'; break;
    }
    if (dd >= best) break;
  }
  return { dist: best, kind };
}
function losClear(from, to) {
  const d = to.clone().sub(from), len = d.length(); d.normalize();
  return castWorld(from, d, len - 0.3).kind === null;
}

/* ------------------------------ effects ------------------------------ */
const tracerGeo = new THREE.BoxGeometry(0.03, 0.03, 1); tracerGeo.translate(0, 0, 0.5);
const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const sparkGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
function fxTracer(a, b) {
  const len = a.distanceTo(b); if (len < 0.5) return;
  const m = new THREE.Mesh(tracerGeo, tracerMat); m.position.copy(a); m.lookAt(b); m.scale.set(1, 1, len);
  W.scene.add(m); W.fx.push({ m, t: 0.06, tracer: true });
}
function fxSparks(p, color, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(p); W.scene.add(m);
    W.fx.push({ m, t: 0.45, v: V3(rnd(-3, 3), rnd(1, 4), rnd(-3, 3)), spark: true });
  }
  if (W.fx.length > 140) { const old = W.fx.splice(0, W.fx.length - 140); old.forEach(f => f.m.parent && f.m.parent.remove(f.m)); }
}
function updateFx(dt) {
  for (let i = W.fx.length - 1; i >= 0; i--) {
    const f = W.fx[i]; f.t -= dt;
    if (f.spark) { f.v.y -= 12 * dt; f.m.position.addScaledVector(f.v, dt); }
    if (f.t <= 0) { f.m.parent && f.m.parent.remove(f.m); if (f.spark) f.m.material.dispose(); W.fx.splice(i, 1); }
  }
}

/* ===================================================================
   PICKUPS
   =================================================================== */
const medGeo = (() => { const g = new THREE.Group(); box(0.5, 0.35, 0.35, M(0xf2f2f2), 0, 0, 0, g); box(0.34, 0.1, 0.37, M(0xd62828), 0, 0, 0, g); box(0.1, 0.1, 0.37, M(0xd62828), 0, 0, 0, g).scale.set(1, 3.2, 1); return g; })();
function spawnPickup(kind, wtype, x, z, y) {
  const grp = new THREE.Group();
  let color = 0x5ee07a;
  if (kind === 'weapon') {
    const g = makeGun(wtype); g.scale.set(1.7, 1.7, 1.7); g.position.z = 0.35; const holder = new THREE.Group(); holder.add(g); grp.add(holder); grp.userData.spin = holder;
    color = WEAPONS[wtype].color;
  } else {
    const m = medGeo.clone(); m.scale.set(1.3, 1.3, 1.3); const holder = new THREE.Group(); holder.add(m); grp.add(holder); grp.userData.spin = holder;
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.4; grp.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; grp.add(ring);
  const gy = (y === undefined) ? W.height(x, z) : y;
  grp.position.set(x, gy, z); grp.userData.spin.position.y = 0.9;
  W.scene.add(grp);
  const p = { kind, wtype, x, z, y: gy, grp, taken: false, ph: Math.random() * 6 };
  W.pickups.push(p); return p;
}
function removePickup(p) { p.taken = true; W.scene.remove(p.grp); }

/* ===================================================================
   PLAYER
   =================================================================== */
const P = {
  pos: V3(0, 0, 0), vel: V3(), vy: 0, yaw: 0, pitch: 0, hp: 100, alive: true, onGround: true,
  stance: 0, s: 0, wp: [null, null, null], cur: -1, fireCd: 0, reloadT: 0, reloading: false,
  ads: 0, bloom: 0, lean: 0, dirZ: 1, scopeIdx: 0, kills: 0, char: null, speedNow: 0, sprinting: false, hurt: 0, lastShot: -99, recoilKick: 0
};
const keys = {}, mouse = { l: false, r: false, edge: false };
let state = 'splash';         // splash | lobby | loading | ready | playing | paused | over
let selectedMap = 'erangel', locked = false, fallbackLook = false, gTime = 0;

const isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
let MP = { socket: null, room: null, playerId: null, mode: 'solo', connected: false, lastSend: 0, remotes: new Map(), serverUrl: 'ws:https://shadow-ou2s.onrender.com' };
function mpStatus(message, good) {
  const el = $('mpStatus'); if (el) { el.textContent = message; el.style.color = good ? '#8ee6a2' : '#ffbd80'; }
}
function mpSend(data) {
  if (MP.socket && MP.socket.readyState === WebSocket.OPEN) MP.socket.send(JSON.stringify(data));
}
function mpConnect(mode) {
  const url = ($('mpServer').value || '').trim();
  if (!/^wss?:\/\//i.test(url)) { mpStatus('Enter a valid ws:// or wss:// server address', false); return; }
  MP.serverUrl = url; MP.mode = mode;
  try {
    if (MP.socket) MP.socket.close();
    MP.socket = new WebSocket(url);
    mpStatus('Connecting to multiplayer server…', false);
    MP.socket.onopen = () => {
      MP.connected = true;
      if (mode === 'create') mpSend({ type: 'create_room', player_name: ($('pname').value || 'PLAYER').slice(0, 12), map: selectedMap });
      else mpSend({ type: 'join_room', room: ($('mpRoom').value || '').trim().toUpperCase(), player_name: ($('pname').value || 'PLAYER').slice(0, 12), map: selectedMap });
    };
    MP.socket.onmessage = ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch (_) { return; }
      if (msg.type === 'room_created' || msg.type === 'room_joined') {
        MP.room = msg.room; MP.playerId = msg.player_id;
        $('mpRoomCode').textContent = 'ROOM CODE: ' + MP.room;
        $('mpRoom').value = MP.room;
        mpStatus('Connected · Room ' + MP.room + ' · Share this code with your friend', true);
        startMatch();
      } else if (msg.type === 'error') {
        mpStatus(msg.message || 'Multiplayer error', false);
      } else if (msg.type === 'player_state') {
        mpUpsertRemote(msg.player);
      } else if (msg.type === 'player_left') {
        mpRemoveRemote(msg.player_id);
      } else if (msg.type === 'room_snapshot') {
        (msg.players || []).forEach(mpUpsertRemote);
      } else if (msg.type === 'room_closed') {
        mpStatus('Room closed by host', false); mpClearRemotes();
      }
    };
    MP.socket.onerror = () => mpStatus('Cannot reach server. Check server address and network.', false);
    MP.socket.onclose = () => {
      MP.connected = false;
      if (MP.mode !== 'solo') mpStatus('Disconnected from multiplayer server', false);
      mpClearRemotes();
    };
  } catch (err) { mpStatus('Connection failed: ' + err.message, false); }
}
function mpUpsertRemote(data) {
  if (!data || !data.id || data.id === MP.playerId || !W) return;
  let r = MP.remotes.get(data.id);
  if (!r) {
    const outfit = OUTFITS[Math.abs((data.outfit || 0) % OUTFITS.length)];
    const ch = newChar(Object.assign({}, outfit));
    W.scene.add(ch.root);
    r = { char: ch, target: V3(data.x || 0, data.y || 0, data.z || 0), yaw: data.yaw || 0, name: data.name || 'FRIEND' };
    MP.remotes.set(data.id, r);
  }
  r.target.set(Number(data.x) || 0, Number(data.y) || 0, Number(data.z) || 0);
  r.yaw = Number(data.yaw) || 0; r.name = data.name || r.name;
  r.stance = Number(data.stance) || 0; r.speed = Number(data.speed) || 0;
}
function mpRemoveRemote(id) {
  const r = MP.remotes.get(id); if (!r) return;
  if (r.char && r.char.root.parent) r.char.root.parent.remove(r.char.root);
  MP.remotes.delete(id);
}
function mpClearRemotes() { Array.from(MP.remotes.keys()).forEach(mpRemoveRemote); }
function mpUpdate(dt) {
  if (MP.connected && MP.room && W && state === 'playing') {
    MP.lastSend += dt;
    if (MP.lastSend >= 0.05) {
      MP.lastSend = 0;
      mpSend({ type: 'player_state', x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw, stance: P.s, speed: P.speedNow, outfit: lobby.outfit, name: ($('pname').value || 'PLAYER').slice(0, 12), map: selectedMap });
    }
  }
  MP.remotes.forEach(r => {
    r.char.root.position.lerp(r.target, Math.min(1, dt * 12));
    r.char.root.rotation.y += (r.yaw - r.char.root.rotation.y) * Math.min(1, dt * 12);
    r.char.update(dt, { s: r.stance || 0, speed: r.speed || 0, gun: false });
  });
}

let camPos = V3(), camFwd = V3(0, 0, -1);
const gameCam = new THREE.PerspectiveCamera(70, 1, 0.1, 1600);

function curWeapon() { return P.cur >= 0 ? P.wp[P.cur] : null; }
function equip(i) {
  if (i < 0 || i > 2 || !P.wp[i] || !P.alive) return;
  P.cur = i; P.scopeIdx = 0; P.reloading = false; P.reloadT = 0; P.fireCd = Math.max(P.fireCd, 0.3);
  P.char.setGun(P.wp[i].type); updateWeaponsUI();
}
function unequip() { P.cur = -1; P.reloading = false; P.char.setGun(null); updateWeaponsUI(); }

function tryPickup() {
  const p = nearestPickup(); if (!p) return;
  if (p.kind === 'med') {
    if (P.hp >= 100) { showMsg('HEALTH FULL', 900); return; }
    P.hp = Math.min(100, P.hp + 60); removePickup(p); sfxPick(); showMsg('+60 HEALTH', 900); return;
  }
  const def = WEAPONS[p.wtype];
  let slot = P.wp.findIndex(w => w && w.type === p.wtype);
  if (slot >= 0) { P.wp[slot].reserve += def.mag * 2; removePickup(p); sfxPick(); showMsg('+AMMO ' + def.name, 900); updateWeaponsUI(); return; }
  slot = P.wp.findIndex(w => !w);
  if (slot < 0) {
    slot = P.cur >= 0 ? P.cur : 0;
    const old = P.wp[slot]; spawnPickup('weapon', old.type, P.pos.x + Math.sin(P.yaw) * 1.2, P.pos.z + Math.cos(P.yaw) * 1.2);
  }
  P.wp[slot] = { type: p.wtype, mag: def.mag, reserve: def.mag * 2 };
  removePickup(p); sfxPick(); showMsg('PICKED UP ' + def.name, 1100);
  if (P.cur < 0 || slot === P.cur || P.wp[P.cur] === null) equip(slot); else equip(slot);
}
function nearestPickup() {
  let best = null, bd = 2.6;
  for (const p of W.pickups) {
    if (p.taken) continue;
    const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
    if (d < bd && Math.abs(p.y - P.pos.y) < 2.2) { bd = d; best = p; }
  }
  return best;
}

function startReload() {
  const w = curWeapon(); if (!w || P.reloading) return;
  const def = WEAPONS[w.type];
  if (w.mag >= def.mag || w.reserve <= 0) return;
  P.reloading = true; P.reloadT = def.reload; sfxReload();
}

function damagePlayer(n) {
  if (!P.alive) return;
  P.hp -= n; P.hurt = 1; sfxHurt();
  if (P.hp <= 0) { P.hp = 0; P.alive = false; endMatch(false); }
}

/* ------------------------------ shooting ------------------------------ */
const enemyRC = new THREE.Raycaster();
const muzzleLight = new THREE.PointLight(0xffaa44, 0, 16);
function playerSpread(def) {
  let s = def.spread * (1 + P.bloom);
  if (P.speedNow > 1) s *= 1.6;
  if (P.s > 0.5 && P.s <= 1.5) s *= 0.8;
  if (P.s > 1.5) s *= 0.6;
  if (!P.onGround) s *= 2.2;
  s *= lerp(1, 0.45, P.ads);
  return s;
}
function playerShoot() {
  const w = curWeapon(); if (!w) return;
  const def = WEAPONS[w.type];
  if (P.reloading || P.fireCd > 0) return;
  if (w.mag <= 0) { sfxEmpty(); P.fireCd = 0.25; if (w.reserve > 0) startReload(); else showMsg('NO AMMO', 700); return; }
  w.mag--; P.fireCd = def.rate; P.lastShot = gTime;
  const sp = playerSpread(def);
  // aim ray (from the camera axis, starting at head plane)
  const pivot = headPivot();
  const origin = camPos.clone().addScaledVector(camFwd, Math.max(0, pivot.clone().sub(camPos).dot(camFwd)));
  const dir = camFwd.clone();
  dir.x += (Math.random() - 0.5) * 2 * sp; dir.y += (Math.random() - 0.5) * 2 * sp; dir.z += (Math.random() - 0.5) * 2 * sp; dir.normalize();
  // muzzle
  P.char.root.updateMatrixWorld(true);
  const gun = P.char.gun, muzzle = gun.localToWorld(V3(0, 0, gun.userData.muzzleZ));
  const fp = scopedFP();
  const mpos = fp ? camPos.clone().addScaledVector(camFwd, 0.6).add(V3(0, -0.08, 0)) : muzzle;
  // find what we hit
  const maxD = def.range * 2.2;
  const world = castWorld(origin, dir, maxD);
  let bestD = world.dist, hitE = null, hitMesh = null;
  const meshes = []; W.enemies.forEach(e => { if (!e.dead) meshes.push(...e.char.hit); });
  enemyRC.set(origin, dir); enemyRC.far = bestD;
  const eh = enemyRC.intersectObjects(meshes, false);
  if (eh.length) { hitMesh = eh[0].object; hitE = hitMesh.userData.enemy; bestD = eh[0].distance; }
  const end = origin.clone().addScaledVector(dir, bestD);
  fxTracer(mpos, end);
  if (hitE) {
    const falloff = clamp(1.15 - bestD / (def.range * 2.6), 0.55, 1);
    const head = hitMesh.userData.head;
    const dmg = def.dmg * hitMesh.userData.mult * falloff;
    hitE.damage(dmg, head);
    hitMarker(hitE.dead);
    fxSparks(end, 0xcc2222, 4);
    sfxHit(head);
  } else if (world.kind) {
    fxSparks(end, world.kind === 'ground' ? 0x8a7a5a : 0xdddddd, 5);
  }
  // juice
  sfxShot(def.snd, 0.5);
  gun.userData.flash.visible = !fp; gun.userData.flashT = 0.05;
  muzzleLight.position.copy(mpos); muzzleLight.intensity = 3; muzzleLight.userData.t = 0.05;
  const k = def.recoil * lerp(1, 0.6, P.ads);
  P.pitch += k * (0.8 + Math.random() * 0.5); P.yaw += (Math.random() - 0.5) * k * 0.7;
  P.bloom = Math.min(3, P.bloom + def.bloom);
  // alert nearby bots
  W.enemies.forEach(e => { if (!e.dead && e.pos.distanceTo(P.pos) < 95) { e.alert = Math.max(e.alert, 5); e.lastKnown.copy(P.pos); } });
  if (w.mag === 0 && w.reserve > 0 && def.type !== 'SNIPER') setTimeout(() => { if (state === 'playing') startReload(); }, 200);
  updateAmmoUI();
}
function scopedFP() { const w = curWeapon(); return !!(w && WEAPONS[w.type].fp && P.ads > 0.85); }

/* ===================================================================
   ENEMIES
   =================================================================== */
class Enemy {
  constructor(x, z, name, home) {
    this.name = name; this.hp = 100; this.dead = false; this.alert = 0; this.los = false; this.losT = Math.random() * 0.3;
    this.pos = V3(x, W.height(x, z), z); this.yaw = Math.random() * 6.28; this.home = home || V3(x, 0, z);
    this.wp = null; this.wait = Math.random() * 2; this.cd = 1; this.burst = 0; this.react = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 1;
    this.lastKnown = V3(x, 0, z); this.speed = 0; this.stuckT = 0; this.stuckPos = this.pos.clone(); this.hurtT = 0; this.pitch = 0;
    const wt = pickWeapon([['ump', 25], ['akm', 40], ['m416', 35]]);
    this.wtype = wt;
    this.char = newChar({ suit: 0x7a2f2f, pants: 0x3a2a2a, vest: 0x2b2b2e, helmet: [0x222831, 0x5a2222, 0x333a22][Math.floor(Math.random() * 3)], skin: [0xd9a77a, 0xb98462, 0x8a5a3c][Math.floor(Math.random() * 3)],
      tint: [0xb86a5a, 0x8a8a8a, 0x9a8458, 0x7a6a8a, 0x5f7f70][Math.floor(Math.random() * 5)], scale: rnd(0.95, 1.05) });
    this.char.setGun(wt);
    this.char.hit.forEach(m => m.userData.enemy = this);
    this.char.root.position.copy(this.pos); W.scene.add(this.char.root);
    // health bar
    const bgm = new THREE.SpriteMaterial({ color: 0x000000, depthTest: false, transparent: true, opacity: 0.6 });
    const fgm = new THREE.SpriteMaterial({ color: 0xff4040, depthTest: false, transparent: true });
    this.bg = new THREE.Sprite(bgm); this.fg = new THREE.Sprite(fgm);
    this.bg.scale.set(1, 0.1, 1); this.fg.center.set(0, 0.5); this.fg.scale.set(0.96, 0.07, 1);
    this.bg.position.y = 2.2; this.fg.position.set(-0.48, 2.2, 0);
    this.bg.renderOrder = 10; this.fg.renderOrder = 11; this.bg.visible = this.fg.visible = false;
    this.char.root.add(this.bg, this.fg);
  }
  damage(n, head) {
    if (this.dead) return;
    this.hp -= n; this.hurtT = 4; this.alert = 8; this.lastKnown.copy(P.pos);
    this.fg.scale.x = 0.96 * clamp(this.hp / 100, 0, 1);
    if (this.hp <= 0) this.die(head);
  }
  die(head) {
    this.dead = true; this.char.dead = true; this.bg.visible = this.fg.visible = false;
    this.char.hit.forEach(m => { m.userData.mult = 0; });
    killFeed('You eliminated <b>' + this.name + '</b>' + (head ? ' 🎯 headshot' : ''));
    P.kills++; $('killN').textContent = P.kills;
    // drop loot
    spawnPickup('weapon', this.wtype, this.pos.x + 0.6, this.pos.z + 0.4);
    if (Math.random() < 0.5) spawnPickup('med', null, this.pos.x - 0.7, this.pos.z - 0.3);
    updateAlive();
    if (W.enemies.every(e => e.dead)) setTimeout(() => { if (P.alive && state === 'playing') endMatch(true); }, 1800);
  }
  zoneDanger() { const z = W.zone; return Math.hypot(this.pos.x - z.cx, this.pos.z - z.cz) > z.r - 8; }
  update(dt) {
    const c = this.char;
    if (this.dead) { c.update(dt, { s: 0, speed: 0, gun: true }); return; }
    this.hurtT -= dt; const showBar = this.hurtT > 0; this.bg.visible = this.fg.visible = showBar;
    this.alert -= dt;
    const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.losT -= dt;
    const eye = V3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    const tgt = V3(P.pos.x, P.pos.y + (P.s > 1.5 ? 0.35 : P.s > 0.5 ? 0.9 : 1.3), P.pos.z);
    if (this.losT <= 0) {
      this.losT = 0.25;
      this.los = P.alive && dist < 100 && losClear(eye, tgt);
      if (this.los && dist < 85) { this.alert = Math.max(this.alert, 6); this.lastKnown.copy(P.pos); }
    }
    let mx = 0, mz = 0, spd = 0, face = null;
    const z = W.zone, zd = Math.hypot(this.pos.x - z.cx, this.pos.z - z.cz);
    if (zd > z.r - 10) {   // run for the zone
      const l = Math.hypot(z.cx - this.pos.x, z.cz - this.pos.z) || 1; mx = (z.cx - this.pos.x) / l; mz = (z.cz - this.pos.z) / l; spd = 4.6; face = Math.atan2(-mx, -mz);
      this.alert = Math.min(this.alert, 0.5);
    } else if (this.alert > 0 && P.alive) {
      face = Math.atan2(-dx, -dz);
      if (this.los) {
        this.react += dt;
        const ux = dx / (dist || 1), uz = dz / (dist || 1);
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe *= -1; this.strafeT = rnd(1, 2.6); }
        if (dist > 32) { mx = ux; mz = uz; spd = 4; }
        else if (dist < 11) { mx = -ux; mz = -uz; spd = 3; }
        else { mx = -uz * this.strafe; mz = ux * this.strafe; spd = 2.4; }
        this.cd -= dt;
        if (this.react > 0.6 && this.cd <= 0) {
          this.fire(tgt, dist);
          if (this.burst > 0) { this.burst--; this.cd = 0.11; } else { this.burst = 2 + Math.floor(Math.random() * 3); this.cd = rnd(0.7, 1.5); }
        }
      } else {
        this.react = 0;
        const lx = this.lastKnown.x - this.pos.x, lz = this.lastKnown.z - this.pos.z, ld = Math.hypot(lx, lz);
        if (ld > 3) { mx = lx / ld; mz = lz / ld; spd = 4; face = Math.atan2(-mx, -mz); }
      }
    } else {
      this.react = 0;
      this.wait -= dt;
      if (!this.wp || Math.hypot(this.wp.x - this.pos.x, this.wp.z - this.pos.z) < 2.5) {
        if (this.wp) { this.wp = null; this.wait = rnd(1.5, 5); }
        if (!this.wp && this.wait <= 0) {
          const a = Math.random() * 6.28, r = rnd(8, 38);
          this.wp = V3(clamp(this.home.x + Math.cos(a) * r, -250, 250), 0, clamp(this.home.z + Math.sin(a) * r, -250, 250));
        }
      }
      if (this.wp) { const l = Math.hypot(this.wp.x - this.pos.x, this.wp.z - this.pos.z) || 1; mx = (this.wp.x - this.pos.x) / l; mz = (this.wp.z - this.pos.z) / l; spd = 2.4; face = Math.atan2(-mx, -mz); }
    }
    // turn
    if (face !== null) { let d = face - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += clamp(d, -dt * 7, dt * 7); }
    this.speed = spd;
    if (spd > 0) {
      this.pos.x += mx * spd * dt; this.pos.z += mz * spd * dt;
      resolve(this.pos, 0.45);
      const r = Math.hypot(this.pos.x, this.pos.z); if (r > 275) { this.pos.x *= 275 / r; this.pos.z *= 275 / r; }
    }
    this.pos.y = groundAt(this.pos.x, this.pos.z, this.pos.y);
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      if (spd > 0 && this.pos.distanceTo(this.stuckPos) < spd * 0.3) { this.wp = null; this.wait = 0; this.strafe *= -1; if (this.alert <= 0) { this.home.set(this.pos.x + rnd(-10, 10), 0, this.pos.z + rnd(-10, 10)); } }
      this.stuckPos.copy(this.pos); this.stuckT = 0;
    }
    c.root.position.copy(this.pos); c.root.rotation.y = this.yaw;
    const vy = (P.pos.y + 1.2) - (this.pos.y + 1.4);
    this.pitch = this.alert > 0 && this.los ? Math.atan2(vy, dist) : 0;
    c.update(dt, { s: 0, speed: this.speed, gun: true, pitch: this.pitch, far: dist > 85 });
    const g = c.gun; if (g && g.userData.flashT > 0) { g.userData.flashT -= dt; if (g.userData.flashT <= 0) g.userData.flash.visible = false; }
  }
  fire(tgt, dist) {
    const c = this.char; c.root.updateMatrixWorld(true);
    const g = c.gun; if (!g) return;
    const mz = g.localToWorld(V3(0, 0, g.userData.muzzleZ));
    let chance = clamp(0.62 - dist / 150, 0.1, 0.5);
    if (P.s > 1.5) chance *= 0.55; else if (P.s > 0.5) chance *= 0.8;
    if (P.speedNow > 5) chance *= 0.8;
    const hit = Math.random() < chance;
    const end = hit ? tgt.clone() : tgt.clone().add(V3(rnd(-1.6, 1.6), rnd(-0.8, 1.2), rnd(-1.6, 1.6)));
    fxTracer(mz, end);
    g.userData.flash.visible = true; g.userData.flashT = 0.05;
    sfxShot(this.wtype === 'ump' ? 2 : 3, clamp(0.45 - dist / 260, 0.04, 0.4));
    if (hit) damagePlayer(this.wtype === 'ump' ? 6 : 9);
    P.lastSeenShooter = this.pos.clone();
  }
}

/* ===================================================================
   MATCH SETUP
   =================================================================== */
function startMatch() {
  state = 'loading';
  $('lobby').classList.add('hidden'); $('overlay').classList.add('hidden');
  $('loadMap').textContent = MAPS[selectedMap].name; $('loading').classList.remove('hidden');
  setTimeout(() => {
    if (W) disposeWorld();
    W = buildWorld(selectedMap);
    setupPlayerAndEnemies();
    $('loading').classList.add('hidden'); $('hud').classList.remove('hidden'); $('mpHudStatus').classList.toggle('hidden', !MP.room);
    state = 'ready';
    showOverlay('READY TO DROP', MAPS[selectedMap].name + (MP.room ? ' · FRIEND ROOM ' + MP.room : ' · SOLO') + ' · 12 BOTS', 'DEPLOY', false);
  }, 60);
}
function disposeWorld() {
  mpClearRemotes();
  W.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  W = null;
}
function setupPlayerAndEnemies() {
  // player char
  if (P.char) P.char.root.parent && P.char.root.parent.remove(P.char.root);
  const out = Object.assign({}, OUTFITS[lobby.outfit]);
  P.char = newChar(out); W.scene.add(P.char.root);
  W.scene.add(muzzleLight);
  // spawn near a town edge
  const t = W.towns[Math.floor(Math.random() * W.towns.length)];
  let sx = t.x + 24, sz = t.z + 6;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * 6.28; sx = t.x + Math.cos(a) * 26; sz = t.z + Math.sin(a) * 26;
    const tp = V3(sx, W.height(sx, sz), sz); resolve(tp, 0.6); if (Math.hypot(tp.x - sx, tp.z - sz) < 0.01) break;
  }
  P.pos.set(sx, W.height(sx, sz), sz); P.vy = 0; P.onGround = true; P.hp = 100; P.alive = true; P.kills = 0; P.s = 0; P.stance = 0;
  P.wp = [null, null, null]; P.cur = -1; P.reloading = false; P.fireCd = 0; P.ads = 0; P.bloom = 0; P.hurt = 0;
  P.yaw = Math.atan2(-(t.x - sx), -(t.z - sz)); P.pitch = -0.1; P.vel.set(0, 0, 0);
  // zone
  W.zone = { cx: 0, cz: 0, r: 290, phase: -1, t: 0, from: { cx: 0, cz: 0, r: 290 }, to: { cx: 0, cz: 0, r: 290 }, shrinking: false, label: '' };
  W.zonePhases = [{ hold: 50, shrink: 40, r: 175 }, { hold: 30, shrink: 40, r: 100 }, { hold: 25, shrink: 40, r: 50 }, { hold: 20, shrink: 35, r: 12 }];
  nextZonePhase();
  // starter loot next to the player + loot around
  const off = (a, d) => [sx + Math.cos(a) * d, sz + Math.sin(a) * d];
  let q = off(P.yaw + 1.2, 4); spawnPickup('weapon', 'p18', q[0], q[1]);
  q = off(P.yaw - 1.2, 5); spawnPickup('weapon', 'ump', q[0], q[1]);
  q = off(P.yaw + 2.4, 6); spawnPickup('med', null, q[0], q[1]);
  W.houses.forEach(h => {
    if (Math.random() < 0.75) spawnPickup('weapon', pickWeapon(), h.x, h.z, h.y + 0.12);
    if (Math.random() < 0.4) spawnPickup('med', null, h.x + 1.5, h.z + 1, h.y + 0.12);
  });
  W.towns.forEach(tw => { for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = rnd(8, 30); const x = tw.x + Math.cos(a) * r, z = tw.z + Math.sin(a) * r; const tp = V3(x, tw.h, z); resolve(tp, 0.6); spawnPickup('weapon', pickWeapon(), tp.x, tp.z); } });
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 240; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (W.height(x, z) > 0.2) { const isMed = Math.random() < 0.3; spawnPickup(isMed ? 'med' : 'weapon', isMed ? null : pickWeapon(), x, z); } }
  // enemies
  W.enemies = [];
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const spots = [];
  W.towns.forEach(tw => { if (Math.hypot(tw.x - t.x, tw.z - t.z) > 60) { for (let i = 0; i < 2; i++) spots.push(tw); } else spots.push(null); });
  for (let i = 0; i < 12; i++) {
    let x, z, home;
    const tw = spots.length && i < 8 ? spots[i % spots.length] : null;
    if (tw) { const a = Math.random() * 6.28, r = rnd(4, 24); x = tw.x + Math.cos(a) * r; z = tw.z + Math.sin(a) * r; home = V3(tw.x, 0, tw.z); }
    else {
      for (let k = 0; k < 20; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 230; x = Math.cos(a) * r; z = Math.sin(a) * r; if (Math.hypot(x - sx, z - sz) > 90 && W.height(x, z) > 0.2) break; }
      home = V3(x, 0, z);
    }
    const tp = V3(x, W.height(x, z), z); resolve(tp, 0.6);
    W.enemies.push(new Enemy(tp.x, tp.z, names[i % names.length] + (i > 13 ? i : ''), home));
  }
  gTime = 0;
  $('killfeed').innerHTML = ''; $('killN').textContent = '0';
  updateAlive(); updateWeaponsUI(); updateAmmoUI();
  P.char.update(0.016, { s: 0, speed: 0, gun: false });
}

/* ------------------------------ zone ------------------------------ */
function nextZonePhase() {
  const z = W.zone; z.phase++;
  const ph = W.zonePhases[z.phase];
  if (!ph) { z.done = true; return; }
  z.from = { cx: z.cx, cz: z.cz, r: z.r };
  const maxOff = Math.max(0, z.r - ph.r) * 0.9, a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * maxOff;
  z.to = { cx: z.cx + Math.cos(a) * d, cz: z.cz + Math.sin(a) * d, r: ph.r };
  z.t = 0; z.shrinking = false;
}
function updateZone(dt) {
  const z = W.zone; if (z.done) return;
  const ph = W.zonePhases[z.phase]; z.t += dt;
  if (!z.shrinking && z.t >= ph.hold) { z.shrinking = true; z.t = 0; showMsg('ZONE IS SHRINKING!', 2200); }
  if (z.shrinking) {
    const k = clamp(z.t / ph.shrink, 0, 1);
    z.cx = lerp(z.from.cx, z.to.cx, k); z.cz = lerp(z.from.cz, z.to.cz, k); z.r = lerp(z.from.r, z.to.r, k);
    if (k >= 1) nextZonePhase();
  }
  const left = z.shrinking ? ph.shrink - z.t : ph.hold - z.t;
  const m = Math.max(0, Math.ceil(left));
  z.label = (z.shrinking ? 'ZONE SHRINKING ' : 'ZONE SHRINKS IN ') + Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  W.zoneMesh.position.set(z.cx, 20, z.cz); W.zoneMesh.scale.set(z.r, 1, z.r);
}

/* ===================================================================
   UPDATE LOOP
   =================================================================== */
function headPivot() {
  const s = P.s;
  const h = s <= 1 ? lerp(1.55, 1.1, s) : lerp(1.1, 0.5, s - 1);
  const fwdX = -Math.sin(P.yaw), fwdZ = -Math.cos(P.yaw), pr = clamp(s - 1, 0, 1);
  const base = V3(P.pos.x + fwdX * 0.8 * pr, P.pos.y + h, P.pos.z + fwdZ * 0.8 * pr);
  if (Math.abs(P.lean) > 0.02) {                       // peek around corners (stops at walls)
    const sg = Math.sign(P.lean), dir = V3(Math.cos(P.yaw) * sg, 0, -Math.sin(P.yaw) * sg), want = Math.abs(P.lean) * 0.5;
    const hit = castWorld(base, dir, want + 0.3); let dd = want;
    if (hit.kind) dd = Math.max(0, Math.min(want, hit.dist - 0.3));
    base.addScaledVector(dir, dd); base.y -= Math.abs(P.lean) * 0.07;
  }
  return base;
}

function updatePlay(dt) {
  gTime += dt;
  updateZone(dt);
  // zone damage
  const z = W.zone;
  const outside = Math.hypot(P.pos.x - z.cx, P.pos.z - z.cz) > z.r;
  if (outside && P.alive) { P.zoneAcc = (P.zoneAcc || 0) + dt * (1.5 + z.phase * 1.2); if (P.zoneAcc >= 1) { P.zoneAcc -= 1; damagePlayer(1); } }
  W.enemies.forEach(e => { if (!e.dead && Math.hypot(e.pos.x - z.cx, e.pos.z - z.cz) > z.r) { e.zacc = (e.zacc || 0) + dt * 2; if (e.zacc >= 1) { e.zacc -= 1; e.hp -= 2; if (e.hp <= 0) { e.dead = true; e.char.dead = true; e.char.hit.forEach(m => m.userData.mult = 0); updateAlive(); killFeed('<b>' + e.name + '</b> died in the zone'); if (W.enemies.every(x => x.dead) && P.alive) setTimeout(() => { if (P.alive && state === 'playing') endMatch(true); }, 1500); } } } });

  if (P.alive) {
    // stance
    const tgtS = P.stance;
    P.s += clamp(tgtS - P.s, -dt * 5, dt * 5);
    // ads
    const wantAds = mouse.r && curWeapon() && !P.reloading ? 1 : 0;
    P.ads += (wantAds - P.ads) * Math.min(1, dt * 10);
    // movement
    let ix = 0, iz = 0;
    if (keys.KeyW) iz += 1; if (keys.KeyS) iz -= 1; if (keys.KeyD) ix += 1; if (keys.KeyA) ix -= 1;
    const il = Math.hypot(ix, iz); if (il > 0) { ix /= il; iz /= il; }
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    P.sprinting = !!(keys.ShiftLeft || keys.ShiftRight) && P.stance === 0 && iz > 0 && P.ads < 0.3 && il > 0;
    let sp = P.stance === 2 ? 1.3 : P.stance === 1 ? 2.3 : (P.sprinting ? 7.6 : 4.6);
    if (P.ads > 0.5) sp *= 0.6;
    if (!P.onGround) sp = Math.max(sp, 4.4);
    const tvx = (fx * iz + rx * ix) * sp, tvz = (fz * iz + rz * ix) * sp;
    const acc = P.onGround ? 12 : 3;
    P.vel.x += (tvx - P.vel.x) * Math.min(1, dt * acc); P.vel.z += (tvz - P.vel.z) * Math.min(1, dt * acc);
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos, 0.42);
    const rr = Math.hypot(P.pos.x, P.pos.z); if (rr > 280) { P.pos.x *= 280 / rr; P.pos.z *= 280 / rr; }
    P.speedNow = Math.hypot(P.vel.x, P.vel.z);
    P.dirZ = iz;
    // peek / lean (Q = left, E = right)
    let tl = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    if (P.s > 1.2 || P.sprinting) tl = 0;
    P.lean += (tl - P.lean) * Math.min(1, dt * 11);
    // vertical
    const gnd = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.onGround) {
      if (P.pos.y - gnd > 0.45) { P.onGround = false; P.vy = 0; }
      else P.pos.y = gnd;
    }
    if (!P.onGround) {
      P.vy -= 22 * dt; P.pos.y += P.vy * dt;
      if (P.pos.y <= gnd && P.vy <= 0) { P.pos.y = gnd; P.vy = 0; P.onGround = true; }
    }
    // weapon timers
    P.fireCd = Math.max(0, P.fireCd - dt); P.bloom = Math.max(0, P.bloom - dt * 3.5);
    if (P.reloading) {
      P.reloadT -= dt;
      if (P.reloadT <= 0) {
        P.reloading = false; const w = curWeapon();
        if (w) { const def = WEAPONS[w.type], need = def.mag - w.mag, take = Math.min(need, w.reserve); w.mag += take; w.reserve -= take; updateAmmoUI(); }
      }
    }
    // shoot
    const w = curWeapon();
    if (w && mouse.l && (WEAPONS[w.type].auto || mouse.edge)) playerShoot();
    mouse.edge = false;
    // pickups prompt
    const np = nearestPickup(), pr = $('prompt');
    const pickupBtn = document.querySelector('[data-action="pickup"]');
    if (np) {
      pr.style.display = 'block';
      const pickupName = np.kind === 'med' ? 'MEDKIT' : WEAPONS[np.wtype].name;
      pr.innerHTML = '<b>' + (isTouchDevice ? 'TAP' : 'F') + '</b>' + (np.kind === 'med' ? 'PICK UP MEDKIT' : 'PICK UP ' + pickupName);
      if (pickupBtn) { pickupBtn.disabled = false; pickupBtn.textContent = isTouchDevice ? 'PICK UP' : 'PICK'; pickupBtn.setAttribute('aria-label', 'Pick up ' + pickupName); }
    } else {
      pr.style.display = 'none';
      if (pickupBtn) { pickupBtn.disabled = isTouchDevice; pickupBtn.textContent = 'PICK'; pickupBtn.setAttribute('aria-label', 'No item nearby'); }
    }
  }

  // character pose + placement
  const pr2 = clamp(P.s - 1, 0, 1), fwdX = -Math.sin(P.yaw), fwdZ = -Math.cos(P.yaw);
  P.char.root.position.set(P.pos.x + fwdX * 0.8 * pr2, P.pos.y, P.pos.z + fwdZ * 0.8 * pr2);
  P.char.root.rotation.y = P.yaw;
  P.char.update(dt, { s: P.s, speed: P.onGround ? P.speedNow : 0, gun: curWeapon() !== null, pitch: P.pitch, lean: P.lean, dirZ: P.dirZ });
  const g = P.char.gun; if (g && g.userData.flashT > 0) { g.userData.flashT -= dt; if (g.userData.flashT <= 0) g.userData.flash.visible = false; }
  if (g) g.rotation.z = P.reloading ? 0.7 : lerp(g.rotation.z, 0, Math.min(1, dt * 10));
  if (muzzleLight.userData.t > 0) { muzzleLight.userData.t -= dt; if (muzzleLight.userData.t <= 0) muzzleLight.intensity = 0; }

  // enemies / pickups / fx
  W.enemies.forEach(e => e.update(dt));
  W.pickups.forEach(p => { if (!p.taken) { p.ph += dt * 2; p.grp.userData.spin.rotation.y += dt * 1.6; p.grp.userData.spin.position.y = 0.9 + Math.sin(p.ph) * 0.1; } });
  updateFx(dt);

  // camera
  updateCamera(dt);
  // sun follows
  W.sun.position.copy(P.pos).addScaledVector(W.sunDir, 90); W.sun.target.position.copy(P.pos);
  W.sky.position.copy(gameCam.position);
  mpUpdate(dt);
  updateHUD(dt);
}

function updateCamera(dt) {
  P.pitch = clamp(P.pitch, -1.35, 1.35);
  const pivot = headPivot();
  const fp = scopedFP();
  const dist = fp ? 0 : lerp(3.4, 1.7, P.ads), side = fp ? 0 : lerp(0.75, 0.5, P.ads), up = fp ? 0 : lerp(0.35, 0.2, P.ads);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ'));
  camFwd.set(0, 0, -1).applyQuaternion(q);
  const off = V3(side, up, dist).applyQuaternion(q);
  let desired = pivot.clone().add(off);
  if (!fp) {
    const d = desired.clone().sub(pivot), len = d.length(); d.normalize();
    const hit = castWorld(pivot, d, len + 0.2);
    if (hit.kind) desired = pivot.clone().addScaledVector(d, Math.max(0.3, hit.dist - 0.25));
  }
  const gh = W.height(desired.x, desired.z) + 0.3; if (desired.y < gh) desired.y = gh;
  camPos.copy(desired);
  gameCam.position.copy(camPos); gameCam.quaternion.copy(q);
  const cw = curWeapon(), cdef = cw ? WEAPONS[cw.type] : null;
  let adsFov = 52;
  if (cdef) adsFov = cdef.fp ? cdef.zooms[Math.min(P.scopeIdx, cdef.zooms.length - 1)] : cdef.ads;
  const tfov = (P.ads > 0.05 ? lerp(72, adsFov, P.ads) : (P.sprinting ? 78 : 72));
  gameCam.fov += (tfov - gameCam.fov) * Math.min(1, dt * 12); gameCam.updateProjectionMatrix();
  P.char.root.visible = !fp;
  const sp = $('scope');
  sp.style.display = fp ? 'block' : 'none';
  if (fp && cdef) { sp.className = cdef.type === 'SNIPER' ? 'snip' : 's4'; $('zoomtxt').textContent = cdef.zoomNames[Math.min(P.scopeIdx, cdef.zooms.length - 1)] + ' SCOPE'; }
}

/* ------------------------------ HUD ------------------------------ */
const mm = $('minimap').getContext('2d');
let mmT = 0;
function updateHUD(dt) {
  $('hpfill').style.width = P.hp + '%';
  $('hpfill').style.background = P.hp < 30 ? 'linear-gradient(90deg,#e03a3a,#ff7a5a)' : 'linear-gradient(90deg,#5ee07a,#9cf06a)';
  $('hptxt').textContent = Math.ceil(P.hp);
  P.hurt = Math.max(0, P.hurt - dt * 1.6);
  $('hurt').style.opacity = Math.max(P.hurt, P.hp < 25 ? 0.35 : 0);
  $('zoneinfo').textContent = W.zone.label || '';
  const w = curWeapon();
  const cr = $('crosshair');
  if (w && !scopedFP()) { cr.style.display = 'block'; cr.style.setProperty('--g', (4 + playerSpread(WEAPONS[w.type]) * 700).toFixed(1) + 'px'); }
  else cr.style.display = 'none';
  $('stance').textContent = P.s > 1.5 ? 'PRONE' : (Math.abs(P.lean) > 0.3 ? (P.lean < 0 ? '◀ PEEK LEFT' : 'PEEK RIGHT ▶') : (P.s > 0.5 ? 'CROUCH' : ''));
  $('reload').textContent = P.reloading ? 'RELOADING...' : '';
  mmT -= dt; if (mmT <= 0) { mmT = 0.08; drawMinimap(); }
}
function drawMinimap() {
  const S = 300, scale = S / 190, ctx = mm, cfg = W.cfg;
  ctx.save(); ctx.clearRect(0, 0, S, S);
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 6.3); ctx.clip();
  ctx.fillStyle = '#1d4f78'; ctx.fillRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2); ctx.rotate(P.yaw); ctx.scale(scale, scale); ctx.translate(-P.pos.x, -P.pos.z);
  ctx.fillStyle = '#' + new THREE.Color(cfg.gA).getHexString(); ctx.beginPath(); ctx.arc(0, 0, 285, 0, 6.3); ctx.fill();
  W.towns.forEach(t => { ctx.fillStyle = 'rgba(120,100,70,.55)'; ctx.beginPath(); ctx.arc(t.x, t.z, 30, 0, 6.3); ctx.fill(); });
  ctx.fillStyle = '#d9d2c2'; W.houses.forEach(h => ctx.fillRect(h.x - h.w / 2, h.z - h.d / 2, h.w, h.d));
  W.pickups.forEach(p => { if (!p.taken && Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < 40) { ctx.fillStyle = p.kind === 'med' ? '#5ee07a' : '#f5a623'; ctx.fillRect(p.x - 1.2, p.z - 1.2, 2.4, 2.4); } });
  const z = W.zone;
  ctx.beginPath(); ctx.rect(-600, -600, 1200, 1200); ctx.arc(z.cx, z.cz, z.r, 0, 6.3, true); ctx.fillStyle = 'rgba(70,130,255,.35)'; ctx.fill('evenodd');
  ctx.strokeStyle = '#6fb2ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.cx, z.cz, z.r, 0, 6.3); ctx.stroke();
  W.enemies.forEach(e => { if (!e.dead && (gTime - P.lastShot < 2.5 || e.hurtT > 0) && e.pos.distanceTo(P.pos) < 95) { ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(e.pos.x, e.pos.z, 3, 0, 6.3); ctx.fill(); } });
  ctx.restore();
  // player arrow
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(S / 2, S / 2 - 11); ctx.lineTo(S / 2 + 7, S / 2 + 8); ctx.lineTo(S / 2, S / 2 + 4); ctx.lineTo(S / 2 - 7, S / 2 + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function updateAlive() { $('aliveN').textContent = W.enemies.filter(e => !e.dead).length + (P.alive ? 1 : 0); }
function updateWeaponsUI() {
  const el = $('weapons'); el.innerHTML = '';
  P.wp.forEach((w, i) => { const d = document.createElement('div'); d.className = 'wslot' + (i === P.cur ? ' act' : ''); d.innerHTML = '<b>' + (i + 1) + '</b>' + (w ? WEAPONS[w.type].name : '—'); el.appendChild(d); });
  updateAmmoUI();
}
function updateAmmoUI() {
  const w = curWeapon();
  if (!w) { $('wname').textContent = 'UNARMED'; $('ammotxt').innerHTML = '<b>--</b>'; return; }
  $('wname').textContent = WEAPONS[w.type].name + ' · ' + WEAPONS[w.type].type;
  $('ammotxt').innerHTML = w.mag + ' <small>/ ' + w.reserve + '</small>';
}
let msgTimer = 0;
function showMsg(t, ms) { const m = $('msg'); m.textContent = t; m.classList.add('show'); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('show'), ms || 1500); }
function killFeed(html) { const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; $('killfeed').appendChild(d); setTimeout(() => d.remove(), 5000); }
function hitMarker(kill) { const h = $('hitmarker'); h.classList.remove('hm', 'kill'); void h.offsetWidth; h.classList.add('hm'); if (kill) h.classList.add('kill'); }

/* ------------------------------ overlay / flow ------------------------------ */
function showOverlay(title, sub, mainLabel, over, stats) {
  $('ovTitle').textContent = title; $('ovSub').textContent = sub; $('ovMain').textContent = mainLabel;
  $('ovStats').innerHTML = stats || '';
  $('overlay').classList.remove('hidden');
  $('ovMain').dataset.mode = over ? 'again' : 'resume';
}
function endMatch(won) {
  state = 'over'; document.exitPointerLock && document.exitPointerLock();
  const rank = W.enemies.filter(e => !e.dead).length + 1;
  const stats = '<div>KILLS<b>' + P.kills + '</b></div><div>RANK<b>#' + (won ? 1 : rank) + '</b></div><div>TIME<b>' + Math.floor(gTime / 60) + ':' + String(Math.floor(gTime % 60)).padStart(2, '0') + '</b></div>';
  setTimeout(() => {
    showOverlay(won ? 'WINNER WINNER!' : 'YOU DIED', won ? 'CHICKEN DINNER · LAST ONE STANDING' : 'BETTER LUCK NEXT TIME', 'PLAY AGAIN', true, stats);
  }, won ? 300 : 900);
}
function toLobby() {
  state = 'lobby'; $('overlay').classList.add('hidden'); $('hud').classList.add('hidden'); $('lobby').classList.remove('hidden');
  Object.keys(keys).forEach(k => keys[k] = false); mouse.l = mouse.r = false;
  document.exitPointerLock && document.exitPointerLock();
  if (W) { disposeWorld(); }
}
function requestLock() {
  audio();
  if (touchMode) { fallbackLook = true; resumePlay(); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); return; }
  if (canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => lockFailed()); } catch (e) { lockFailed(); } }
  else lockFailed();
}
function lockFailed() { fallbackLook = true; resumePlay(); }
function resumePlay() { state = 'playing'; $('overlay').classList.add('hidden'); }

$('ovMain').addEventListener('click', () => {
  if ($('ovMain').dataset.mode === 'again') { startMatch(); return; }
  requestLock();
});
$('ovLobby').addEventListener('click', toLobby);
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) { fallbackLook = false; resumePlay(); }
  else if (state === 'playing' && !fallbackLook) { state = 'paused'; Object.keys(keys).forEach(k => keys[k] = false); mouse.l = mouse.r = false; showOverlay('PAUSED', 'CLICK RESUME TO CONTINUE', 'RESUME', false); }
});
document.addEventListener('pointerlockerror', lockFailed);
window.addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); mouse.l = mouse.r = false; });

/* ------------------------ mobile touch controls ------------------------ */
const touchMode = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
(function setupTouchControls(){
  const root = $('mobileControls');
  if (!root) return;
  const pad = $('movePad'), stick = $('moveStick'), look = $('lookPad');
  let movePointer = null, lookPointer = null, lastX = 0, lastY = 0;
  const clearMove = () => {
    movePointer = null; keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false;
    stick.style.transform = 'translate(0px,0px)';
  };
  pad.addEventListener('pointerdown', e => {
    if (state !== 'playing') return;
    movePointer = e.pointerId; pad.setPointerCapture(e.pointerId); updateMove(e);
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === movePointer) updateMove(e); });
  pad.addEventListener('pointerup', e => { if (e.pointerId === movePointer) clearMove(); });
  pad.addEventListener('pointercancel', clearMove);
  function updateMove(e){
    const r=pad.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    const max=r.width*.29, dx=e.clientX-cx, dy=e.clientY-cy, len=Math.hypot(dx,dy), k=len>max?max/len:1;
    const x=dx*k, y=dy*k;
    stick.style.transform=`translate(${x}px,${y}px)`;
    keys.KeyA=x < -max*.22; keys.KeyD=x > max*.22;
    keys.KeyW=y < -max*.22; keys.KeyS=y > max*.22;
  }
  look.addEventListener('pointerdown', e=>{
    if(state!=='playing') return;
    lookPointer=e.pointerId; look.setPointerCapture(e.pointerId); lastX=e.clientX; lastY=e.clientY;
  });
  look.addEventListener('pointermove', e=>{
    if(e.pointerId!==lookPointer || state!=='playing') return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    const sens=0.0042*(gameCam.fov/72);
    P.yaw-=dx*sens; P.pitch-=dy*sens;
  });
  const actions={
    fire:{down:()=>{mouse.l=true;mouse.edge=true;audio();},up:()=>mouse.l=false},
    aim:{down:()=>mouse.r=true,up:()=>mouse.r=false},
    jump:{down:()=>{if(P.stance!==0)P.stance=0;else if(P.onGround&&P.alive){P.vy=7;P.onGround=false;}}},
    crouch:{down:()=>{P.stance=P.stance===1?0:1;}},
    prone:{down:()=>{P.stance=P.stance===2?0:2;}},
    reload:{down:()=>startReload()},
    pickup:{down:()=>{if(P.alive)tryPickup();}},
    weapon:{down:()=>{for(let n=1;n<=3;n++){const i=(P.cur+n)%3;if(P.wp[i]){equip(i);break;}}}}
  };
  root.querySelectorAll('[data-action]').forEach(btn=>{
    const a=actions[btn.dataset.action]; if(!a)return;
    btn.addEventListener('pointerdown',e=>{
      e.preventDefault(); if(state!=='playing')return;
      btn.setPointerCapture(e.pointerId); btn.classList.add('pressed'); a.down();
    });
    const release=e=>{btn.classList.remove('pressed'); if(a.up)a.up();};
    btn.addEventListener('pointerup',release); btn.addEventListener('pointercancel',release);
    btn.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('orientationchange',()=>{ if(screen.orientation&&screen.orientation.lock&&state==='playing') screen.orientation.lock('landscape').catch(()=>{}); });
  window.addEventListener('blur',()=>{clearMove();lookPointer=null;mouse.l=mouse.r=false;});
})();

/* ------------------------------ input ------------------------------ */
window.addEventListener('keydown', (e) => {
  if (state !== 'playing') return;
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (P.stance !== 0) { P.stance = 0; }
      else if (P.onGround && P.alive) { P.vy = 7; P.onGround = false; }
      break;
    case 'KeyC': P.stance = P.stance === 1 ? 0 : 1; break;
    case 'KeyZ': P.stance = P.stance === 2 ? 0 : 2; break;
    case 'KeyF': if (P.alive) tryPickup(); break;
    case 'KeyR': startReload(); break;
    case 'Digit1': equip(0); break;
    case 'Digit2': equip(1); break;
    case 'Digit3': equip(2); break;
    case 'KeyX': unequip(); break;
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousedown', (e) => {
  if (state !== 'playing') return;
  if (e.button === 0) { mouse.l = true; mouse.edge = true; audio(); } else if (e.button === 2) mouse.r = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; else if (e.button === 2) mouse.r = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousemove', (e) => {
  if (state !== 'playing' || !(locked || fallbackLook)) return;
  const sens = 0.0022 * (gameCam.fov / 72);
  P.yaw -= e.movementX * sens; P.pitch -= e.movementY * sens;
});
window.addEventListener('wheel', (e) => {
  if (state !== 'playing') return;
  const dir = e.deltaY > 0 ? 1 : -1; let i = P.cur;
  const cw = curWeapon(), cd = cw ? WEAPONS[cw.type] : null;
  if (cd && cd.zooms && cd.zooms.length > 1 && P.ads > 0.4) { P.scopeIdx = clamp(P.scopeIdx + (dir > 0 ? -1 : 1), 0, cd.zooms.length - 1); beep(900, 0, 0.03, 0.05, 'triangle'); return; }
  for (let n = 0; n < 3; n++) { i = (i + dir + 3) % 3; if (P.wp[i]) { equip(i); break; } }
});

/* ------------------------------ lobby UI ------------------------------ */
document.querySelectorAll('.mapcard').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.mapcard').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel'); selectedMap = card.dataset.map;
    $('startSub').textContent = MAPS[selectedMap].name + ' · SOLO'; beep(600, 800, 0.08, 0.05, 'triangle');
  });
});
document.querySelectorAll('#outfits .dot').forEach(d => {
  d.addEventListener('click', () => {
    document.querySelectorAll('#outfits .dot').forEach(x => x.classList.remove('sel')); d.classList.add('sel');
    buildLobbyChar(+d.dataset.i);
  });
});
$('startBtn').addEventListener('click', () => { 
  if (MP.socket) { try { MP.socket.close(); } catch (_) {} }
  MP.mode = 'solo'; MP.room = null; MP.playerId = null; MP.connected = false; mpClearRemotes();
  $('mpHudStatus').classList.add('hidden');
  audio(); beep(300, 700, 0.2, 0.08, 'sawtooth'); startMatch(); 
});
$('mpCreate').addEventListener('click', () => { audio(); mpConnect('create'); });
$('mpJoin').addEventListener('click', () => {
  if (!$('mpRoom').value.trim()) { mpStatus('Enter your friend’s room code first', false); return; }
  audio(); mpConnect('join');
});

/* ------------------------------ main loop ------------------------------ */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  lobby.cam.aspect = w / h; lobby.cam.updateProjectionMatrix();
  gameCam.aspect = w / h; gameCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'splash' || state === 'lobby') {
    lobby.t += dt;
    if (lobby.char) { lobby.char.update(dt, { s: 0, speed: 0, gun: false }); if (lobby.char.upper) lobby.char.upper.position.y = Math.sin(lobby.t * 1.8) * 0.006; }
    renderer.render(lobby.scene, lobby.cam);
  } else if (W) {
    if (state === 'playing') updatePlay(dt);
    renderer.render(W.scene, gameCam);
  }
}
requestAnimationFrame(frame);

/* ------------------------------ splash ------------------------------ */
(function splash() {
  const steps = ['Loading assets...', 'Building maps...', 'Preparing weapons...', 'Connecting to lobby...'];
  let p = 0, t0 = performance.now(), modelDone = false;
  setTimeout(() => loadHuman((ok) => { modelDone = true; buildLobbyChar(lobby.outfit); }), 120);   // decode + parse the soldier model
  const iv = setInterval(() => {
    p = Math.min(100, ((performance.now() - t0) / 2800) * 100);
    if (!modelDone) p = Math.min(p, 92);
    $('loadfill').style.width = p + '%';
    $('loadtxt').textContent = steps[Math.min(3, Math.floor(p / 25.1))];
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        $('splash').classList.add('fade'); $('lobby').classList.remove('hidden'); state = 'lobby';
        setTimeout(() => $('splash').classList.add('hidden'), 650);
      }, 250);
    }
  }, 40);
})();

// debug / test hooks
window.__bz = { get state() { return state; }, P, keys, mouse, get W() { return W; }, startMatch, resumePlay, equip, tryPickup, setMap: (m) => { selectedMap = m; }, endMatch, gameCam, curWeapon, WEAPONS, spawnPickup };
})();
