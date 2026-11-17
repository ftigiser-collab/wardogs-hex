// Bauten: Hauptquartier, Vorposten, Stellungen, Funktürme (Draufsicht, Licht von oben links)
import { part, drawPart, drawPartShadow, rr, lg, rg, box, rivets, rivetRow, vents, seams, hazard, pipe, emblem } from './art.js';
import { camo, tone } from './mart.js';

const OLIVE = ['#7d8158', '#535738', '#2f3220'];
const CONC = ['#bdb7a6', '#8e887a', '#5c574c'];
function container(c, x, y, w, h, col, color) {
  c.fillStyle = lg(c, x, y, x + w, y + h, tone(col, 1.15), tone(col, 0.7)); c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.4;
  for (let k = x + 1.6; k < x + w - 0.5; k += 1.6) { c.beginPath(); c.moveTo(k, y); c.lineTo(k, y + h); c.stroke(); }
  c.fillStyle = 'rgba(255,255,240,0.12)'; c.fillRect(x, y, w, 0.8);
  if (color) { c.fillStyle = color; c.fillRect(x + w - 2, y, 1.2, h); }
}
function sandbags(c, pts, w = 3.2) {
  for (const [x, y, a] of pts) {
    c.save(); c.translate(x, y); c.rotate(a || 0);
    c.fillStyle = 'rgba(0,0,0,0.3)'; rr(c, -w / 2 + 0.6, -1.2 + 0.8, w, 2.4, 1); c.fill();
    c.fillStyle = lg(c, -w / 2, -1.2, w / 2, 1.2, '#cdb98e', '#8a774f'); rr(c, -w / 2, -1.2, w, 2.4, 1.1); c.fill();
    c.restore();
  }
}
function ringBags(c, r, n, from = 0, to = 6.283, w = 3.2) { const pts = []; for (let k = 0; k < n; k++) { const a = from + (to - from) * (k + 0.5) / n; pts.push([Math.cos(a) * r, Math.sin(a) * r, a + 1.5708]); } sandbags(c, pts, w); }
function crate(c, x, y, s, col = '#8a6e45') { c.fillStyle = lg(c, x, y, x + s, y + s, tone(col, 1.2), tone(col, 0.7)); c.fillRect(x, y, s, s); c.strokeStyle = 'rgba(30,20,10,0.55)'; c.lineWidth = 0.4; c.strokeRect(x, y, s, s); c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + s); c.stroke(); }

