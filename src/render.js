// Renderer: Kamera, Gelände, Zonen, Markierungen, Einheiten, Nebel
import { drawSymbolLayer } from './symbols.js';
import { center, hexPath, R, HW, ring, distance, pixelToHex } from './hex.js';
import { drawUnit, drawBuilding } from './sprites.js';
import { drawTower } from './wart.js';
import { clamp, rgba, Noise, smoothstep } from './util.js';
import { tintedBlob } from './fx.js';

const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; } })();

export class Renderer {
  constructor(canvas, game, fx) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.g = game; this.fx = fx;
    this.cam = { x: 0, y: 0, z: 1 };
    this.floaters = [];
    this.hl = { move: null, attack: [], build: [], drop: [], target: [], path: null, sel: null, hover: null, forecast: null };
    this.pods = [];
    this.ships = [];
    this.t = 0;
    this.fogDirty = true;
    this.wrecks = []; this.rubble = []; this.bolts = [];
    this.light = [255, 255, 255]; this.nightK = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.clampCam();
  }

  // ---------- Kamera ----------
  s2w(sx, sy) { return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y }; }
  w2s(wx, wy) { return { x: (wx - this.cam.x) * this.cam.z, y: (wy - this.cam.y) * this.cam.z }; }
  clampCam() {
    const ms = this.g.map.size, z = this.cam.z;
    const vw = this.vw / z, vh = this.vh / z;
    this.cam.x = ms.w < vw ? (ms.w - vw) / 2 : clamp(this.cam.x, -60, ms.w - vw + 60);
    this.cam.y = ms.h < vh ? (ms.h - vh) / 2 : clamp(this.cam.y, -60, ms.h - vh + 60);
  }
  zoomAt(sx, sy, f) {
    const before = this.s2w(sx, sy);
    this.cam.z = clamp(this.cam.z * f, 0.25, 2.2);
    this.cam.x = before.x - sx / this.cam.z; this.cam.y = before.y - sy / this.cam.z;
    this.clampCam();
  }
  centerOn(x, y, smooth = true) {
    const tx = x - this.vw / this.cam.z / 2, ty = y - this.vh / this.cam.z / 2;
    if (smooth) this.camTarget = { x: tx, y: ty }; else { this.camTarget = null; this.cam.x = tx; this.cam.y = ty; this.clampCam(); }
  }

  // ---------- Hilfen ----------
  microPattern(ctx) {
    if (this._micro) return this._micro;
    const n = 512, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const c = cv.getContext('2d'), img = c.createImageData(n, n), h = new Float32Array(n * n);
    const N = new Noise(4711);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      // kachelbar: Rauschen auf einem Torus
      const a = x / n * 6.2832, b = y / n * 6.2832;
      h[y * n + x] = N.fbm(Math.cos(a) * 9 + 20, Math.sin(a) * 9 + Math.cos(b) * 9, 3) * 0.6 + Math.random() * 0.4;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, dx = h[y * n + ((x + 1) % n)] - h[y * n + ((x - 1 + n) % n)], dy = h[((y + 1) % n) * n + x] - h[((y - 1 + n) % n) * n + x];
      const v = clamp(-(dx + dy) * 1.25, -1, 1);
      img.data[i * 4] = img.data[i * 4 + 1] = v > 0 ? 245 : 20; img.data[i * 4 + 2] = v > 0 ? 225 : 10; img.data[i * 4 + 3] = Math.abs(v) * 80;
    }
    c.putImageData(img, 0, 0);
    const p = ctx.createPattern(cv, 'repeat');
    if (p.setTransform) p.setTransform(new DOMMatrix().scale(0.5, 0.5));
    return (this._micro = p);
  }

  // Zeichnet über einen kleinen Puffer und färbt ein — schneller als ctx.filter
  tinted(ctx, x, y, tint, draw, size = 170) {
    const k = this.cam.z * this.dpr, S = Math.ceil(size * k);
    const oc = this._oc || (this._oc = document.createElement('canvas'));
    if (oc.width !== S) { oc.width = S; oc.height = S; }
    const o = oc.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, S, S);
    o.setTransform(k, 0, 0, k, S / 2, S / 2);
    draw(o);
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop'; o.fillStyle = tint; o.fillRect(0, 0, S, S);
    ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
  }

  float(x, y, text, color = '#fff', big = false) { this.floaters.push({ x, y, text, color, t: 0, life: 1.4, big }); }

  posOf(e) { if (e.vis) return e.vis; const p = center(e.c, e.r); return p; }

  // ---------- Zeichnen ----------
  draw(dt) {
    this.t += dt;
    const { ctx, g, cam } = this;
    if (this.camTarget) {
      cam.x += (this.camTarget.x - cam.x) * Math.min(1, dt * 6); cam.y += (this.camTarget.y - cam.y) * Math.min(1, dt * 6);
      if (Math.hypot(this.camTarget.x - cam.x, this.camTarget.y - cam.y) < 1) this.camTarget = null;
      this.clampCam();
    }
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c0f0a'; ctx.fillRect(0, 0, this.vw, this.vh);
    const sh = this.fx.shake;
    const ox = sh ? (Math.random() - 0.5) * sh * 2 : 0, oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, (-cam.x * cam.z + ox) * dpr, (-cam.y * cam.z + oy) * dpr);
    const view = { x0: cam.x - 80, y0: cam.y - 80, x1: cam.x + this.vw / cam.z + 80, y1: cam.y + this.vh / cam.z + 80 };
    this.view = view;
    const inView = (p, m = 0) => p.x > view.x0 - m && p.x < view.x1 + m && p.y > view.y0 - m && p.y < view.y1 + m;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(g.map.base, 0, 0);
    if (cam.z > 1.3) {
      const mp = this.microPattern(ctx);
      ctx.globalAlpha = Math.min(0.5, (cam.z - 1.3) * 0.7);
      ctx.fillStyle = mp; ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
      ctx.globalAlpha = 1;
    }
    this.drawWater(ctx);
    this.drawRubbleHexes(ctx);

    // Raster
    ctx.strokeStyle = 'rgba(20,25,10,0.13)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) { const p = center(c, r); if (inView(p)) hexPath(ctx, p.x, p.y, R - 0.5); }
    ctx.stroke();

    this.drawZones(ctx);
    this.drawSafeZones(ctx);
    this.fx.drawDecals(ctx);
    for (const tw of g.towers) {
      const p = center(tw.c, tw.r); if (!inView(p, 40)) continue;
      drawTower(ctx, p.x, p.y, tw.owner >= 0 ? g.players[tw.owner].color : null, this.t + tw.i, tw.cd);
    }
    this.drawWrecks(ctx, dt);

    // Gebäude
    const bs = g.buildings.filter((b) => !b.gone && g.seen(b)).sort((a, b) => a.r - b.r);
    for (const b of bs) {
      const p = this.posOf(b);
      if (!inView(p, 90)) continue;
      const col = g.players[b.owner].color;
      const bo = { recoil: b.recoil || 0, turret: b.turretAim };
      if (b.hitFlash > 0.05) this.tinted(ctx, p.x, p.y, `rgba(255,255,255,${b.hitFlash * 0.6})`, (o) => drawBuilding(o, b, 0, 0, col, this.t, bo), 120);
      else drawBuilding(ctx, b, p.x, p.y, col, this.t, bo);
      const hpk = b.hp / b.maxHp;
      if (hpk < 0.6 && !b.turnsLeft && Math.random() < 0.05) this.fx.smoke(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 24, 1, 5, 0.8);
      if (hpk < 0.3 && !b.turnsLeft && Math.random() < 0.08) this.fx.fire(p.x + (Math.random() - 0.5) * 26, p.y + (Math.random() - 0.5) * 20, 1, 4);
    }

    // Einheiten
    const visU = g.units.filter((u) => !u.gone && !u.carried && !u.hidden && (g.seen(u) || u.forceShow));
    const ground = visU.filter((u) => u.def.mt !== 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    const air = visU.filter((u) => u.def.mt === 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    const symMode = cam.z < 0.55; this.symMode = symMode;
    if (symMode) ctx.globalAlpha = 0.7;
    for (const u of ground) if (inView(this.posOf(u), 60)) this.drawUnitFull(ctx, u);
    ctx.globalAlpha = 1;
    this.fx.draw(ctx, 'ground', view);
    this.fx.draw(ctx, 'air', view);
    if (symMode) ctx.globalAlpha = 0.7;
    for (const u of air) if (inView(this.posOf(u), 80)) this.drawUnitFull(ctx, u);
    ctx.globalAlpha = 1;
    this.drawProjectiles(ctx);
    this.drawSmokeMarks(ctx, [...ground, ...air]);
    this.fx.draw(ctx, 'add', view);
    this.drawClouds(ctx, dt);
    this.drawLighting(ctx, dt, bs, [...ground, ...air]);
    if (g.weather === 'regen' || this.rainK > 0.01) this.drawRain(ctx, dt, view);

    this.drawFog(ctx);
    this.drawZoneMarks(ctx);
    this.drawHighlights(ctx);

    if (symMode) drawSymbolLayer(ctx, g, Math.min(4, 1.15 / cam.z), this.t, { posOf: (u) => this.posOf(u) });
    else {
      for (const u of [...ground, ...air]) this.drawBadges(ctx, u);
      for (const b of bs) this.drawBadges(ctx, b);
    }
    this.drawPath(ctx);
    this.drawFloaters(ctx, dt);
    this.fx.update(dt);
  }

  // Rauchwände, markierte Ziele, eigene Minen, Fallschirme
  drawSmokeMarks(ctx, units) {
    const g = this.g, t = this.t;
    for (const u of units) {
      if (!u.chute && !u.chuteAnim) continue;
      const p = this.posOf(u), lift = u.chuteAnim != null ? u.chuteAnim : 0.35, y = p.y - 18 - lift * 40, sw = Math.sin(t * 2 + u.id) * 2;
      ctx.strokeStyle = 'rgba(40,40,30,0.7)'; ctx.lineWidth = 0.7;
      for (const dx of [-11, -4, 4, 11]) { ctx.beginPath(); ctx.moveTo(p.x + dx + sw, y + 2); ctx.lineTo(p.x, p.y - 4 - lift * 30); ctx.stroke(); }
      const col = g.players[u.owner].color;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 6, 14, 6, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - 14 + sw, y + 2); ctx.quadraticCurveTo(p.x + sw, y - 16, p.x + 14 + sw, y + 2); ctx.closePath();
      const gr = ctx.createLinearGradient(p.x - 14, y, p.x + 14, y); gr.addColorStop(0, '#6f7552'); gr.addColorStop(0.5, '#a3aa7c'); gr.addColorStop(1, '#5b6042');
      ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
    }
    for (const s of g.smoke) {
      const p = center(s.c, s.r);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + t * 0.15, d = 10 + (k % 3) * 7;
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.7, rr = 16 + (k % 2) * 6 + Math.sin(t + k) * 2;
        const gr = ctx.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, 'rgba(225,225,215,0.55)'); gr.addColorStop(1, 'rgba(225,225,215,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.28); ctx.fill();
      }
    }
    for (const m of g.mines) {
      if (m.owner !== 0) continue; const p = center(m.c, m.r);
      ctx.save(); ctx.translate(p.x + 10, p.y + 8);
      ctx.fillStyle = m.kind === 'inf' ? '#5a6040' : '#3e3e38'; if (m.kind === 'inf') { ctx.fillRect(-4, -2, 8, 4); ctx.fillStyle = '#c84a30'; ctx.fillRect(-1, -2, 2, 1); } else { ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.28); ctx.fill(); ctx.fillStyle = '#7a7a70'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.28); ctx.fill(); }
      ctx.restore();
    }
    for (const u of units) {
      if (!u.marked) continue; const p = this.posOf(u), r0 = 15 + Math.sin(t * 5) * 1.5;
      ctx.strokeStyle = 'rgba(255,70,50,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, r0, 0, 6.28); ctx.stroke();
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * (r0 - 4), p.y + Math.sin(a) * (r0 - 4)); ctx.lineTo(p.x + Math.cos(a) * (r0 + 4), p.y + Math.sin(a) * (r0 + 4)); ctx.stroke(); }
    }
  }

  // Fluss: langsam ziehende Glanzlichter
  drawWater(ctx) {
    const g = this.g;
    if (!this.waterPath) {
      this.waterPath = new Path2D();
      for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
        const t = g.map.ter0[g.i(c, r)]; if (t !== 'wasser' && t !== 'bruecke') continue;
        const p = center(c, r); hexPath(this.waterPath, p.x, p.y, R * 0.72);
      }
      const pc = document.createElement('canvas'); pc.width = pc.height = 128; const c2 = pc.getContext('2d');
      for (let k = 0; k < 18; k++) { const x = Math.random() * 128, y = Math.random() * 128, l = 8 + Math.random() * 14; c2.strokeStyle = `rgba(210,235,245,${0.06 + Math.random() * 0.08})`; c2.lineWidth = 1; c2.beginPath(); c2.moveTo(x, y); c2.quadraticCurveTo(x + l / 2, y - 1.5, x + l, y); c2.stroke(); }
      this.waterPat = ctx.createPattern(pc, 'repeat');
    }
    const off = this.t * 9;
    this.waterPat.setTransform(new DOMMatrix([1, 0, 0, 1, off, off * 0.3]));
    ctx.save(); ctx.clip(this.waterPath); ctx.fillStyle = this.waterPat; const v = this.view; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); ctx.restore();
  }
  // Zerschossene Häuser: Schutt über der Ortschaft
  drawRubbleHexes(ctx) {
    const g = this.g;
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      const i = g.i(c, r); if (g.map.ter[i] !== 'truemmer' || g.map.ter0[i] !== 'ort') continue;
      const p = center(c, r);
      const spr = this.rubbleSprite || (this.rubbleSprite = (() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d');
        const gr = x.createRadialGradient(48, 48, 6, 48, 48, 44); gr.addColorStop(0, 'rgba(40,34,28,0.85)'); gr.addColorStop(1, 'rgba(60,52,44,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 96, 96);
        for (let k = 0; k < 70; k++) { const a = Math.random() * 6.28, d = Math.random() * 34, s = 1.5 + Math.random() * 5, v = 70 + Math.random() * 80; x.fillStyle = Math.random() < 0.3 ? `rgb(${v + 40},${v * 0.6},${v * 0.45})` : `rgb(${v},${v * 0.95},${v * 0.88})`; x.save(); x.translate(48 + Math.cos(a) * d, 48 + Math.sin(a) * d); x.rotate(Math.random() * 3); x.fillRect(-s / 2, -s / 2, s, s * 0.7); x.restore(); }
        for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(30,25,20,0.8)'; x.lineWidth = 1.4; const a = Math.random() * 6.28; x.beginPath(); x.moveTo(48 + Math.cos(a) * 10, 48 + Math.sin(a) * 10); x.lineTo(48 + Math.cos(a) * 30, 48 + Math.sin(a) * 30); x.stroke(); }
        return cv; })());
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((c * 1.7 + r) % 6.28); ctx.drawImage(spr, -48, -48); ctx.restore();
      if (Math.random() < 0.01) this.fx.smoke(p.x + (Math.random() - 0.5) * 30, p.y, 1, 5, 0.9);
    }
  }
  // Control Zone (grün) und Hot Zone (orange, pulsierend) mit Vorhersage
  drawZones(ctx) {
    const g = this.g, t = this.t;
    const cz = g.cz, hz = g.hz;
    const key = (o) => `${o.c},${o.r},${o.rad}`;
    if (this._czKey !== key(cz)) { this._czKey = key(cz); this._czList = ring(cz.c, cz.r, cz.rad, g.W, g.H); }
    const czList = this._czList;
    ctx.beginPath(); for (const [c, r] of czList) { const p = center(c, r); hexPath(ctx, p.x, p.y, R - 0.5); }
    ctx.fillStyle = 'rgba(110,255,140,0.06)'; ctx.fill();
    // Hot Zone: aktuelle Felder
    const hzList = ring(hz.c, hz.r, hz.rad, g.W, g.H), pu = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.beginPath(); for (const [c, r] of hzList) { const p = center(c, r); hexPath(ctx, p.x, p.y, R - 0.5); }
    ctx.fillStyle = `rgba(255,120,40,${0.13 + 0.07 * pu})`; ctx.fill();
    // Vorhersage
    const n = hz.next;
    if (n && (n.c !== hz.c || n.r !== hz.r)) {
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20;
      for (const [c, r] of ring(n.c, n.r, hz.rad, g.W, g.H)) { const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, R - 5); ctx.strokeStyle = 'rgba(255,170,90,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.setLineDash([]);
    }
  }
  // Umrisse der Zonen über dem Nebel: immer erkennbar
  drawZoneMarks(ctx) {
    const g = this.g, t = this.t, cz = g.cz, hz = g.hz;
    this.region(ctx, this._czList || [], 'cz', 'rgba(0,0,0,0)', 'rgba(150,255,170,0.85)', 'rgba(90,230,120,0.22)');
    const hzList = ring(hz.c, hz.r, hz.rad, g.W, g.H);
    const pu = 0.5 + 0.5 * Math.sin(t * 3);
    if (this._hzKey !== `${hz.c},${hz.r}`) { this._hzKey = `${hz.c},${hz.r}`; this._hzList = hzList; }
    this.region(ctx, this._hzList, 'hz', 'rgba(0,0,0,0)', `rgba(255,${150 + 40 * pu | 0},80,1)`, `rgba(255,120,40,${0.25 + 0.15 * pu})`);
    // Pfeil zur nächsten Position
    const n = hz.next;
    if (n && (n.c !== hz.c || n.r !== hz.r)) {
      const a = center(hz.c, hz.r), b = center(n.c, n.r), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const k = (t * 0.7) % 1, x = a.x + (b.x - a.x) * (0.25 + k * 0.5), y = a.y + (b.y - a.y) * (0.25 + k * 0.5);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = 0.85 * Math.sin(k * Math.PI);
      ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // Beschriftung
    const hc = center(hz.c, hz.r);
    ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = hz.lock > 0 ? `HOT ZONE · GESPERRT ${hz.lock}` : 'HOT ZONE ×2';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(label, hc.x, hc.y - R * 2.55); ctx.fillStyle = '#ffb36a'; ctx.fillText(label, hc.x, hc.y - R * 2.55);
    const cc = center(cz.c, cz.r);
    ctx.font = '800 13px system-ui, sans-serif'; ctx.strokeText('CONTROL ZONE', cc.x, cc.y - R * 6.4); ctx.fillStyle = '#a8ffb8'; ctx.fillText('CONTROL ZONE', cc.x, cc.y - R * 6.4);
    // Türme: Buchstabe, bekannte Ziffer, Abklingzeit
    for (const tw of g.towers) {
      const p = center(tw.c, tw.r), dg = g.known[0].has(tw.i) ? String(tw.digit) : g.codeKnown(0) ? String(tw.digit) : '?';
      const col = tw.owner >= 0 ? g.players[tw.owner].color : '#d8d4c8';
      ctx.fillStyle = 'rgba(10,12,8,0.82)'; ctx.beginPath(); ctx.roundRect(p.x - 17, p.y - R + 2, 34, 15, 4); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '800 10px system-ui, sans-serif'; ctx.fillStyle = col; ctx.fillText(`${'ABCD'[tw.i]}  ${dg}`, p.x, p.y - R + 10);
      if (tw.cd > 0) { ctx.fillStyle = 'rgba(10,12,8,0.82)'; ctx.beginPath(); ctx.roundRect(p.x - 12, p.y + R - 16, 24, 12, 3); ctx.fill(); ctx.fillStyle = '#9fd0ff'; ctx.font = '700 9px system-ui'; ctx.fillText(`⟳${tw.cd}`, p.x, p.y + R - 10); }
    }
  }
  // Sichere Zonen um die Hauptquartiere und FOB-Bereiche
  drawSafeZones(ctx) {
    const g = this.g;
    for (const p of g.players) {
      const s = g.map.starts[p.id]; if (!s) continue;
      const k = 'safe' + p.id; const list = this['_' + k] || (this['_' + k] = ring(s.c, s.r, 2, g.W, g.H));
      this.region(ctx, list, k, rgba(p.color, 0.07), rgba(p.color, 0.75), rgba(p.color, 0.18));
    }
    for (const b of g.buildings) {
      if (b.dead || b.type !== 'fob' || !g.seen(b)) continue;
      const k = 'fob' + b.id + '-' + b.owner; const list = this['_' + k] || (this['_' + k] = ring(b.c, b.r, b.def.radius, g.W, g.H));
      ctx.setLineDash([5, 5]); this.region(ctx, list, k, rgba(g.players[b.owner].color, 0.04), rgba(g.players[b.owner].color, 0.6), 'rgba(0,0,0,0)'); ctx.setLineDash([]);
    }
  }

  drawUnitFull(ctx, u) {
    const g = this.g;
    let p = this.posOf(u);
    const col = g.players[u.owner].color;
    const done = u.owner === g.current && g.current === 0 && !u.downed && (u.acted || (u.moved && !g.canFire(u)));
    if (this.hl.sel === u) {
      const cp = center(u.c, u.r), ph = (this.t * 0.8) % 1;
      ctx.save(); ctx.translate(cp.x, cp.y);
      const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, R - 4); gl.addColorStop(0, 'rgba(255,220,140,0.22)'); gl.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, R - 4, 0, 6.28); ctx.fill();
      ctx.strokeStyle = `rgba(255,230,170,${0.6 * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 10 + ph * (R - 14), 0, 6.28); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    const turretUnit = ['t72', 'l2a6', 'gepard', 'sph2', 'spz', 'kodiak_m249', 'wolf_m2', 'humvee_m249', 'humvee_mini', 'ural_def_m249'].includes(u.type);
    const idleTurret = turretUnit && !(u.aimUntil > this.t) ? Math.sin(this.t * 0.45 + u.id * 1.7) * 0.4 : (u.turretRel || 0);
    const air = u.def.mt === 'air';
    const z = air ? (u.landed && u.z === undefined ? 0 : (u.z ?? 26) + (u.crashing ? 0 : Math.sin(this.t * 2.2 + u.id) * 1.8)) : 0;
    const o = { ring: !u.crashing && !u.sink, scale: u.sink ? 1.62 * (1 - u.sink * 0.85) : undefined, bank: u.bank || 0, moving: !!u.anim, turret: idleTurret, recoil: u.recoil || 0, z, landed: !!u.landed && u.z === undefined, firing: u.firing > 0 };
    if (u.owner === 0 && g.stealthed(u, 1)) ctx.globalAlpha = 0.75;
    let py = p.y;
    if (u.def.cat === 'veh' && u.anim) py += Math.sin(this.t * 22 + u.id) * 0.7;
    const savedFacing = u.facing;
    if (u.def.cat === 'inf' && !u.anim && !(u.aimUntil > this.t)) u.facing = savedFacing + Math.sin(this.t * 0.6 + u.id * 2.1) * 0.25;
    const p0 = p; p = { x: p0.x, y: py };
    if (u.hitFlash > 0.05) this.tinted(ctx, p.x, p.y, `rgba(255,255,255,${u.hitFlash * 0.65})`, (oc) => drawUnit(oc, u, 0, 0, col, this.t, o));
    else if (done) this.tinted(ctx, p.x, p.y, 'rgba(70,64,58,0.3)', (oc) => drawUnit(oc, u, 0, 0, col, this.t, o));
    else drawUnit(ctx, u, p.x, p.y, col, this.t, o);
    u.facing = savedFacing;
    ctx.restore();
    // Leerlauf: Abgase, Erntewalze
    if (u.def.cat === 'veh' && Math.random() < (u.anim ? 0.25 : 0.03)) {
      const bx = p.x - Math.cos(u.facing) * 16, by = p.y - Math.sin(u.facing) * 16;
      this.fx.add({ kind: 'puff', x: bx, y: by, vx: -Math.cos(u.facing) * 6, vy: -8, life: 1.1, size: 2.5, grow: 7, col: '70,66,62', a: 0.35, air: true });
    }
    if (u.def.cat === 'veh' && u.hp < 50 && !u.sink && Math.random() < (u.hp < 25 ? 0.12 : 0.05)) { this.fx.smoke(p.x - 4, p.y - 4, 1, 4, 0.85); if (u.hp < 25) this.fx.fire(p.x + (Math.random() - 0.5) * 8, p.y - 2, 1, 3); }
    if (u.suppressed > 0) this.statusIcon(ctx, p.x, p.y - 26 - z, 'stun');
  }

  statusIcon(ctx, x, y, kind) {
    const t = this.t;
    if (kind === 'stun') {
      ctx.strokeStyle = 'rgba(200,140,255,0.9)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.09; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 3, 2.2, 0, 6.28); ctx.stroke(); }
    } else if (kind === 'shield') {
      ctx.strokeStyle = `rgba(120,200,255,${0.45 + 0.25 * Math.sin(t * 4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); hexPath(ctx, x, y, R - 8); ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,255,0.08)'; ctx.fill();
    }
  }

  addWreck(e, p) {
    this.wrecks.push({ x: p.x, y: p.y, facing: e.facing, unit: { type: e.type, def: e.def, facing: e.facing, id: e.id, ammo: 0, passengers: [], cargoP: [], landed: true }, color: this.g.players[e.owner].color, t: 0, life: 45 });
    if (this.wrecks.length > 25) this.wrecks.shift();
  }
  addRubble(p) {
    const chunks = Array.from({ length: 26 }, () => ({ x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 40, s: 2 + Math.random() * 5, a: Math.random() * 6, c: 60 + Math.random() * 60 }));
    this.rubble.push({ x: p.x, y: p.y, chunks, t: 0 });
    if (this.rubble.length > 20) this.rubble.shift();
  }

  drawWrecks(ctx, dt) {
    for (const r of this.rubble) {
      r.t += dt;
      const gr = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 36); gr.addColorStop(0, 'rgba(20,14,10,0.6)'); gr.addColorStop(1, 'rgba(20,14,10,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r.x, r.y, 36, 0, 6.28); ctx.fill();
      for (const c of r.chunks) { ctx.fillStyle = `rgb(${c.c},${c.c * 0.92},${c.c * 0.85})`; ctx.save(); ctx.translate(r.x + c.x, r.y + c.y); ctx.rotate(c.a); ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.7); ctx.restore(); }
      if (r.t < 14 && Math.random() < 0.12) this.fx.fire(r.x + (Math.random() - 0.5) * 30, r.y + (Math.random() - 0.5) * 24, 1, 4);
      if (r.t < 30 && Math.random() < 0.08) this.fx.smoke(r.x + (Math.random() - 0.5) * 30, r.y, 1, 6, 0.9);
    }
    const keep = [];
    for (const w of this.wrecks) {
      w.t += dt; if (w.t > w.life) continue; keep.push(w);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (w.life - w.t) / 6);
      if (!w.img) { w.img = true; }
      this.tinted(ctx, w.x, w.y, 'rgba(24,20,17,0.82)', (oc) => drawUnit(oc, w.unit, 0, 0, '#333333', 0, { z: 0, turret: 0.6, landed: true }), 120);
      ctx.restore();
      if (w.t < 20 && Math.random() < 0.1) this.fx.smoke(w.x, w.y, 1, 4, 0.95);
      if (w.t < 6 && Math.random() < 0.15) this.fx.fire(w.x, w.y, 1, 3);
    }
    this.wrecks = keep;
  }

  lightTarget() {
    const ph = this.g.dayPhase ? this.g.dayPhase() : 'tag';
    return { morgen: [255, 206, 172], tag: [255, 244, 226], abend: [255, 160, 112], nacht: [88, 102, 165] }[ph];
  }

  drawLighting(ctx, dt, bs, units) {
    const tgt = this.lightTarget();
    for (let k = 0; k < 3; k++) this.light[k] += (tgt[k] - this.light[k]) * Math.min(1, dt * 1.2);
    const L = this.light;
    const night = Math.max(0, Math.min(1, (255 - (L[0] + L[1]) / 2) / 150));
    this.nightK = night;
    if (L[0] > 252 && L[1] > 252 && L[2] > 252) return;
    const v = this.view;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${L[0] | 0},${L[1] | 0},${L[2] | 0})`;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    ctx.globalCompositeOperation = 'lighter';
    if (night > 0.15) {
      const a = night;
      const glow = (x, y, r, col, al) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${al})`); gr.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); };
      for (const b of bs) {
        const p = this.posOf(b);
        if (b.def.cat === 'fort') continue;
        glow(p.x + 4, p.y + 10, b.type === 'hq' ? 90 : 50, '255,180,100', 0.22 * a);
        glow(p.x - 6, p.y - 4, 18, '255,215,150', 0.18 * a);
        const blink = (this.t * 0.9 + b.id * 0.37) % 1 < 0.12;
        if (blink) glow(p.x + 26, p.y - 26, 6, '255,60,50', 0.95 * a);
      }
      for (const u of units) {
        const p = this.posOf(u);
        if (u.def.mt === 'air') {
          const z = u.z ?? 26, blink = Math.floor(this.t * 2 + u.id) % 2;
          glow(p.x - 9, p.y - z, 5, blink ? '255,60,60' : '60,255,120', 0.9 * a);
          glow(p.x, p.y - z, 30, '200,220,255', 0.12 * a);
        } else if (u.def.cat === 'veh') {
          // Scheinwerferkegel
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(u.facing);
          const cone = ctx.createLinearGradient(8, 0, 64, 0); cone.addColorStop(0, `rgba(255,240,205,${0.3 * a})`); cone.addColorStop(1, 'rgba(255,240,205,0)');
          ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(64, -24); ctx.quadraticCurveTo(72, 0, 64, 24); ctx.lineTo(10, 5); ctx.closePath(); ctx.fill();
          ctx.restore();
          glow(p.x + Math.cos(u.facing) * 12, p.y + Math.sin(u.facing) * 12, 5, '255,250,230', 0.8 * a);
        } else glow(p.x, p.y, 14, '255,200,140', 0.15 * a);
      }
      // Suchscheinwerfer auf Wachtürmen
      for (const b of bs) {
        if (b.type !== 'wachturm' && b.type !== 'hq' && b.type !== 'fob' && b.type !== 'sam') continue;
        const p = this.posOf(b), ang = this.t * 0.5 + b.id * 1.7;
        ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(ang);
        const sl = ctx.createLinearGradient(0, 0, 150, 0); sl.addColorStop(0, `rgba(225,235,255,${0.32 * a})`); sl.addColorStop(1, 'rgba(225,235,255,0)');
        ctx.fillStyle = sl; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(150, -22); ctx.lineTo(150, 22); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        glow(p.x + Math.cos(ang) * 130, p.y - 8 + Math.sin(ang) * 130, 22, '225,235,255', 0.18 * a);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawBadges(ctx, e) {
    const g = this.g;
    if (e.gone || (e.isUnit && e.carried) || (e.isBuilding && e.def.invuln)) return;
    const p = this.posOf(e);
    const pct = e.isBuilding ? e.hp / e.maxHp * 100 : e.hp;
    const air = e.isUnit && e.def.mt === 'air' ? (e.z ?? 26) : 0;
    const col = g.players[e.owner].color;
    // Team-Marker
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
    if (e.isUnit && e.owner === 0 && (e.waitUntil || 0) >= g.round) {
      const x = p.x - 18, y = p.y - 16 - air;
      ctx.save(); ctx.fillStyle = 'rgba(10,10,12,0.8)'; ctx.beginPath(); ctx.roundRect(x - 7, y - 6, 16, 12, 3); ctx.fill();
      ctx.fillStyle = '#bcd4ff'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Zz', x + 1, y + 0.5); ctx.restore();
      ctx.fillStyle = col;
    }
    if (pct < 99.5 && !(e.isUnit && e.downed) && !(e.isBuilding && e.turnsLeft > 0)) {
      const v = Math.max(1, Math.ceil(pct / 10));
      const x = p.x + 14, y = p.y + 12 - air;
      ctx.fillStyle = 'rgba(10,10,12,0.85)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, 15, 13, 3); ctx.fill();
      ctx.fillStyle = pct > 60 ? '#8ef08a' : pct > 30 ? '#f2d35b' : '#ff6a50';
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + 6.5, y + 6);
    }
    if (e.isUnit && e.downed) {
      const x = p.x + 16, y = p.y - 14;
      ctx.fillStyle = 'rgba(120,10,8,0.9)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, 15, 13, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(e.downed), x + 6.5, y + 6);
    }
    if (e.isUnit && e.ammoType && e.ammoType !== 'fmj' && e.owner === 0 && !e.downed) {
      ctx.fillStyle = 'rgba(10,10,12,0.8)'; ctx.beginPath(); ctx.roundRect(p.x - 7, p.y + 13 - air, 15, 10, 3); ctx.fill();
      ctx.fillStyle = e.ammoType === 'ap' ? '#9fd0ff' : '#ffb08a'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.ammoType.toUpperCase(), p.x + 0.5, p.y + 18.5 - air);
    }
    if (e.isBuilding && e.turnsLeft > 0) {
      ctx.fillStyle = 'rgba(10,10,12,0.85)'; ctx.beginPath(); ctx.roundRect(p.x - 12, p.y + 20, 24, 12, 3); ctx.fill();
      ctx.fillStyle = '#ffd36a'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`⚒ ${e.turnsLeft}`, p.x, p.y + 26);
    }
    // Rangabzeichen: Winkel für Veteran/Elite, Stern für Helden
    if (e.isUnit && e.rank) {
      const x = p.x - 20, y = p.y - 14 - air, gold = e.rank >= 3;
      ctx.save(); ctx.translate(x, y);
      if (e.promoGlow > 0) { ctx.fillStyle = `rgba(255,215,120,${0.5 * e.promoGlow})`; ctx.beginPath(); ctx.arc(0, 2, 12, 0, 6.28); ctx.fill(); }
      ctx.fillStyle = 'rgba(10,10,12,0.8)'; ctx.beginPath(); ctx.roundRect(-6.5, -6, 13, e.rank >= 3 ? 19 : 6 + e.rank * 4.5, 3); ctx.fill();
      ctx.strokeStyle = gold ? '#ffd36a' : '#e8e2d0'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const n = Math.min(2, e.rank);
      for (let k = 0; k < n; k++) { const yy = -3 + k * 4.5; ctx.beginPath(); ctx.moveTo(-4, yy); ctx.lineTo(0, yy + 2.6); ctx.lineTo(4, yy); ctx.stroke(); }
      if (e.rank >= 3) {
        ctx.fillStyle = '#ffd36a'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.571, r = i % 2 ? 2 : 4.6; ctx.lineTo(Math.cos(a) * r, 9 + Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (e.isUnit && e.def.ammo && e.ammo <= 0) {
      ctx.fillStyle = 'rgba(255,90,60,0.95)'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('LEER', p.x, p.y - air - 20);
    }
  }

  // Umriss einer Hexmenge als Liniensegmente
  outline(list) {
    const key = (c, r) => c + ',' + r, set = new Set(list.map(([c, r]) => key(c, r))), segs = [];
    for (const [c, r] of list) {
      const p = center(c, r);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i, q = pixelToHex(p.x + Math.cos(a) * HW, p.y + Math.sin(a) * HW);
        if (set.has(key(q.col, q.row))) continue;
        const a0 = a - Math.PI / 6, a1 = a + Math.PI / 6, rr = R - 1;
        segs.push([p.x + Math.cos(a0) * rr, p.y + Math.sin(a0) * rr, p.x + Math.cos(a1) * rr, p.y + Math.sin(a1) * rr]);
      }
    }
    return segs;
  }

  region(ctx, list, cacheKey, fill, stroke, glow) {
    if (!list.length) return;
    const c = this._regions || (this._regions = new Map());
    let e = c.get(cacheKey);
    if (!e || e.src !== list) { e = { src: list, segs: this.outline(list) }; c.set(cacheKey, e); }
    ctx.beginPath(); for (const [cc, r] of list) { const p = center(cc, r); hexPath(ctx, p.x, p.y, R - 0.5); }
    ctx.fillStyle = fill; ctx.fill();
    ctx.beginPath(); for (const [x0, y0, x1, y1] of e.segs) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
    ctx.lineCap = 'round';
    ctx.strokeStyle = glow; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.8; ctx.stroke();
  }

  brackets(ctx, x, y, rad, col, w, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30), cx = Math.cos(a) * rad, cy = Math.sin(a) * rad;
      const an = Math.PI / 180 * (60 * (i + 1) - 30), ap = Math.PI / 180 * (60 * (i - 1) - 30), f = 0.28;
      ctx.beginPath(); ctx.moveTo(cx + (Math.cos(ap) * rad - cx) * f, cy + (Math.sin(ap) * rad - cy) * f); ctx.lineTo(cx, cy); ctx.lineTo(cx + (Math.cos(an) * rad - cx) * f, cy + (Math.sin(an) * rad - cy) * f); ctx.stroke();
    }
    ctx.restore();
  }

  drawHighlights(ctx) {
    const { hl } = this, t = this.t;
    const fillHex = (c, r, fill, stroke, w = 2, rad = R - 2) => {
      const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, rad);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
    };
    if (hl.move) {
      if (this._mvSrc !== hl.move) { this._mvSrc = hl.move; this._mvList = [...hl.move.values()].filter((n) => n.end).map((n) => [n.c, n.r]); }
      this.region(ctx, this._mvList, 'move', 'rgba(70,150,255,0.13)', 'rgba(150,215,255,0.95)', 'rgba(80,170,255,0.25)');
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    if (hl.build.length) this.region(ctx, hl.build, 'build', `rgba(90,230,120,${0.1 + 0.07 * pulse})`, 'rgba(150,255,170,0.95)', 'rgba(90,230,120,0.25)');
    if (hl.drop.length) this.region(ctx, hl.drop, 'drop', 'rgba(90,230,230,0.13)', 'rgba(150,255,255,0.95)', 'rgba(90,230,230,0.25)');
    if (hl.target.length) this.region(ctx, hl.target, 'target', `rgba(190,120,255,${0.1 + 0.07 * pulse})`, 'rgba(220,175,255,0.95)', 'rgba(190,120,255,0.25)');
    for (const e of hl.attack) {
      const p = center(e.c, e.r);
      fillHex(e.c, e.r, `rgba(255,60,40,${0.1 + 0.1 * pulse})`, null);
      this.brackets(ctx, p.x, p.y, R - 3 - pulse * 3, 'rgba(255,190,170,0.35)', 5);
      this.brackets(ctx, p.x, p.y, R - 3 - pulse * 3, 'rgba(255,80,60,1)', 2);
    }
    if (hl.hover) { const p = center(hl.hover.c, hl.hover.r); fillHex(hl.hover.c, hl.hover.r, 'rgba(255,255,255,0.07)', null); this.brackets(ctx, p.x, p.y, R - 3, 'rgba(255,255,255,0.7)', 1.5); }
    // Sammelpunkte: Flagge am Ziel
    const seenR = new Set();
    for (const u of this.g.units) {
      if (u.dead || u.owner !== 0 || !u.rally) continue;
      const k = u.rally.c + ',' + u.rally.r; if (seenR.has(k)) continue; seenR.add(k);
      const p = center(u.rally.c, u.rally.r), wv = Math.sin(t * 4) * 2;
      ctx.strokeStyle = 'rgba(255,220,140,0.5)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); hexPath(ctx, p.x, p.y, R - 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y + 10); ctx.lineTo(p.x, p.y - 18); ctx.stroke();
      ctx.fillStyle = this.g.players[0].color; ctx.beginPath(); ctx.moveTo(p.x + 1, p.y - 18); ctx.quadraticCurveTo(p.x + 9, p.y - 19 + wv, p.x + 16, p.y - 14); ctx.lineTo(p.x + 1, p.y - 9); ctx.closePath(); ctx.fill();
    }
    if (hl.sel) {
      const p = center(hl.sel.c, hl.sel.r);
      this.brackets(ctx, p.x, p.y, R - 1, 'rgba(255,220,140,0.3)', 6);
      this.brackets(ctx, p.x, p.y, R - 1, 'rgba(255,236,190,1)', 2.2);
    }
  }

  // Wolkenschatten ziehen langsam über das Land
  drawRain(ctx, dt, v) {
    this.rainK = (this.rainK || 0) + ((this.g.weather === 'regen' ? 1 : 0) - (this.rainK || 0)) * Math.min(1, dt * 0.8);
    const k = this.rainK; if (k < 0.01) return;
    ctx.fillStyle = `rgba(40,50,60,${0.16 * k})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (!this.drops) this.drops = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), l: 0.6 + Math.random() * 0.8, s: 0.7 + Math.random() * 0.6 }));
    const w = v.x1 - v.x0, h = v.y1 - v.y0, z = this.cam.z;
    ctx.strokeStyle = `rgba(200,215,230,${0.35 * k})`; ctx.lineWidth = 1 / z; ctx.beginPath();
    for (const d of this.drops) {
      d.y += dt * 1.6 * d.s; d.x += dt * 0.25 * d.s; if (d.y > 1) { d.y -= 1; d.x = Math.random(); } if (d.x > 1) d.x -= 1;
      const x = v.x0 + d.x * w, y = v.y0 + d.y * h, L = 14 * d.l / z;
      ctx.moveTo(x, y); ctx.lineTo(x + L * 0.25, y + L);
    }
    ctx.stroke();
  }
  drawClouds(ctx, dt) {
    const ms = this.g.map.size;
    if (!this.clouds) this.clouds = Array.from({ length: 7 }, () => ({ x: Math.random() * ms.w, y: Math.random() * ms.h, r: 160 + Math.random() * 220, s: 6 + Math.random() * 8, sq: 0.5 + Math.random() * 0.3 }));
    for (const c of this.clouds) {
      c.x += c.s * dt; c.y += c.s * 0.25 * dt;
      if (c.x - c.r > ms.w) { c.x = -c.r; c.y = Math.random() * ms.h; }
      if (c.y - c.r > ms.h) c.y = -c.r;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, c.sq);
      const gr = ctx.createRadialGradient(0, 0, c.r * 0.2, 0, 0, c.r);
      gr.addColorStop(0, `rgba(15,20,10,${0.14 * (1 - this.nightK)})`); gr.addColorStop(1, 'rgba(15,20,10,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.28); ctx.fill(); ctx.restore();
    }
  }

  drawPath(ctx) {
    const path = this.hl.path; if (!path || path.length < 2) return;
    const pts = path.map((h) => center(h.c, h.r));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, col] of [[9, 'rgba(0,0,0,0.35)'], [5, 'rgba(255,255,255,0.9)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a.y - b.y, a.x - b.x);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(a.x + Math.cos(ang) * 8, a.y + Math.sin(ang) * 8);
    ctx.lineTo(a.x + Math.cos(ang + 2.4) * 10, a.y + Math.sin(ang + 2.4) * 10); ctx.lineTo(a.x + Math.cos(ang - 2.4) * 10, a.y + Math.sin(ang - 2.4) * 10); ctx.fill();
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles || []) {
      if (p.kind === 'shell') {
        ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h, 2.5, 0, 6.28); ctx.fill();
      } else if (p.kind === 'bomb') {
        ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(p.x, p.y - p.h, 2.5, 4, 0, 0, 6.28); ctx.fill();
      } else if (p.kind === 'drone') {
        ctx.save(); ctx.translate(p.x, p.y - p.h); ctx.fillStyle = '#2a2d2f'; ctx.fillRect(-2, -2, 4, 4); ctx.strokeStyle = 'rgba(40,40,40,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke(); ctx.restore();
      } else if (p.kind === 'rocket' || p.kind === 'arty' || p.kind === 'missile' || p.kind === 'grad') {
        ctx.save(); ctx.translate(p.x, p.y - p.h); ctx.rotate(p.ang || 0);
        ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-5, -1.5, 9, 3);
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,0.9)'; ctx.beginPath(); ctx.arc(-6, 0, 3.5, 0, 6.28); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawFog(ctx) {
    const g = this.g;
    if (this.fogDirty || !this.fogCv) this.buildFog();
    ctx.drawImage(this.fogCv, 0, 0, g.map.size.w, g.map.size.h);
  }
  buildFog() {
    const g = this.g, S = 0.25;
    const w = Math.ceil(g.map.size.w * S), h = Math.ceil(g.map.size.h * S);
    const raw = document.createElement('canvas'); raw.width = w; raw.height = h;
    const c = raw.getContext('2d');
    c.scale(S, S);
    c.fillStyle = 'rgba(6,8,6,0.97)'; c.fillRect(0, 0, g.map.size.w, g.map.size.h);
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
    for (let r = 0; r < g.H; r++) for (let cc = 0; cc < g.W; cc++) {
      if (!g.explored[g.i(cc, r)]) continue;
      c.beginPath(); hexPath(c, center(cc, r).x, center(cc, r).y, R + 1); c.fill();
    }
    c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(8,12,8,0.3)';
    for (let r = 0; r < g.H; r++) for (let cc = 0; cc < g.W; cc++) {
      const i = g.i(cc, r);
      if (!g.explored[i] || g.visible[i]) continue;
      c.beginPath(); hexPath(c, center(cc, r).x, center(cc, r).y, R + 1); c.fill();
    }
    if (!this.fogCv) { this.fogCv = document.createElement('canvas'); }
    this.fogCv.width = w; this.fogCv.height = h;
    const f = this.fogCv.getContext('2d');
    if (FILTER_OK) f.filter = 'blur(2.5px)';
    f.drawImage(raw, 0, 0);
    this.fogDirty = false;
  }

  drawFloaters(ctx, dt) {
    const keep = [];
    for (const f of this.floaters) {
      f.t += dt; if (f.t > f.life) continue; keep.push(f);
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `800 ${f.big ? 18 : 14}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const y = f.y - 20 - k * 28;
      ctx.strokeText(f.text, f.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
    this.floaters = keep;
  }
}
