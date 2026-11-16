// Grafik-Verteiler: Einheiten, Bauten, Kachel-Icons
import { rgba } from './util.js';
import { MDRAW } from './mart.js';
import { IDRAW } from './iart.js';
import { UNITS, BUILDINGS } from './data.js';
import { drawBuildingArt, drawConstruction } from './wart.js';

const DRAW = Object.assign({}, MDRAW, IDRAW);

export function drawUnit(ctx, u, x, y, color, t, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.ring) {
    ctx.fillStyle = rgba(color, 0.22); ctx.strokeStyle = rgba(color, 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 4, 27, 16, 0, 0, 6.28); ctx.fill(); ctx.stroke();
  }
  ctx.scale(o.scale || 1.62, o.scale || 1.62);
  if (u.downed) { downed(ctx, u, color, t); ctx.restore(); return; }
  const f = DRAW[u.type];
  if (f) f(ctx, u, color, t, o);
  ctx.restore();
}

// Verwundeter Trupp: liegende Figur mit Blutlache und Notsignal
function downed(ctx, u, color, t) {
  ctx.save(); ctx.rotate(u.facing + 1.2);
  ctx.fillStyle = 'rgba(120,10,8,0.55)'; ctx.beginPath(); ctx.ellipse(1, 2, 8, 5, 0.3, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#5a5a48'; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 3.2, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-2, -3, 2, 2);
  ctx.fillStyle = '#3e3e32'; ctx.beginPath(); ctx.arc(6, 0, 2.4, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#1b1d20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(5, 7); ctx.stroke();
  ctx.restore();
  const pu = 0.5 + 0.5 * Math.sin(t * 5 + u.id);
  ctx.fillStyle = `rgba(255,255,255,${0.75 + 0.25 * pu})`; ctx.beginPath(); ctx.arc(0, -11, 4.4, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#d0302a'; ctx.fillRect(-0.9, -14, 1.8, 6); ctx.fillRect(-3, -11.9, 6, 1.8);
}

export function drawBuilding(ctx, b, x, y, color, t, o = {}) {
  ctx.save(); ctx.translate(x, y);
  const rise = b.rise ?? 1;
  const sc = (0.8 + 0.2 * rise) * 1.12;
  ctx.scale(sc, sc);
  if (b.turnsLeft > 0 && b.def.turns) drawConstruction(ctx, b, color, t, 1 - b.turnsLeft / Math.max(1, b.def.turns));
  else drawBuildingArt(ctx, b, color, t, o);
  ctx.restore();
}

// ---------- Kachel-Icons für das Menü ----------
const iconCache = new Map(), iconBg = {};
function iconBackdrop(sky) {
  if (iconBg[sky]) return iconBg[sky];
  const W = 240, H = 180, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, W * 0.3, H);
  if (sky) { g.addColorStop(0, '#a9b8b0'); g.addColorStop(1, '#6f7f74'); } else { g.addColorStop(0, '#8fa060'); g.addColorStop(1, '#5c6a3a'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 60; k++) {
    const x = Math.random() * W, y = Math.random() * H;
    c.strokeStyle = sky ? 'rgba(255,255,255,0.08)' : 'rgba(40,60,20,0.18)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + Math.random() * 20, y + 4); c.stroke();
  }
  for (let k = 0; k < 400; k++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(30,40,15,0.18)' : 'rgba(255,250,220,0.14)'; c.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2); }
  const l = c.createRadialGradient(W * 0.3, H * 0.25, 10, W * 0.5, H * 0.5, W * 0.75);
  l.addColorStop(0, 'rgba(255,245,210,0.22)'); l.addColorStop(0.6, 'rgba(0,0,0,0)'); l.addColorStop(1, 'rgba(10,15,5,0.55)');
  c.fillStyle = l; c.fillRect(0, 0, W, H);
  return (iconBg[sky] = cv);
}
export function icon(kind, type, color) {
  const key = kind + type + color;
  if (iconCache.has(key)) return iconCache.get(key);
  const W = 240, H = 180, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const def = kind === 'unit' ? (UNITS[type] || {}) : {};
  const air = def.mt === 'air';
  ctx.drawImage(iconBackdrop(air), 0, 0);
  ctx.save();
  if (kind === 'unit') {
    const sc = def.cat === 'inf' ? 3.6 : air ? (type === 'lastheli' ? 1.55 : 1.85) : (type === 'laster' || type === 'grad' || type === 'artillerie') ? 2.0 : 2.3;
    ctx.translate(W / 2, H * 0.55 + (air ? 18 : 0)); ctx.scale(sc, sc);
    const fake = { type, def: { ...def }, facing: -0.55, id: 3, ammo: def.ammo || 0, hp: 100, passengers: [], cargoP: [], antenna: true };
    drawUnit(ctx, fake, 0, 0, color, 0.3, { z: air ? 14 : 0, turret: 0.15 });
  } else {
    const bd = BUILDINGS[type] || {};
    const s = type === 'hq' ? 1.1 : type === 'fob' ? 1.7 : 2.05;
    ctx.translate(W / 2, H * 0.53); ctx.scale(s, s);
    drawBuilding(ctx, { type, turnsLeft: 0, def: bd, facing: -0.6, rise: 1, id: 1, c: 0, r: 0 }, 0, 0, color, 0.7, {});
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(230,240,210,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
  iconCache.set(key, cv);
  return cv;
}