const STAT = {
  hq: (color) => part(`w-hq-${color}`, 96, 84, (L) => {
    const cm = camo(color);
    L((c) => { c.fillStyle = lg(c, -40, -36, 40, 36, CONC[0], CONC[2]); rr(c, -42, -36, 84, 72, 5); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.5; for (let x = -42; x < 42; x += 12) { c.beginPath(); c.moveTo(x, -36); c.lineTo(x, 36); c.stroke(); } for (let y = -36; y < 36; y += 12) { c.beginPath(); c.moveTo(-42, y); c.lineTo(42, y); c.stroke(); } }, { bevel: 0.6, grime: 0.4 });
    L((c) => {
      // Kommandozelt
      c.fillStyle = lg(c, -10, -30, 14, 2, tone(cm[0], 1.1), cm[2]); rr(c, -14, -30, 32, 22, 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(-14, -19.5, 32, 1.2);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.5; for (let x = -10; x < 18; x += 5) { c.beginPath(); c.moveTo(x, -30); c.lineTo(x, -8); c.stroke(); }
      // Container
      container(c, -38, -30, 20, 9, '#6e7350', color); container(c, -38, -18, 20, 9, '#7a6a4e', color); container(c, 22, -30, 16, 9, '#5d6680', color);
      container(c, 22, 6, 16, 9, '#6e7350', color); container(c, 22, 18, 16, 9, '#8a5a3e', color);
      // Hubschrauberlandeplatz
      c.fillStyle = '#5a5850'; c.beginPath(); c.arc(-20, 16, 14, 0, 6.28); c.fill();
      c.strokeStyle = '#e8e2c8'; c.lineWidth = 1.4; c.beginPath(); c.arc(-20, 16, 11.5, 0, 6.28); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(-24, 10); c.lineTo(-24, 22); c.moveTo(-16, 10); c.lineTo(-16, 22); c.moveTo(-24, 16); c.lineTo(-16, 16); c.stroke();
      // Antennenmast und Sandsackwall
      c.fillStyle = '#3a3a36'; c.beginPath(); c.arc(4, 12, 3, 0, 6.28); c.fill(); c.strokeStyle = 'rgba(40,40,40,0.6)'; c.lineWidth = 0.4; for (const a of [0.5, 2.6, 4.7]) { c.beginPath(); c.moveTo(4, 12); c.lineTo(4 + Math.cos(a) * 12, 12 + Math.sin(a) * 12); c.stroke(); }
      crate(c, 6, -4, 4.5); crate(c, 11, -4, 4.5, '#6f7350'); crate(c, 8.5, 1, 4.5);
    }, { bevel: 0.7, dust: 0.2 });
    L((c) => { sandbags(c, [[-6, 30, 0], [-2.6, 30, 0], [0.8, 30, 0], [4.2, 30, 0], [7.6, 30, 0], [11, 30, 0]]); }, { flat: true });
  }),
  fob: (color) => part(`w-fob-${color}`, 56, 50, (L) => {
    const cm = camo(color);
    L((c) => { c.fillStyle = 'rgba(120,108,84,0.75)'; c.beginPath(); c.arc(0, 0, 21, 0, 6.28); c.fill(); }, { bevel: 0.3, grime: 0.6 });
    L((c) => {
      container(c, -12, -9, 22, 10, tone(cm[1], 1.1), color);
      c.fillStyle = '#2a2a28'; rr(c, 4, -7.5, 4, 3, 0.5); c.fill(); c.fillStyle = '#7dd8ff'; c.fillRect(4.6, -6.9, 2.8, 1.8);
      crate(c, -14, 4, 5); crate(c, -8.5, 4, 5, '#6f7350'); crate(c, 6, 3, 4.5, '#7a5a3e');
      c.fillStyle = '#3a3a36'; c.beginPath(); c.arc(12, 6, 2, 0, 6.28); c.fill();
    }, { bevel: 0.7, dust: 0.25 });
    L((c) => ringBags(c, 21, 26, 0.35, 6.0), { flat: true });
  }),
  sandsack: () => part('w-sandsack', 44, 40, (L) => { L((c) => { ringBags(c, 15, 18, 0.6, 5.7, 3.4); ringBags(c, 12, 14, 0.8, 5.5, 3); }, { flat: true }); }),
  hesco: () => part('w-hesco', 54, 48, (L) => {
    L((c) => {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const x = -16 + i * 11, y = -11 + j * 11;
        c.fillStyle = lg(c, x, y, x + 10, y + 10, '#c7b58a', '#7d6c48'); c.fillRect(x, y, 10, 10);
        c.fillStyle = 'rgba(110,90,60,0.6)'; c.fillRect(x + 1.2, y + 1.2, 7.6, 7.6);
        c.strokeStyle = 'rgba(60,60,55,0.7)'; c.lineWidth = 0.35; for (let k = 0; k <= 10; k += 2) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k, y + 10); c.moveTo(x, y + k); c.lineTo(x + 10, y + k); c.stroke(); }
      }
    }, { bevel: 0.8, grime: 0.4 });
  }),
  bremer: () => part('w-bremer', 56, 50, (L) => {
    L((c) => {
      for (let k = 0; k < 5; k++) {
        const y = -16 + k * 7.2;
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-15, y + 1.5, 32, 6);
        c.fillStyle = lg(c, -16, y, 16, y + 6, '#d8d2c2', '#8a8476'); c.fillRect(-16, y, 32, 6);
        c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-16, y + 5, 32, 1);
        c.fillStyle = lg(c, -2, y - 3, 2, y + 9, '#c8c2b2', '#7a7468'); c.fillRect(-2.5, y - 2, 5, 10);
      }
    }, { bevel: 0.9, grime: 0.35 });
  }),
  moerser: () => part('w-moerser', 50, 46, (L) => {
    L((c) => { c.fillStyle = 'rgba(60,50,35,0.8)'; c.beginPath(); c.arc(0, 0, 13, 0, 6.28); c.fill(); }, { bevel: 0.3, grime: 0.6 });
    L((c) => { crate(c, -10, 5, 4.5); crate(c, -5, 7, 4.5, '#6f7350'); c.fillStyle = '#3c3e36'; rr(c, -3, -3, 6, 6, 1); c.fill(); }, { bevel: 0.6 });
    L((c) => ringBags(c, 16, 20, 0, 6.283, 3.2), { flat: true });
  }),
  mortarTube: () => part('w-mortartube', 24, 12, (L) => { L((c) => { c.fillStyle = lg(c, 0, -2, 0, 2, '#4a4c44', '#1e1f1b'); c.fillRect(-2, -1.8, 13, 3.6); c.fillStyle = '#111'; c.beginPath(); c.arc(11, 0, 1.6, 0, 6.28); c.fill(); c.strokeStyle = '#2a2b27'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(2, 0); c.lineTo(-4, -4); c.moveTo(2, 0); c.lineTo(-4, 4); c.stroke(); }, { bevel: 0.4 }); }),
  sam: (color) => part(`w-sam-${color}`, 50, 46, (L) => {
    L((c) => { c.fillStyle = lg(c, -14, -14, 14, 14, CONC[0], CONC[2]); rr(c, -15, -15, 30, 30, 3); c.fill(); hazard(c, -15, 12, 30, 3); }, { bevel: 0.6, grime: 0.4 });
    L((c) => { ringBags(c, 19, 22, 0.3, 6.0); }, { flat: true });
  }),
  samLauncher: (color) => part(`w-saml-${color}`, 32, 28, (L) => {
    const cm = camo(color);
    L((c) => {
      c.fillStyle = lg(c, -8, -8, 8, 8, tone(cm[0], 1.1), cm[2]); rr(c, -9, -9, 14, 18, 2); c.fill();
      for (const y of [-6.4, -2.2, 2.2, 6.4]) { c.fillStyle = lg(c, 0, y - 1.6, 0, y + 1.6, '#e4e2d8', '#8f8c80'); rr(c, -6, y - 1.6, 17, 3.2, 1.4); c.fill(); c.fillStyle = '#c84a30'; c.beginPath(); c.arc(11, y, 1, 0, 6.28); c.fill(); }
      c.fillStyle = color; c.fillRect(-9, -9, 1.6, 18);
    }, { bevel: 0.6 });
  }),
  ciws: () => part('w-ciws', 48, 44, (L) => {
    L((c) => { c.fillStyle = lg(c, -14, -14, 14, 14, CONC[0], CONC[2]); c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.39; c.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); } c.closePath(); c.fill(); hazard(c, -6, 12, 12, 2.5); }, { bevel: 0.7, grime: 0.4 });
  }),
  ciwsGun: (color) => part(`w-ciwsg-${color}`, 36, 26, (L) => {
    L((c) => {
      c.fillStyle = rg(c, -3, -3, 1, 10, '#efeee6', '#8d8b82'); c.beginPath(); c.arc(-2, 0, 8.5, 0, 6.28); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(-2, 0, 4, 0, 6.28); c.fill();
      for (const y of [-1.6, -0.5, 0.6, 1.7]) { c.fillStyle = '#1b1c1e'; c.fillRect(5, y - 0.35, 11, 0.7); }
      c.fillStyle = '#2c2d30'; rr(c, 4, -2.6, 3, 5.2, 0.6); c.fill();
      c.fillStyle = color; c.fillRect(-10.5, -1.5, 1.6, 3);
    }, { bevel: 0.7 });
  }),
  werkstatt: (color) => part(`w-werk-${color}`, 56, 50, (L) => {
    const cm = camo(color);
    L((c) => { c.fillStyle = 'rgba(70,66,58,0.85)'; rr(c, -20, -18, 40, 36, 3); c.fill(); }, { bevel: 0.4, grime: 0.6 });
    L((c) => {
      c.fillStyle = lg(c, -16, -14, 14, 6, tone(cm[0], 1.1), cm[2]); rr(c, -16, -15, 30, 18, 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-16, -6.6, 30, 1.2);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.5; for (let x = -12; x < 14; x += 5) { c.beginPath(); c.moveTo(x, -15); c.lineTo(x, 3); c.stroke(); }
      crate(c, -17, 7, 5); crate(c, -11, 8, 4.5, '#6f7350');
      for (const [x, y] of [[4, 9], [8.5, 11], [13, 8]]) { c.fillStyle = rg(c, x - 0.8, y - 0.8, 0.3, 2.6, '#d8563c', '#7a2416'); c.beginPath(); c.arc(x, y, 2.4, 0, 6.28); c.fill(); }
      c.fillStyle = color; c.fillRect(-16, -15, 1.6, 18);
      c.fillStyle = '#d9a33a'; c.fillRect(13, -14, 2, 2);
    }, { bevel: 0.7, dust: 0.2 });
  }),
  bohrturm: (color) => part(`w-bohr-${color}`, 60, 56, (L) => {
    L((c) => { c.fillStyle = 'rgba(54,46,36,0.85)'; c.beginPath(); c.arc(0, 0, 22, 0, 6.28); c.fill(); c.fillStyle = 'rgba(20,16,12,0.7)'; c.beginPath(); c.arc(0, 0, 5, 0, 6.28); c.fill(); }, { bevel: 0.3, grime: 0.7 });
    L((c) => {
      // Treibstofftanks
      for (const [x, y] of [[-16, -12], [-16, -4]]) { c.fillStyle = lg(c, x - 6, y - 3, x + 6, y + 3, '#e6e2d4', '#8a867a'); rr(c, x - 6, y - 3, 12, 6, 3); c.fill(); c.fillStyle = '#c84a30'; c.fillRect(x - 1, y - 3, 2, 6); }
      container(c, 8, 10, 12, 7, '#7a6a4e', color);
      hazard(c, -6, 14, 12, 3);
    }, { bevel: 0.7, dust: 0.25 });
  }),
  derrick: (color) => part(`w-derrick-${color}`, 36, 36, (L) => {
    L((c) => {
      c.strokeStyle = '#d4a63a'; c.lineWidth = 1.4; c.strokeRect(-11, -11, 22, 22);
      c.lineWidth = 0.7; c.beginPath(); c.moveTo(-11, -11); c.lineTo(11, 11); c.moveTo(11, -11); c.lineTo(-11, 11);
      for (let k = -11; k <= 11; k += 5.5) { c.moveTo(-11, k); c.lineTo(11, k); }
      c.stroke();
      c.strokeStyle = '#9a7420'; c.lineWidth = 1; c.beginPath(); c.moveTo(-11, -11); c.lineTo(-3, -3); c.moveTo(11, -11); c.lineTo(3, -3); c.moveTo(11, 11); c.lineTo(3, 3); c.moveTo(-11, 11); c.lineTo(-3, 3); c.stroke();
      c.fillStyle = '#5a5a56'; rr(c, -3.4, -3.4, 6.8, 6.8, 1); c.fill();
      c.fillStyle = color; c.fillRect(-11, -12.5, 22, 1.2);
    }, { bevel: 0.5 });
  }),
  wachturm: (color) => part(`w-wacht-${color}`, 40, 40, (L) => {
    L((c) => { c.strokeStyle = '#4a3a28'; c.lineWidth = 1.4; for (const [x, y] of [[-9, -9], [9, -9], [9, 9], [-9, 9]]) { c.beginPath(); c.moveTo(x * 1.3, y * 1.3); c.lineTo(x * 0.6, y * 0.6); c.stroke(); } }, { bevel: 0.4 });
    L((c) => {
      c.fillStyle = lg(c, -8, -8, 8, 8, '#a8875a', '#5e4a30'); rr(c, -8.5, -8.5, 17, 17, 1); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = -6.5; k < 8; k += 2.6) c.fillRect(-8.5, k, 17, 0.5);
      c.fillStyle = lg(c, -6, -6, 6, 6, '#6e7350', '#3e4128'); c.beginPath(); c.moveTo(0, -7); c.lineTo(7, 0); c.lineTo(0, 7); c.lineTo(-7, 0); c.closePath(); c.fill();
      c.fillStyle = color; c.fillRect(-1, -1, 2, 2);
    }, { bevel: 0.6, grime: 0.35 });
  }),
  funkturm: () => part('w-funk', 60, 56, (L) => {
    L((c) => { c.fillStyle = 'rgba(96,92,80,0.7)'; c.beginPath(); c.arc(0, 0, 18, 0, 6.28); c.fill(); }, { bevel: 0.3, grime: 0.6 });
    L((c) => {
      // Konsolenhäuschen
      container(c, 4, 4, 13, 8, '#8a8a80');
      c.fillStyle = '#2a2a28'; rr(c, 6, 5.5, 3, 2.4, 0.4); c.fill(); c.fillStyle = '#7dd8ff'; c.fillRect(6.4, 5.9, 2.2, 1.6);
      // Gittermast (Dreiecksfuß)
      const pts = [[0, -11], [9.5, 5.5], [-9.5, 5.5]];
      c.strokeStyle = '#c8c4b8'; c.lineWidth = 1.3; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke();
      c.lineWidth = 0.55; c.beginPath(); for (const [x, y] of pts) { c.moveTo(x, y); c.lineTo(0, 0); } c.stroke();
      for (const f of [0.35, 0.65]) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * f, y * f) : c.moveTo(x * f, y * f)); c.closePath(); c.stroke(); }
      // Abspannseile
      c.strokeStyle = 'rgba(40,40,40,0.45)'; c.lineWidth = 0.35; for (const a of [-1.571, 0.52, 2.62]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); c.stroke(); }
      // Antennenschüsseln
      for (const [x, y, a] of [[2.5, -4, 0.3], [-3, 1, 2.6]]) { c.fillStyle = '#e8e6de'; c.beginPath(); c.ellipse(x, y, 2.4, 1.5, a, 0, 6.28); c.fill(); }
      c.fillStyle = '#d0302a'; c.beginPath(); c.arc(0, 0, 1.3, 0, 6.28); c.fill();
    }, { bevel: 0.5 });
  }),
};

