// Partikel und Effekte
const R = Math.random;

// ---------- vorgerenderte Partikeltexturen ----------
function mk(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function noiseBlob(n, seed, soft) {
  // Blumenkohl-Ballen: viele beleuchtete Kugeln, weicher Rand
  const cv = mk(n), c = cv.getContext('2d'), m = n / 2;
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const balls = [];
  for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, d = Math.pow(rnd(), 0.6) * m * 0.42; balls.push([m + Math.cos(a) * d, m + Math.sin(a) * d, m * (0.16 + rnd() * 0.2)]); }
  balls.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
  for (const [x, y, r] of balls.reverse()) {
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(200,200,200,0.85)'); g.addColorStop(1, 'rgba(120,120,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
  }
  c.globalCompositeOperation = 'destination-in';
  const e = c.createRadialGradient(m, m, m * 0.3, m, m, m); e.addColorStop(0, `rgba(0,0,0,${soft})`); e.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = e; c.fillRect(0, 0, n, n);
  return cv;
}
const BLOBS = [];
function blob(i) { if (!BLOBS.length) for (let k = 0; k < 6; k++) BLOBS.push(noiseBlob(64, 1234 + k * 977, 1)); return BLOBS[i % BLOBS.length]; }
const TINT = new Map();
export function tintedBlob(col, i) {
  const q = col.split(',').map((v) => Math.round(+v / 12) * 12).join(','), key = q + '|' + (i % 6);
  let cv = TINT.get(key);
  if (!cv) {
    cv = mk(64); const c = cv.getContext('2d'); c.drawImage(blob(i), 0, 0);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgb(${q})`; c.fillRect(0, 0, 64, 64);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(blob(i), 0, 0);
    if (TINT.size > 400) TINT.clear();
    TINT.set(key, cv);
  }
  return cv;
}
const FLAMES = [];
function flame(stage) {
  if (!FLAMES.length) {
    const cols = [['255,250,225', '255,200,90'], ['255,200,90', '240,110,30'], ['230,100,30', '140,40,15']];
    for (const [a, b] of cols) {
      const cv = mk(64), c = cv.getContext('2d');
      for (let i = 0; i < 14; i++) {
        const x = 32 + (R() - 0.5) * 26, y = 32 + (R() - 0.5) * 26, r = 8 + R() * 12;
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${a},0.7)`); g.addColorStop(0.5, `rgba(${b},0.4)`); g.addColorStop(1, `rgba(${b},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
      }
      FLAMES.push(cv);
    }
  }
  return FLAMES[stage];
}
const SCORCH = [];
function scorch(i) {
  if (!SCORCH.length) for (let v = 0; v < 4; v++) {
    const n = 96, cv = mk(n), c = cv.getContext('2d'), m = n / 2;
    for (let k = 0; k < 30; k++) {
      const a = R() * 6.28, d = R() * m * 0.45, x = m + Math.cos(a) * d, y = m + Math.sin(a) * d, r = m * (0.2 + R() * 0.35);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(20,12,8,0.35)'); g.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
    }
    c.strokeStyle = 'rgba(15,8,5,0.5)'; c.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      let a = R() * 6.28, x = m, y = m; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y);
      for (let j = 0; j < 6; j++) { a += (R() - 0.5) * 0.7; x += Math.cos(a) * 6; y += Math.sin(a) * 6; c.lineTo(x, y); c.lineWidth *= 0.8; }
      c.stroke();
    }
    for (let k = 0; k < 40; k++) { const a = R() * 6.28, d = m * (0.4 + R() * 0.55); c.fillStyle = `rgba(25,15,10,${0.2 + R() * 0.4})`; c.fillRect(m + Math.cos(a) * d, m + Math.sin(a) * d, 1.5 + R() * 2, 1.5 + R() * 2); }
    SCORCH.push(cv);
  }
  return SCORCH[i % 4];
}

export class FX {
  constructor() { this.p = []; this.decals = []; this.corpses = []; this.tracks = []; this.shake = 0; }

  add(o) {
    if (this.p.length > 3000) return;
    o.t = 0; o.z = o.z || 0; o.vx = o.vx || 0; o.vy = o.vy || 0; o.vz = o.vz || 0; o.rot = o.rot ?? R() * 6.28; o.vr = o.vr ?? (R() - 0.5) * 1.2; o.v = o.v ?? (R() * 6 | 0);
    this.p.push(o);
  }

  dust(x, y, n = 1, col = '196,150,96', spread = 6, size = 5) {
    for (let i = 0; i < n; i++) this.add({ kind: 'puff', x: x + (R() - 0.5) * spread, y: y + (R() - 0.5) * spread, vx: (R() - 0.5) * 14, vy: (R() - 0.5) * 14 - 4, life: 0.9 + R() * 0.8, size: size + R() * 3, grow: 14, col, a: 0.35 });
  }
  smoke(x, y, n = 1, size = 6, dark = 0.5) {
    for (let i = 0; i < n; i++) {
      const c = Math.round(60 + R() * 40 * (1 - dark));
      this.add({ kind: 'puff', x: x + (R() - 0.5) * 6, y: y + (R() - 0.5) * 6, vx: (R() - 0.5) * 10 + 6, vy: -8 - R() * 10, life: 1.4 + R() * 1.4, size: size + R() * 4, grow: 16, col: `${c},${c - 6},${c - 10}`, a: 0.5, air: true });
    }
  }
  fire(x, y, n = 1, size = 5) {
    for (let i = 0; i < n; i++) this.add({ kind: 'flame', x: x + (R() - 0.5) * 8, y: y + (R() - 0.5) * 8, vx: (R() - 0.5) * 20, vy: -10 - R() * 20, life: 0.35 + R() * 0.45, size: size + R() * 4, grow: 6, a: 0.95 });
  }
  spark(x, y, n = 4, col = '255,220,140', speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = speed * (0.4 + R());
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.2 + R() * 0.3, size: 1.5, col, a: 1 });
    }
  }
  flash(x, y, size = 20, col = '255,200,120', life = 0.12) {
    this.add({ kind: 'glow', x, y, life, size, grow: size * 2, col, a: 1 });
  }
  ring(x, y, size = 10, col = '255,230,190', life = 0.4) {
    this.add({ kind: 'ring', x, y, life, size, grow: size * 6, col, a: 0.7 });
  }
  muzzle(x, y, ang, size = 1) {
    // gerichteter Mündungsblitz mit Strahlen
    this.add({ kind: 'glow', x: x + Math.cos(ang) * 4 * size, y: y + Math.sin(ang) * 4 * size, life: 0.07, size: 9 * size, grow: 30, col: '255,220,150', a: 1 });
    for (let k = -1; k <= 1; k++) { const a = ang + k * 0.35; this.add({ kind: 'line', x, y, x2: x + Math.cos(a) * 14 * size * (k ? 0.6 : 1), y2: y + Math.sin(a) * 14 * size * (k ? 0.6 : 1), life: 0.06, col: '255,235,180', a: 1 }); }
  }
  casing(x, y, ang) {
    const a = ang + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.add({ kind: 'debris', x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, vz: 50 + Math.random() * 30, life: 0.7, size: 1.3, col: '220,180,90', a: 1 });
  }
  tracer(x1, y1, x2, y2, col = '255,230,150') {
    this.add({ kind: 'line', x: x1, y: y1, x2, y2, life: 0.07, col, a: 0.9 });
  }
  debris(x, y, n = 6, col = '60,50,40') {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = 40 + R() * 90;
      this.add({ kind: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 60 + R() * 120, life: 0.8 + R() * 0.6, size: 1.5 + R() * 2.5, col, a: 1 });
    }
  }
  sandBurst(x, y, n = 30, radius = 30, dustN = 18) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = 30 + R() * 110;
      this.add({ kind: 'debris', x: x + Math.cos(a) * radius * R(), y: y + Math.sin(a) * radius * R(), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 80 + R() * 200, life: 0.9 + R() * 0.8, size: 2 + R() * 3, col: '214,168,104', a: 1 });
    }
    this.dust(x, y, dustN, '206,160,100', radius * 1.6, 12);
  }

  explosion(x, y, size = 1) {
    // Bodenlicht, Blitz, Feuerball aus Flammenballen, Druckwelle, Staubring, Trümmer mit Rauchspur, Glut
    this.add({ kind: 'glow', x, y, life: 0.45, size: 70 * size, grow: 30, col: '255,150,60', a: 0.55 });
    this.flash(x, y, 24 * size, '255,245,220', 0.12);
    this.ring(x, y, 8 * size, '255,235,200', 0.3);
    for (let i = 0; i < 10 * size; i++) {
      const a = R() * 6.28, sp = (20 + R() * 55) * size;
      this.add({ kind: 'fireball', x: x + Math.cos(a) * 3, y: y + Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 14, life: 0.9 + R() * 0.6, size: (6 + R() * 6) * size, grow: 14 * size, a: 1, air: true });
    }
    for (let i = 0; i < 6 * size; i++) {
      const a = R() * 6.28, sp = (15 + R() * 40) * size;
      this.add({ kind: 'flame', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 10, life: 0.3 + R() * 0.3, size: (6 + R() * 5) * size, grow: 14 * size, a: 0.6 });
    }
    for (let i = 0; i < 14 * size; i++) {
      const a = (i / (14 * size)) * 6.28, sp = (70 + R() * 30) * size;
      this.add({ kind: 'puff', x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, life: 0.9 + R() * 0.5, size: 5 * size, grow: 16, col: '196,150,98', a: 0.45 });
    }
    for (let i = 0; i < 7 * size; i++) this.add({ kind: 'puff', x: x + (R() - 0.5) * 14 * size, y: y + (R() - 0.5) * 10 * size, vx: (R() - 0.5) * 18 + 5, vy: -10 - R() * 16, life: 1.8 + R() * 1.6, size: (8 + R() * 6) * size, grow: 12, col: `${52 + R() * 30 | 0},${46 + R() * 24 | 0},${40 + R() * 20 | 0}`, a: 0.7, air: true, delay: 0.15 });
    this.spark(x, y, Math.round(14 * size), '255,210,130', 190 * size);
    for (let i = 0; i < 6 * size; i++) {
      const a = R() * 6.28, sp = 50 + R() * 110;
      this.add({ kind: 'chunk', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 90 + R() * 160, life: 1 + R() * 0.7, size: 1.8 + R() * 2.6, col: R() < 0.5 ? '70,58,46' : '48,40,34', a: 1, trail: R() < 0.6 });
    }
    for (let i = 0; i < 10 * size; i++) this.add({ kind: 'glow', x: x + (R() - 0.5) * 20 * size, y: y + (R() - 0.5) * 16 * size, vx: (R() - 0.5) * 20, vy: -14 - R() * 24, life: 1 + R() * 1.2, size: 1.6, grow: 0, col: '255,170,80', a: 0.9 });
    this.decal(x, y, 12 * size + 6);
    this.shake = Math.max(this.shake, 2.5 * size);
    if (size >= 1.1) {
      // Pilzförmige Rauchsäule
      for (let k = 0; k < 9 * size; k++) this.add({ kind: 'puff', x: x + (R() - 0.5) * 10, y: y - k * 3, vx: 4 + R() * 6, vy: -20 - R() * 14 - k * 2.2, life: 2.4 + R() * 1.8, size: (7 + R() * 6) * Math.min(1.6, size), grow: 11, col: `${42 + R() * 24 | 0},${37 + R() * 20 | 0},${33 + R() * 16 | 0}`, a: 0.65, air: true });
    }
  }
  corpse(x, y, a, color, n = 2) {
    for (let k = 0; k < n; k++) this.corpses.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 12, a: a + (Math.random() - 0.5) * 1.5, color, t: 0 });
    if (this.corpses.length > 60) this.corpses.splice(0, this.corpses.length - 60);
  }
  track(x, y, a, w = 7) {
    this.tracks.push({ x, y, a, w, t: 0 });
    if (this.tracks.length > 900) this.tracks.splice(0, 100);
  }
  decal(x, y, r) {
    this.decals.push({ x, y, r, a: 0.75, rot: R() * 6, v: R() * 4 | 0 });
    if (this.decals.length > 160) this.decals.shift();
  }

  update(dt) {
    const p = this.p;
    let w = 0;
    for (let i = 0; i < p.length; i++) {
      const o = p[i];
      if (o.delay > 0) { o.delay -= dt; p[w++] = o; continue; }
      o.t += dt;
      if (o.t >= o.life) continue;
      o.rot += o.vr * dt;
      if (o.kind === 'chunk') {
        o.vz -= 380 * dt; o.z += o.vz * dt;
        if (o.z < 0) { o.z = 0; o.vz *= -0.3; o.vx *= 0.5; o.vy *= 0.5; o.vr *= 0.5; }
        if (o.trail && o.z > 3 && R() < 0.6) this.p.push({ kind: 'puff', x: o.x, y: o.y - o.z * 0.5, vx: 0, vy: -4, vz: 0, z: 0, t: 0, life: 0.6, size: 1.5, grow: 8, col: '70,62,55', a: 0.45, air: true, rot: R() * 6, vr: 0, v: R() * 6 | 0 });
      }
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.kind === 'debris') {
        o.vz -= 380 * dt; o.z += o.vz * dt;
        if (o.z < 0) { o.z = 0; o.vz *= -0.3; o.vx *= 0.6; o.vy *= 0.6; }
      } else if (o.kind !== 'chunk') { o.vx *= 1 - dt * 1.5; o.vy *= 1 - dt * 1.5; }
      if (o.grow) o.size = Math.max(0.5, o.size + o.grow * dt);
      p[w++] = o;
    }
    p.length = w;
    for (const d of this.decals) d.a = Math.max(0.15, d.a - dt * 0.004);
    for (const c of this.corpses) c.t += dt;
    for (const k of this.tracks) k.t += dt;
    if (this.tracks.length && this.tracks[0].t > 45) this.tracks = this.tracks.filter((k) => k.t < 45);
    if (this.corpses.length && this.corpses[0].t > 25) this.corpses = this.corpses.filter((c) => c.t < 25);
    this.shake = Math.max(0, this.shake - dt * 12);
  }

  drawDecals(ctx) {
    ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const k of this.tracks) {
      const a = (1 - k.t / 45) * 0.22, ca = Math.cos(k.a), sa = Math.sin(k.a), px = -sa * k.w, py = ca * k.w;
      ctx.strokeStyle = `rgba(90,60,35,${a})`;
      ctx.beginPath();
      ctx.moveTo(k.x + px - ca * 3, k.y + py - sa * 3); ctx.lineTo(k.x + px + ca * 3, k.y + py + sa * 3);
      ctx.moveTo(k.x - px - ca * 3, k.y - py - sa * 3); ctx.lineTo(k.x - px + ca * 3, k.y - py + sa * 3);
      ctx.stroke();
    }
    for (const c of this.corpses) {
      const a = Math.min(1, (25 - c.t) / 5) * 0.85;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(1, 1.5, 8, 4, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#5e5242'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#7a6a55'; ctx.beginPath(); ctx.arc(6.5, 0, 2.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = c.color; ctx.fillRect(-2, -2.6, 2.5, 2);
      ctx.strokeStyle = '#22252a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(5, 6); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const d of this.decals) {
      const sp = scorch(d.v);
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.globalAlpha = d.a;
      ctx.drawImage(sp, -d.r * 1.25, -d.r * 1.25, d.r * 2.5, d.r * 2.5); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // layer: 'ground' (Staub), 'air' (Rauch/Trümmer), 'add' (Leuchten)
  draw(ctx, layer, view) {
    const add = layer === 'add';
    if (add) ctx.globalCompositeOperation = 'lighter';
    for (const o of this.p) {
      if (o.delay > 0 || o.x < view.x0 || o.x > view.x1 || o.y < view.y0 || o.y > view.y1) continue;
      const k = 1 - o.t / o.life;
      if (add) {
        if (o.kind === 'glow') {
          const r = o.size;
          const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
          g.addColorStop(0, `rgba(${o.col},${o.a * k})`);
          g.addColorStop(1, `rgba(${o.col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.283); ctx.fill();
        } else if (o.kind === 'flame') {
          const st = k > 0.66 ? 0 : k > 0.33 ? 1 : 2, r = o.size;
          ctx.globalAlpha = Math.min(1, o.a * k);
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.drawImage(flame(st), -r, -r, r * 2, r * 2); ctx.restore();
          ctx.globalAlpha = 1;
        } else if (o.kind === 'spark') {
          ctx.strokeStyle = `rgba(${o.col},${k})`; ctx.lineWidth = o.size;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - o.vx * 0.03, o.y - o.vy * 0.03); ctx.stroke();
        } else if (o.kind === 'line') {
          ctx.strokeStyle = `rgba(${o.col},${o.a * k})`; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x2, o.y2); ctx.stroke();
        } else if (o.kind === 'ring') {
          ctx.strokeStyle = `rgba(${o.col},${o.a * k})`; ctx.lineWidth = 2.5 * k + 0.5;
          ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, 6.283); ctx.stroke();
        }
      } else if (o.kind === 'puff' && (!!o.air === (layer === 'air'))) {
        const fade = o.t < 0.15 ? o.t / 0.15 : 1;
        ctx.globalAlpha = Math.min(1, o.a * k * fade * 1.6);
        const r = o.size * 1.25;
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.drawImage(tintedBlob(o.col, o.v), -r, -r, r * 2, r * 2); ctx.restore();
        ctx.globalAlpha = 1;
      } else if (o.kind === 'fireball' && layer === 'air') {
        // Feuerball: glühend gelb -> orange -> dunkler Rauch
        const age = 1 - k, lerp = (a, b, f) => a + (b - a) * f;
        const f1 = Math.min(1, age / 0.35), f2 = Math.max(0, (age - 0.35) / 0.65);
        const col = age < 0.35 ? [lerp(255, 225, f1), lerp(210, 95, f1), lerp(120, 30, f1)] : [lerp(225, 58, f2), lerp(95, 50, f2), lerp(30, 44, f2)];
        const r = o.size * 1.3;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.drawImage(tintedBlob(col.map((v) => v | 0).join(','), o.v), -r, -r, r * 2, r * 2); ctx.restore();
        ctx.globalAlpha = 1;
      } else if (o.kind === 'chunk' && layer === 'air') {
        ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`; ctx.fillRect(o.x - o.size / 2 + 2, o.y - o.size / 2 + 2, o.size, o.size * 0.7);
        ctx.save(); ctx.translate(o.x, o.y - o.z * 0.5); ctx.rotate(o.rot); ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = `rgb(${o.col})`; ctx.beginPath(); ctx.moveTo(-o.size, -o.size * 0.4); ctx.lineTo(o.size * 0.3, -o.size * 0.7); ctx.lineTo(o.size, o.size * 0.3); ctx.lineTo(-o.size * 0.4, o.size * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,180,0.25)'; ctx.fillRect(-o.size * 0.6, -o.size * 0.5, o.size * 0.8, o.size * 0.3);
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (o.kind === 'debris' && layer === 'air') {
        ctx.fillStyle = `rgba(0,0,0,${0.25 * k})`;
        ctx.fillRect(o.x - o.size / 2 + 2, o.y - o.size / 2 + 2, o.size, o.size);
        ctx.fillStyle = `rgba(${o.col},${k})`;
        ctx.fillRect(o.x - o.size / 2, o.y - o.z * 0.5 - o.size / 2, o.size, o.size);
      }
    }
    if (add) ctx.globalCompositeOperation = 'source-over';
  }
}
