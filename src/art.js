// Vorgerenderte Teile mit Materialeffekten: Kanten-Glanz, Schattenkanten, Schmutz, Staub
const SCALE = Math.min(6, Math.max(5, Math.round(2.2 * ((typeof devicePixelRatio !== "undefined" && devicePixelRatio) || 1))));
const cache = new Map();
let noiseCv = null;

function noise() {
  if (noiseCv) return noiseCv;
  const s = 256; noiseCv = document.createElement('canvas'); noiseCv.width = noiseCv.height = s;
  const c = noiseCv.getContext('2d');
  const img = c.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = Math.random();
    const d = v < 0.5 ? 0 : 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = d;
    img.data[i * 4 + 3] = Math.abs(v - 0.5) * 60;
  }
  c.putImageData(img, 0, 0);
  // Schmutzschlieren
  for (let k = 0; k < 60; k++) {
    c.strokeStyle = `rgba(40,25,15,${0.05 + Math.random() * 0.08})`; c.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * s, y = Math.random() * s;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 6, y + 6 + Math.random() * 20); c.stroke();
  }
  for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(60,40,20,${0.05 + Math.random() * 0.1})`; c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 6, 0, 6.28); c.fill(); }
  return noiseCv;
}

function mk(w, h) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); return cv; }

// Kantenband: Pixel der Silhouette, die beim Verschieben frei werden
function edgeBand(sil, dx, dy, color) {
  const t = mk(sil.width, sil.height), c = t.getContext('2d');
  c.drawImage(sil, 0, 0);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(sil, dx, dy);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, t.width, t.height);
  return t;
}

// Material auf eine Ebene anwenden
function material(cv, o, SC = SCALE) {
  const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
  const sil = mk(w, h), sc = sil.getContext('2d');
  sc.drawImage(cv, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#fff'; sc.fillRect(0, 0, w, h);
  const b = (o.bevel ?? 1) * SC;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  if (o.grime !== 0) {
    ctx.globalAlpha = o.grime ?? 0.55;
    ctx.fillStyle = ctx.createPattern(noise(), 'repeat');
    ctx.fillRect(0, 0, w, h);
  }
  if (o.dust) {
    ctx.globalAlpha = o.dust;
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, 'rgba(210,170,110,0)'); g.addColorStop(1, 'rgba(210,170,110,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  if (b > 0) {
    ctx.globalAlpha = o.light ?? 0.5; ctx.drawImage(edgeBand(sil, b, b, 'rgb(255,246,226)'), 0, 0);
    ctx.globalAlpha = o.shade ?? 0.55; ctx.drawImage(edgeBand(sil, -b, -b, 'rgb(10,6,2)'), 0, 0);
    if (o.rim !== false) { ctx.globalAlpha = 0.22; ctx.drawImage(edgeBand(sil, b * 2.2, b * 2.2, 'rgb(255,240,210)'), 0, 0); }
  }
  ctx.restore();
}

// Ein Teil vorrendern: draw(L) — L(fn, opts) zeichnet eine Ebene mit eigenem Material
export function part(key, w, h, draw, SC = SCALE) {
  if (cache.has(key)) return cache.get(key);
  const cv = mk(w * SC, h * SC), ctx = cv.getContext('2d');
  const L = (fn, o = {}) => {
    const lc = mk(cv.width, cv.height), l = lc.getContext('2d');
    l.setTransform(SC, 0, 0, SC, cv.width / 2, cv.height / 2);
    fn(l);
    if (!o.flat) material(lc, o, SC);
    ctx.drawImage(lc, 0, 0);
  };
  draw(L);
  const sh = mk(cv.width, cv.height), s = sh.getContext('2d');
  s.drawImage(cv, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#000'; s.fillRect(0, 0, sh.width, sh.height);
  const p = { cv, sh, w, h };
  cache.set(key, p);
  return p;
}

export function drawPart(ctx, p, x = 0, y = 0) { ctx.drawImage(p.cv, x - p.w / 2, y - p.h / 2, p.w, p.h); }
export function drawPartShadow(ctx, p, dx = 4, dy = 5, a = 0.35) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(p.sh, dx - p.w / 2, dy - p.h / 2, p.w, p.h); ctx.restore(); }

// ---------- Zeichenhilfen ----------
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function lg(ctx, x0, y0, x1, y1, ...stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
export function rg(ctx, x, y, r0, r1, ...stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
export function box(ctx, x, y, w, h, fill, r = 1.5) { ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill(); }
export function rivets(ctx, pts, r = 0.45, col = 'rgba(30,22,15,0.75)') {
  for (const [x, y] of pts) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(255,240,215,0.45)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.4, 0, 6.28); ctx.fill(); }
}
export function rivetRow(ctx, x0, y0, x1, y1, n, r) { const pts = []; for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)]); rivets(ctx, pts, r); }
export function vents(ctx, x, y, w, h, n, vertical = false) {
  box(ctx, x, y, w, h, '#2a241e', 0.6);
  ctx.strokeStyle = 'rgba(150,135,110,0.55)'; ctx.lineWidth = 0.4;
  for (let i = 1; i < n; i++) { ctx.beginPath(); if (vertical) { const xx = x + w * i / n; ctx.moveTo(xx, y + 0.4); ctx.lineTo(xx, y + h - 0.4); } else { const yy = y + h * i / n; ctx.moveTo(x + 0.4, yy); ctx.lineTo(x + w - 0.4, yy); } ctx.stroke(); }
}
export function seams(ctx, lines, col = 'rgba(25,18,12,0.45)', w = 0.45) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  for (const l of lines) { ctx.beginPath(); ctx.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]); ctx.stroke(); }
}
export function hazard(ctx, x, y, w, h) {
  ctx.save(); rr(ctx, x, y, w, h, 0.5); ctx.clip();
  ctx.fillStyle = '#e2b13c'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#211a14'; for (let k = -h; k < w + h; k += 3) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 1.5, y + h); ctx.lineTo(x + k + 1.5 + h, y); ctx.lineTo(x + k + h, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
export function pipe(ctx, pts, w, col = '#7d7468') {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [lw, c] of [[w, '#2a241e'], [w * 0.75, col], [w * 0.25, 'rgba(255,240,215,0.5)']]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke();
  }
}
export function windows(ctx, x, y, w, h, n, col = 'rgba(255,196,120,0.85)') {
  const gw = w / n;
  for (let i = 0; i < n; i++) { box(ctx, x + i * gw + 0.3, y, gw - 0.6, h, '#1e1914', 0.3); ctx.fillStyle = col; ctx.fillRect(x + i * gw + 0.6, y + 0.3, gw - 1.2, h - 0.6); }
}
export function dome(ctx, x, y, r, base, dark) {
  ctx.fillStyle = rg(ctx, x - r * 0.4, y - r * 0.4, r * 0.1, r * 1.05, base, dark);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,8,0.35)'; ctx.lineWidth = 0.4;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(k * 1.047) * r, y + Math.sin(k * 1.047) * r); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.28); ctx.stroke();
}
export function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = x + r * Math.cos(a), py = y + r * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
export function emblem(ctx, x, y, r, color) {
  ctx.fillStyle = '#1e1914'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r * 0.7); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
}