// Dynamische Zeichnung, lokale Koordinaten
export function drawBuildingArt(ctx, b, color, t, o = {}) {
  const T = b.type;
  if (T === 'hq') {
    const p = STAT.hq(color); drawPartShadow(ctx, p, 4, 5, 0.32); drawPart(ctx, p);
    flag(ctx, 4, 12, color, t, 18); flag(ctx, -38, 33, color, t + 1, 12);
    return;
  }
  if (T === 'fob') { const p = STAT.fob(color); drawPartShadow(ctx, p, 3, 4, 0.3); drawPart(ctx, p); flag(ctx, 12, 6, color, t, 14); antennaBlink(ctx, 12, 6, t, b.id); if (b.hack) hackFx(ctx, t); return; }
  if (T === 'sandsack') { const p = STAT.sandsack(); drawPart(ctx, p); return; }
  if (T === 'hesco') { const p = STAT.hesco(); drawPartShadow(ctx, p, 4, 5, 0.4); drawPart(ctx, p); return; }
  if (T === 'bremer') { const p = STAT.bremer(); drawPartShadow(ctx, p, 4, 5, 0.4); drawPart(ctx, p); return; }
  if (T === 'moerser') { drawPart(ctx, STAT.moerser()); ctx.save(); ctx.rotate((o.turret ?? 0) + (b.facing || 0)); ctx.translate(-(o.recoil || 0) * 2, 0); drawPart(ctx, STAT.mortarTube()); ctx.restore(); return; }
  if (T === 'sam') { const p = STAT.sam(color); drawPart(ctx, p); ctx.save(); ctx.rotate((o.turret ?? Math.sin(t * 0.3 + b.id) * 0.8) + (b.facing || 0)); drawPartShadow(ctx, STAT.samLauncher(color), 1.5, 2, 0.35); drawPart(ctx, STAT.samLauncher(color)); ctx.restore(); return; }
  if (T === 'ciws') { drawPart(ctx, STAT.ciws()); ctx.save(); ctx.rotate((o.turret ?? Math.sin(t * 0.5 + b.id) * 1.2) + (b.facing || 0)); drawPartShadow(ctx, STAT.ciwsGun(color), 1.5, 2, 0.35); drawPart(ctx, STAT.ciwsGun(color)); ctx.restore(); return; }
  if (T === 'werkstatt') { const p = STAT.werkstatt(color); drawPartShadow(ctx, p, 3, 4, 0.3); drawPart(ctx, p); return; }
  if (T === 'wachturm') { const p = STAT.wachturm(color); drawPartShadow(ctx, p, 7, 9, 0.35); drawPart(ctx, p); return; }
  if (T === 'bohrturm') {
    drawPart(ctx, STAT.bohrturm(color));
    const on = !!b.drillOn, bob = on ? Math.sin(t * 5) * 1.2 : 0;
    ctx.save(); ctx.translate(2, -2); drawPartShadow(ctx, STAT.derrick(color), 8, 10, 0.3); ctx.translate(0, bob * 0.3); drawPart(ctx, STAT.derrick(color)); ctx.restore();
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,60,${0.35 + 0.25 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(2, -2, 4, 0, 6.28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    return;
  }
}
export function drawTower(ctx, x, y, ownerColor, t, cd) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.15, 1.15);
  const p = STAT.funkturm(); drawPartShadow(ctx, p, 8, 10, 0.25); drawPart(ctx, p);
  const blink = (t * 1.2) % 1 < 0.15;
  ctx.globalCompositeOperation = 'lighter';
  const col = ownerColor ? ownerColor : '#ffffff';
  ctx.fillStyle = blink ? col : 'rgba(255,60,50,0.6)'; ctx.beginPath(); ctx.arc(0, 0, blink ? 3.2 : 1.8, 0, 6.28); ctx.fill();
  if (ownerColor) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16); g.addColorStop(0, ownerColor + '55'); g.addColorStop(1, ownerColor + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 6.28); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
function flag(ctx, x, y, color, t, len) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#2a2a28'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(3, 3); for (let k = 0; k <= 6; k++) ctx.lineTo(3 + k * len / 6, 3 + Math.sin(t * 4 + k * 0.9) * 1.6); ctx.lineTo(3 + len, 9); for (let k = 6; k >= 0; k--) ctx.lineTo(3 + k * len / 6, 9 + Math.sin(t * 4 + k * 0.9) * 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); for (let k = 0; k <= 6; k++) ctx.lineTo(k * len / 6, Math.sin(t * 4 + k * 0.9) * 1.6 - 1); ctx.lineTo(len, 5); for (let k = 6; k >= 0; k--) ctx.lineTo(k * len / 6, 5 + Math.sin(t * 4 + k * 0.9) * 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, -1, len * 0.4, 1.2);
  ctx.restore();
}
function antennaBlink(ctx, x, y, t, id) { if ((t * 0.9 + id * 0.37) % 1 < 0.12) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,50,0.95)'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
function hackFx(ctx, t) {
  ctx.strokeStyle = `rgba(255,80,60,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
}

// ---------- weitere Wardogs-Bauten ----------
Object.assign(STAT, {
  draht: () => part('w-draht', 50, 46, (L) => { L((c) => {
    c.strokeStyle = '#6a6a64'; c.lineWidth = 0.6;
    for (const off of [-8, 0, 8]) { c.beginPath(); for (let k = 0; k <= 60; k++) { const x = -18 + k * 0.6, y = off + Math.sin(k * 0.9) * 3.2; k ? c.lineTo(x, y + Math.cos(k * 0.9) * 1.2) : c.moveTo(x, y); } c.stroke(); }
    c.fillStyle = '#4a3a28'; for (const x of [-17, -6, 5, 16]) for (const y of [-8, 0, 8]) { c.beginPath(); c.arc(x, y, 0.9, 0, 6.28); c.fill(); }
  }, { flat: true }); }),
  igel: () => part('w-igel', 50, 46, (L) => { L((c) => {
    for (const [x, y] of [[-9, -7], [8, -6], [-1, 7], [10, 9], [-11, 8]]) { c.save(); c.translate(x, y); c.strokeStyle = '#5a5650'; c.lineWidth = 2.2; c.lineCap = 'round'; for (const a of [0, 1.05, 2.1]) { c.beginPath(); c.moveTo(Math.cos(a) * -5, Math.sin(a) * -5); c.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); c.stroke(); } c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-4, -1); c.lineTo(4, -1); c.stroke(); c.restore(); }
  }, { bevel: 0.6 }); }),
  zelt: (color) => part(`w-zelt-${color}`, 44, 40, (L) => { const cm = camo(color); L((c) => {
    c.fillStyle = lg(c, -12, -9, 0, 0, tone(cm[0], 1.1), cm[1]); c.beginPath(); c.moveTo(-13, -9); c.lineTo(13, -9); c.lineTo(13, 0); c.lineTo(-13, 0); c.fill();
    c.fillStyle = lg(c, 0, 0, 12, 9, cm[1], cm[2]); c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.lineTo(13, 9); c.lineTo(-13, 9); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.stroke();
    c.strokeStyle = 'rgba(60,70,40,0.6)'; c.lineWidth = 0.4; for (let x = -12; x < 13; x += 2.5) { c.beginPath(); c.moveTo(x, -9); c.lineTo(x + 1, 9); c.stroke(); }
  }, { bevel: 0.5, grime: 0.4 }); }),
  hesco_s: () => part('w-hesco-s', 30, 30, (L) => { L((c) => { c.fillStyle = lg(c, -6, -6, 6, 6, '#c7b58a', '#7d6c48'); c.fillRect(-6, -6, 12, 12); c.fillStyle = 'rgba(110,90,60,0.6)'; c.fillRect(-4.8, -4.8, 9.6, 9.6); c.strokeStyle = 'rgba(60,60,55,0.7)'; c.lineWidth = 0.35; for (let k = -6; k <= 6; k += 2) { c.beginPath(); c.moveTo(-6, k); c.lineTo(6, k); c.moveTo(k, -6); c.lineTo(k, 6); c.stroke(); } }, { bevel: 0.8, grime: 0.4 }); }),
  tuer: (color) => part(`w-tuer-${color}`, 54, 40, (L) => { L((c) => {
    for (const x of [-16, 9]) { c.fillStyle = lg(c, x, -5, x + 9, 5, '#c7b58a', '#7d6c48'); c.fillRect(x, -5, 8, 10); }
    c.fillStyle = lg(c, -7, -2, 7, 2, '#6e7350', '#3e4128'); c.fillRect(-7.5, -2.2, 16, 4.4); c.fillStyle = color; c.fillRect(-1, -2.2, 2, 4.4);
  }, { bevel: 0.7, grime: 0.3 }); }),
  tor: (color) => part(`w-tor-${color}`, 60, 44, (L) => { L((c) => {
    for (const x of [-22, 15]) { c.fillStyle = lg(c, x, -7, x + 8, 7, '#c7b58a', '#7d6c48'); c.fillRect(x, -7, 7, 14); }
    c.fillStyle = lg(c, -14, -2, 14, 2, '#7a7a72', '#3a3a36'); c.fillRect(-15, -2.4, 30, 4.8);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.5; for (let x = -13; x < 15; x += 3) { c.beginPath(); c.moveTo(x, -2.4); c.lineTo(x + 2, 2.4); c.stroke(); }
    c.fillStyle = color; c.fillRect(-1, -2.4, 2, 4.8); hazard(c, -15, 3, 30, 1.6);
  }, { bevel: 0.7 }); }),
  lautsprecher: (color) => part(`w-laut-${color}`, 40, 40, (L) => { L((c) => {
    c.strokeStyle = '#4a4a46'; c.lineWidth = 0.6; for (const a of [0.4, 2.5, 4.6]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); c.stroke(); }
    c.fillStyle = '#3a3a36'; c.beginPath(); c.arc(0, 0, 2.2, 0, 6.28); c.fill();
    for (const a of [-0.8, 0.8, 2.4, 4.0]) { c.save(); c.rotate(a); c.fillStyle = lg(c, 2, -2, 8, 2, '#d8d6cc', '#86847a'); c.beginPath(); c.moveTo(2, -1.2); c.lineTo(8, -3.4); c.lineTo(8, 3.4); c.lineTo(2, 1.2); c.closePath(); c.fill(); c.restore(); }
    c.fillStyle = color; c.beginPath(); c.arc(0, 0, 1, 0, 6.28); c.fill();
  }, { bevel: 0.6 }); }),
  bunker: (color) => part(`w-bunker-${color}`, 50, 46, (L) => { L((c) => {
    c.fillStyle = lg(c, -14, -12, 14, 12, CONC[0], CONC[2]); rr(c, -15, -12, 30, 24, 4); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(12, -6, 2, 12); c.fillRect(-6, -12, 12, 1.6);
    c.fillStyle = 'rgba(255,255,255,0.12)'; rr(c, -12, -9, 24, 18, 3); c.fill();
    c.fillStyle = color; c.fillRect(-15, -2, 1.6, 4);
  }, { bevel: 0.9, grime: 0.4 }); L((c) => ringBags(c, 18, 18, 1.0, 5.3, 3), { flat: true }); }),
  schutz: (color) => part(`w-schutz-${color}`, 52, 48, (L) => { L((c) => {
    c.fillStyle = lg(c, -15, -15, 15, 15, CONC[0], CONC[2]); rr(c, -15, -15, 30, 30, 3); c.fill();
    c.fillStyle = '#2a2724'; for (const [x, y, w, h] of [[-3, -15, 6, 3], [-3, 12, 6, 3], [-15, -3, 3, 6], [12, -3, 3, 6]]) c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.6; c.strokeRect(-10, -10, 20, 20);
    c.fillStyle = color; c.fillRect(-1, -1, 2, 2);
  }, { bevel: 0.9, grime: 0.35 }); }),
  stingray: (color) => part(`w-sting-${color}`, 50, 46, (L) => { L((c) => {
    c.fillStyle = lg(c, -12, -10, 12, 10, '#6e7350', '#3e4128'); rr(c, -13, -10, 26, 20, 2); c.fill();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = -8 + i * 8, y = -5 + j * 10; c.fillStyle = '#1e1f1c'; rr(c, x - 3, y - 3, 6, 6, 1); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x - 2, y - 2); c.lineTo(x + 2, y + 2); c.moveTo(x + 2, y - 2); c.lineTo(x - 2, y + 2); c.stroke(); }
    c.fillStyle = color; c.fillRect(-13, -10, 1.6, 20); hazard(c, -13, 10, 26, 2);
  }, { bevel: 0.7 }); }),
  tankstelle: (color) => part(`w-tank-${color}`, 52, 46, (L) => { L((c) => {
    c.fillStyle = 'rgba(70,66,58,0.85)'; rr(c, -18, -15, 36, 30, 3); c.fill();
    for (const y of [-7, 4]) { c.fillStyle = lg(c, -14, y - 4, 6, y + 4, '#e6e2d4', '#8a867a'); rr(c, -15, y - 4, 22, 8, 4); c.fill(); c.fillStyle = '#c84a30'; c.fillRect(-6, y - 4, 2, 8); }
    c.fillStyle = '#2a2a28'; rr(c, 10, -4, 5, 8, 1); c.fill(); c.fillStyle = '#d9a33a'; c.fillRect(11, -3, 3, 2);
    c.fillStyle = color; c.fillRect(-18, -15, 1.6, 30);
  }, { bevel: 0.7, grime: 0.4 }); }),
});
const WALLISH = { draht: 1, igel: 1, zelt: 1, hesco_s: 1, tuer: 1, tor: 1, lautsprecher: 1, bunker: 1, schutz: 1, stingray: 1, tankstelle: 1 };
const _drawArt = drawBuildingArt;
export function drawBuildingArt2(ctx, b, color, t, o = {}) {
  const T = b.type;
  if (T === 'turm') { const p = STAT.wachturm(color); drawPartShadow(ctx, p, 7, 9, 0.35); drawPart(ctx, p); return; }
  if (WALLISH[T]) {
    const p = STAT[T](color); ctx.save(); if (T === 'tuer' || T === 'tor') ctx.rotate(b.facing || 0);
    drawPartShadow(ctx, p, 3, 4, 0.35); drawPart(ctx, p); ctx.restore();
    if (T === 'stingray' && o.recoil) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,120,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    return;
  }
  return _drawArt(ctx, b, color, t, o);
}

export function drawConstruction(ctx, b, color, t, prog) {
  // Fundament mit Absperrband und Gerüst, Fortschrittsring
  ctx.fillStyle = 'rgba(80,70,55,0.55)'; rr(ctx, -16, -16, 32, 32, 3); ctx.fill();
  ctx.save(); ctx.beginPath(); rr(ctx, -16, -16, 32, 32, 3); ctx.clip();
  ctx.globalAlpha = 0.35 + prog * 0.5; drawBuildingArt2(ctx, { ...b, drillOn: false }, color, t, {}); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = '#d9a33a'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.strokeRect(-17, -17, 34, 34); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(200,200,190,0.7)'; ctx.lineWidth = 0.7; for (let k = -16; k <= 16; k += 8) { ctx.beginPath(); ctx.moveTo(k, -16); ctx.lineTo(k, 16); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.28); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, 9, -1.571, -1.571 + 6.283 * Math.max(0.06, prog)); ctx.stroke();
}
