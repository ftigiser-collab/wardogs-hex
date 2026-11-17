// Moderne Militärfahrzeuge und Hubschrauber (Draufsicht, Licht von oben links), je Fraktion eigener Tarnanstrich
import { part, drawPart, drawPartShadow, rr, lg, rg, box, rivets, rivetRow, vents, seams, hazard, emblem } from './art.js';
import { FACTIONS } from './data.js';
import { hexToRgb } from './util.js';

const CAMO = {};
for (const f of Object.values(FACTIONS)) CAMO[f.color] = f.camo;
// Farbe multiplikativ aufhellen/abdunkeln (k > 1 heller, k < 1 dunkler)
export function tone(hex, k) { const [r, g, b] = hexToRgb(hex); const m = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) * 0.9 : v * k))); return `rgb(${m(r)},${m(g)},${m(b)})`; }
export function camo(color) { return CAMO[color] || ['#8e9468', '#575c3c', '#30331f']; }

function tracks(c, x, y, w, h) {
  c.fillStyle = '#1b1a17'; rr(c, x, y, w, h, h * 0.4); c.fill();
  c.fillStyle = '#34312b'; for (let k = x + 1; k < x + w - 1; k += 2.1) c.fillRect(k, y + 0.5, 1.1, h - 1);
  c.fillStyle = 'rgba(255,240,210,0.12)'; c.fillRect(x + 1, y + 0.5, w - 2, 0.6);
}
function wheel(c, x, y, rw, rh) { c.fillStyle = '#16150f'; rr(c, x - rw, y - rh, rw * 2, rh * 2, rh * 0.8); c.fill(); c.fillStyle = '#3a3830'; for (let k = -rw + 0.8; k < rw; k += 1.6) c.fillRect(x + k, y - rh, 0.6, rh * 2); }
// Tarnflecken auf einer Fläche
function blotches(c, x0, y0, w, h, cm, seed, n = 7) {
  let s = seed;
  const R = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let k = 0; k < n; k++) {
    const x = x0 + R() * w, y = y0 + R() * h, rw = 2 + R() * 4, rh = 1.2 + R() * 2.4;
    c.fillStyle = k % 2 ? cm[1] : cm[2]; c.globalAlpha = 0.55;
    c.beginPath(); c.ellipse(x, y, rw, rh, R() * 3, 0, 6.28); c.fill();
  }
  c.globalAlpha = 1;
}
const plate = (c, pts, a, b, x0 = -16, y0 = -12, x1 = 10, y1 = 14) => { c.fillStyle = lg(c, x0, y0, x1, y1, a, b); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); };
const treadAnim = (c, x, y, w, h, t, moving) => { if (!moving) return; const off = (t * 26) % 2.1; c.fillStyle = 'rgba(90,82,70,0.9)'; for (let k = x + off; k < x + w; k += 2.1) c.fillRect(k, y, 0.8, h); };

// ---------- Geländewagen (Basis für Rotorjeep) ----------
const jeepHull = (color) => part(`m-jeep-${color}`, 36, 24, (L) => {
  const cm = camo(color);
  L((c) => { for (const [x, y] of [[-8.5, -8.6], [8, -8.6], [-8.5, 8.6], [8, 8.6]]) wheel(c, x, y, 3, 1.8); }, { bevel: 0.4, grime: 0.3 });
  L((c) => {
    plate(c, [[15, -5.5], [13, -7.5], [-13, -7.5], [-15, -6], [-15, 6], [-13, 7.5], [13, 7.5], [15, 5.5]], tone(cm[0], 1.1), cm[2]);
    blotches(c, -14, -7, 28, 14, cm, color.length * 31 + 7, 8);
    // Motorhaube mit Lüftungsschlitzen
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(6, -6, 0.6, 12);
    vents(c, 9, -3, 4, 6, 4, true);
    // Frontscheibe, Dach mit Ring
    c.fillStyle = 'rgba(130,190,220,0.85)'; rr(c, 3.4, -5.4, 2, 10.8, 0.6); c.fill();
    c.fillStyle = tone(cm[1], 0.95); rr(c, -6, -6, 9, 12, 1.2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(-1.5, 0, 3.4, 0, 6.28); c.fill();
    c.fillStyle = color; c.fillRect(-13.5, -7.5, 1.6, 15);
    // Reserverad hinten
    c.fillStyle = '#1b1a17'; c.beginPath(); c.arc(-14.6, 0, 2.6, 0, 6.28); c.fill(); c.fillStyle = '#4a463d'; c.beginPath(); c.arc(-14.6, 0, 1.1, 0, 6.28); c.fill();
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fillRect(14.4, -4.8, 0.8, 1.6); c.fillRect(14.4, 3.2, 0.8, 1.6);
  }, { bevel: 0.6, dust: 0.25 });
});
const jeepGun = (color, mini) => part(`m-jeepgun-${color}-${mini ? 1 : 0}`, 26, 12, (L) => {
  L((c) => {
    if (mini) { for (const y of [-0.9, 0, 0.9]) { c.fillStyle = '#1b1c1e'; c.fillRect(2, y - 0.35, 11, 0.7); } c.fillStyle = '#2c2d30'; rr(c, 1, -1.8, 4, 3.6, 0.8); c.fill(); }
    else { c.fillStyle = '#1b1c1e'; c.fillRect(1.5, -0.7, 10, 1.4); c.fillStyle = '#2c2d30'; c.fillRect(9, -1, 2.6, 2); }
    c.fillStyle = '#3a3b3e'; rr(c, -3, -2.4, 5, 4.8, 1); c.fill();
    c.fillStyle = '#4b4c4f'; c.fillRect(-1, -3.2, 3, 6.4);
  }, { bevel: 0.4 });
});

// ---------- Lastwagen ----------
const lasterHull = (color) => part(`m-laster-${color}`, 48, 24, (L) => {
  const cm = camo(color);
  L((c) => { for (const x of [-13, -6, 11]) for (const y of [-8.6, 8.6]) wheel(c, x, y, 2.9, 1.8); }, { bevel: 0.4, grime: 0.35 });
  L((c) => {
    plate(c, [[19, -5], [17.5, -7.2], [10, -7.2], [10, 7.2], [17.5, 7.2], [19, 5]], tone(cm[0], 1.1), cm[2]);
    c.fillStyle = 'rgba(130,190,220,0.85)'; rr(c, 14.5, -5.6, 1.8, 11.2, 0.5); c.fill();
    c.fillStyle = tone(cm[1], 0.9); rr(c, 10.5, -6.4, 3.6, 12.8, 0.8); c.fill();
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fillRect(18.6, -4.6, 0.7, 1.5); c.fillRect(18.6, 3.1, 0.7, 1.5);
    c.fillStyle = color; c.fillRect(10, -7.2, 1.2, 14.4);
    // Ladefläche
    plate(c, [[9, -8], [-21, -8], [-21, 8], [9, 8]], tone(cm[1], 1.05), tone(cm[2], 0.9));
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.5; for (let x = -19; x < 9; x += 3.5) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, 8); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-21, -8, 30, 1); c.fillRect(-21, 7, 30, 1);
  }, { bevel: 0.6, dust: 0.3 });
});
const lasterTarp = (color) => part(`m-tarp-${color}`, 34, 20, (L) => {
  const cm = camo(color);
  L((c) => {
    c.fillStyle = lg(c, 0, -8, 0, 8, tone(cm[0], 0.95), tone(cm[2], 1.05)); rr(c, -14.5, -7.6, 29, 15.2, 2.4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.6; for (let x = -11; x < 14; x += 5) { c.beginPath(); c.moveTo(x, -7.6); c.quadraticCurveTo(x - 0.6, 0, x, 7.6); c.stroke(); }
    c.fillStyle = 'rgba(255,255,240,0.12)'; c.fillRect(-14, -1.2, 28, 2.4);
  }, { bevel: 0.5, grime: 0.4 });
});
const palletPart = (kind) => part(`m-pallet-${kind}`, 14, 14, (L) => {
  L((c) => {
    c.fillStyle = '#8a6a44'; c.fillRect(-6.5, -6.5, 13, 13);
    if (kind === 'sprit') { for (const [x, y] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { c.fillStyle = rg(c, x - 0.8, y - 0.8, 0.3, 3, '#d8563c', '#7a2416'); c.beginPath(); c.arc(x, y, 2.7, 0, 6.28); c.fill(); c.fillStyle = '#2a1a12'; c.beginPath(); c.arc(x + 0.8, y - 0.8, 0.6, 0, 6.28); c.fill(); } }
    else { c.fillStyle = lg(c, -6, -6, 6, 6, '#c9b892', '#7c6a4c'); c.fillRect(-5.8, -5.8, 11.6, 11.6); c.strokeStyle = 'rgba(40,30,20,0.6)'; c.lineWidth = 0.6; c.strokeRect(-5.8, -5.8, 11.6, 11.6); c.beginPath(); c.moveTo(-5.8, 0); c.lineTo(5.8, 0); c.moveTo(0, -5.8); c.lineTo(0, 5.8); c.stroke(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-6, -2); c.lineTo(6, -2); c.moveTo(-6, 2); c.lineTo(6, 2); c.stroke(); }
  }, { bevel: 0.5, grime: 0.35 });
});

// ---------- Einsatz-SPz (Kettentransporter mit Antenne) ----------
const spzHull = (color, ant) => part(`m-spz-${color}-${ant ? 1 : 0}`, 42, 30, (L) => {
  const cm = camo(color);
  L((c) => { tracks(c, -17, -12.5, 34, 5.5); tracks(c, -17, 7, 34, 5.5); }, { bevel: 0.5, grime: 0.4 });
  L((c) => {
    plate(c, [[16, -4], [13, -8], [-15, -8], [-16, -7], [-16, 7], [-15, 8], [13, 8], [16, 4]], tone(cm[0], 1.08), cm[2]);
    blotches(c, -15, -7.5, 30, 15, cm, 1777, 10);
    seams(c, [[10, -8, 10, 8], [-4, -8, -4, 8]]);
    c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, -15.5, -5, 3, 10, 0.6); c.fill(); hazard(c, -15.5, -5, 1.2, 10);
    rivetRow(c, -13, -7.2, 9, -7.2, 9, 0.32); rivetRow(c, -13, 7.2, 9, 7.2, 9, 0.32);
    // Luken
    c.fillStyle = tone(cm[1], 0.95); c.beginPath(); c.arc(4, -3.5, 2.6, 0, 6.28); c.fill(); c.beginPath(); c.arc(-8, 2.5, 3, 0, 6.28); c.fill();
    rivets(c, [[4, -3.5], [-8, 2.5]], 0.5);
    c.fillStyle = color; c.fillRect(-2, -8, 1.6, 16);
    // Antenne: Mast mit Satellitenschüssel
    if (ant) {
      c.fillStyle = '#d8d8d0'; c.beginPath(); c.ellipse(-10, -4, 3.4, 2.6, -0.4, 0, 6.28); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(-9.5, -3.6, 2.2, 1.6, -0.4, 0, 6.28); c.fill();
      c.fillStyle = '#555'; c.beginPath(); c.arc(-10, -4, 0.7, 0, 6.28); c.fill();
    } else { c.fillStyle = '#2a2724'; c.beginPath(); c.arc(-10, -4, 1.4, 0, 6.28); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-10, -4); c.lineTo(-7.5, -6.5); c.moveTo(-10, -4); c.lineTo(-12, -1); c.stroke(); }
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fillRect(15, -3.2, 0.8, 1.4); c.fillRect(15, 1.8, 0.8, 1.4);
  }, { bevel: 0.7, dust: 0.3 });
});

// ---------- Kampfpanzer ----------
const panzerHull = (color) => part(`m-mbt-${color}`, 44, 32, (L) => {
  const cm = camo(color);
  L((c) => { tracks(c, -19, -13.5, 38, 6.5); tracks(c, -19, 7, 38, 6.5); }, { bevel: 0.5, grime: 0.4 });
  L((c) => {
    plate(c, [[18, -5], [15, -8.5], [-16, -8.5], [-18, -6], [-18, 6], [-16, 8.5], [15, 8.5], [18, 5]], tone(cm[0], 1.08), cm[2]);
    blotches(c, -17, -8, 34, 16, cm, 2345, 11);
    vents(c, -17, -5, 5, 10, 5, true);
    seams(c, [[8, -8.5, 8, 8.5], [-10, -8.5, -10, 8.5]]);
    for (const yy of [-12.8, 9.6]) { c.fillStyle = lg(c, 0, yy, 0, yy + 3.2, tone(cm[0], 1.05), tone(cm[2], 1.1)); rr(c, -14, yy, 30, 3.2, 0.8); c.fill(); }
    c.fillStyle = color; c.fillRect(-12, -8.5, 1.6, 17);
    c.fillStyle = 'rgba(255,240,200,0.85)'; c.fillRect(17, -4.5, 0.9, 1.5); c.fillRect(17, 3, 0.9, 1.5);
  }, { bevel: 0.7, dust: 0.25 });
});
const panzerTurret = (color) => part(`m-mbtt-${color}`, 56, 24, (L) => {
  const cm = camo(color);
  L((c) => { c.fillStyle = lg(c, 0, -2, 0, 2, '#4a4840', '#1c1b17'); c.fillRect(5, -1.5, 22, 3); c.fillStyle = '#2a2925'; rr(c, 12, -2.2, 3, 4.4, 0.6); c.fill(); c.fillStyle = '#111'; c.fillRect(26, -0.8, 1.2, 1.6); }, { bevel: 0.4 });
  L((c) => {
    c.fillStyle = lg(c, -9, -8, 9, 8, tone(cm[0], 1.15), cm[2]);
    c.beginPath(); c.moveTo(9, -3.5); c.lineTo(6, -8); c.lineTo(-9, -8.5); c.lineTo(-12, -5); c.lineTo(-12, 5); c.lineTo(-9, 8.5); c.lineTo(6, 8); c.lineTo(9, 3.5); c.closePath(); c.fill();
    blotches(c, -11, -7.5, 18, 15, cm, 999, 6);
    c.fillStyle = tone(cm[1], 0.9); c.beginPath(); c.arc(-3, -3.5, 2.6, 0, 6.28); c.fill(); rivets(c, [[-3, -3.5]], 0.5);
    c.fillStyle = '#2c2a26'; rr(c, -10, 1.5, 4.5, 3.4, 0.6); c.fill(); c.fillStyle = 'rgba(150,215,255,0.8)'; c.fillRect(-9.4, 2.4, 3.2, 1);
    emblem(c, 2.5, 4, 2, color);
    c.fillStyle = '#3b3a35'; c.fillRect(-12.5, -4, 1.6, 8);
  }, { bevel: 0.8, dust: 0.2 });
});

// ---------- Artilleriepanzer ----------
const artyHull = (color) => part(`m-arty-${color}`, 44, 32, (L) => {
  const cm = camo(color);
  L((c) => { tracks(c, -19, -13, 38, 6); tracks(c, -19, 7, 38, 6); }, { bevel: 0.5, grime: 0.4 });
  L((c) => {
    plate(c, [[18, -4], [15, -8], [-17, -8], [-18, -7], [-18, 7], [-17, 8], [15, 8], [18, 4]], tone(cm[0], 1.06), cm[2]);
    blotches(c, -17, -7.5, 34, 15, cm, 4321, 10);
    vents(c, 10, -5, 5, 10, 4, true); c.fillStyle = color; c.fillRect(7, -8, 1.6, 16);
    c.fillStyle = 'rgba(255,240,200,0.85)'; c.fillRect(17, -3.5, 0.9, 1.4); c.fillRect(17, 2.1, 0.9, 1.4);
  }, { bevel: 0.7, dust: 0.25 });
});
const artyTurret = (color) => part(`m-artyt-${color}`, 70, 26, (L) => {
  const cm = camo(color);
  L((c) => { c.fillStyle = lg(c, 0, -2, 0, 2, '#4a4840', '#1c1b17'); c.fillRect(4, -1.6, 30, 3.2); c.fillStyle = '#2a2925'; rr(c, 30, -2.6, 5, 5.2, 0.8); c.fill(); for (let x = 33; x < 35; x += 0.8) { c.fillStyle = '#111'; c.fillRect(x, -2.6, 0.3, 5.2); } }, { bevel: 0.4 });
  L((c) => {
    c.fillStyle = lg(c, -12, -9, 8, 9, tone(cm[0], 1.12), cm[2]); rr(c, -16, -9, 22, 18, 2.4); c.fill();
    blotches(c, -15, -8.5, 20, 17, cm, 777, 7);
    c.fillStyle = tone(cm[1], 0.9); c.beginPath(); c.arc(-8, -4, 2.4, 0, 6.28); c.fill(); rivets(c, [[-8, -4]], 0.45);
    vents(c, -15, 2, 6, 5, 4, false);
    emblem(c, -2, 4.5, 2, color);
  }, { bevel: 0.8, dust: 0.2 });
});

// ---------- Grad-Werfer ----------
const gradHull = (color) => part(`m-grad-${color}`, 48, 24, (L) => {
  const cm = camo(color);
  L((c) => { for (const x of [-13, -6, 11]) for (const y of [-8.6, 8.6]) wheel(c, x, y, 2.9, 1.8); }, { bevel: 0.4, grime: 0.35 });
  L((c) => {
    plate(c, [[19, -5], [17.5, -7.2], [10, -7.2], [10, 7.2], [17.5, 7.2], [19, 5]], tone(cm[0], 1.1), cm[2]);
    c.fillStyle = 'rgba(130,190,220,0.85)'; rr(c, 14.5, -5.6, 1.8, 11.2, 0.5); c.fill();
    c.fillStyle = color; c.fillRect(10, -7.2, 1.2, 14.4);
    plate(c, [[9, -7], [-20, -7], [-20, 7], [9, 7]], tone(cm[1], 1), tone(cm[2], 0.9));
  }, { bevel: 0.6, dust: 0.3 });
});
const gradPod = (color) => part(`m-gradpod-${color}`, 34, 20, (L) => {
  const cm = camo(color);
  L((c) => {
    c.fillStyle = lg(c, 0, -7, 0, 7, tone(cm[0], 1.05), cm[2]); rr(c, -13, -7, 24, 14, 1.4); c.fill();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { const x = 9.5, y = -5.6 + j * 2.8 + (i % 2) * 0.4; c.fillStyle = '#14130f'; c.beginPath(); c.arc(x - i * 0.1, y, 1.1, 0, 6.28); c.fill(); }
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.4; for (let j = 0; j < 5; j++) { c.beginPath(); c.moveTo(-13, -5.6 + j * 2.8); c.lineTo(8, -5.6 + j * 2.8); c.stroke(); }
  }, { bevel: 0.6 });
});

// ---------- Hubschrauber ----------
const HELI = {
  heli: { len: 36, rot: 25, blades: 4, tail: 2, body(c, cm, color) {
    c.fillStyle = lg(c, -6, -7, 10, 7, tone(cm[0], 1.15), cm[2]); c.beginPath(); c.ellipse(4, 0, 10, 6.6, 0, 0, 6.28); c.fill();
    c.fillStyle = lg(c, 0, -2, 0, 2, tone(cm[1], 1.1), cm[2]); c.fillRect(-18, -1.2, 18, 2.4);
    c.fillStyle = tone(cm[1], 0.9); rr(c, -20, -4.5, 3, 9, 1); c.fill();
    c.fillStyle = 'rgba(150,210,235,0.9)'; c.beginPath(); c.ellipse(9.5, 0, 4.6, 5, 0, -1.4, 1.4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(10.5, -1.6, 2, 1.4, 0.5, 0, 6.28); c.fill();
    c.strokeStyle = '#25231f'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -7.6); c.lineTo(11, -7.6); c.moveTo(-4, 7.6); c.lineTo(11, 7.6); c.stroke();
    c.fillStyle = color; c.fillRect(-1, -6.4, 1.6, 12.8);
  } },
  sperber: { len: 38, rot: 25, blades: 4, tail: 2, body(c, cm, color) {
    HELI.heli.body(c, cm, color);
    for (const s of [-1, 1]) { c.fillStyle = '#2a2b2e'; rr(c, 0, s * 8.8 - 1.4, 8, 2.8, 1); c.fill(); for (const y of [-0.6, 0, 0.6]) { c.fillStyle = '#18191b'; c.fillRect(7, s * 8.8 + y - 0.25, 5, 0.5); } }
  } },
  lastheli: { len: 52, rot: 34, blades: 5, tail: 3, body(c, cm, color) {
    c.fillStyle = lg(c, -10, -8, 14, 8, tone(cm[0], 1.12), cm[2]); rr(c, -12, -7, 32, 14, 6); c.fill();
    blotches(c, -11, -6.5, 28, 13, cm, 2468, 9);
    c.fillStyle = lg(c, 0, -2, 0, 2, tone(cm[1], 1.1), cm[2]); c.beginPath(); c.moveTo(-12, -2.8); c.lineTo(-30, -1.2); c.lineTo(-30, 1.2); c.lineTo(-12, 2.8); c.closePath(); c.fill();
    c.fillStyle = tone(cm[1], 0.9); rr(c, -32, -5, 3, 10, 1); c.fill();
    c.fillStyle = 'rgba(150,210,235,0.9)'; c.beginPath(); c.ellipse(17, 0, 3.6, 5.6, 0, -1.3, 1.3); c.fill();
    c.fillStyle = '#2a2724'; for (const s of [-1, 1]) { rr(c, -2, s * 7.6 - 1.2, 9, 2.4, 1); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = -9; x < 10; x += 3.4) c.fillRect(x, -6.6, 1.6, 1.4);
    c.fillStyle = color; c.fillRect(-14, -2.6, 1.6, 5.2);
  } },
  kampfheli: { len: 46, rot: 28, blades: 4, tail: 2, body(c, cm, color) {
    c.fillStyle = lg(c, -8, -5, 12, 5, tone(cm[0], 1.12), cm[2]); c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(16, -4.6, 4, -4.6); c.lineTo(-6, -3.4); c.lineTo(-6, 3.4); c.lineTo(4, 4.6); c.quadraticCurveTo(16, 4.6, 20, 0); c.closePath(); c.fill();
    blotches(c, -5, -4, 22, 8, cm, 1357, 6);
    c.fillStyle = lg(c, 0, -2, 0, 2, tone(cm[1], 1.1), cm[2]); c.beginPath(); c.moveTo(-6, -2); c.lineTo(-24, -1); c.lineTo(-24, 1); c.lineTo(-6, 2); c.closePath(); c.fill();
    c.fillStyle = tone(cm[1], 0.9); rr(c, -26, -5.5, 3, 11, 1); c.fill(); c.fillRect(-25, -0.8, 6, 1.6);
    // Stummelflügel mit Raketenbehältern
    c.fillStyle = tone(cm[1], 0.95); rr(c, -1, -11, 5, 22, 1); c.fill();
    for (const s of [-1, 1]) for (const y of [7.6, 10.6]) { c.fillStyle = '#2b2c2f'; rr(c, -2, s * y - 1.3, 8, 2.6, 1.2); c.fill(); c.fillStyle = '#c84a30'; c.beginPath(); c.arc(6, s * y, 0.8, 0, 6.28); c.fill(); }
    c.fillStyle = 'rgba(150,210,235,0.9)'; rr(c, 8, -2.4, 9, 4.8, 2.2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(12.5, -2.4); c.lineTo(12.5, 2.4); c.stroke();
    c.fillStyle = '#222'; c.fillRect(19, -0.5, 4, 1);
    c.fillStyle = color; c.fillRect(-8, -3, 1.4, 6);
  } },
};
const heliBody = (type, color) => part(`m-heli-${type}-${color}`, HELI[type].len + 16, 30, (L) => {
  const cm = camo(color);
  L((c) => HELI[type].body(c, cm, color), { bevel: 0.6, dust: 0.15, grime: 0.35 });
});
function rotor(ctx, r, n, t, landed, alpha = 1) {
  const spin = landed ? 0.3 : t * 11;
  if (!landed) {
    const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
    g.addColorStop(0, `rgba(40,40,40,${0.03 * alpha})`); g.addColorStop(0.85, `rgba(40,40,40,${0.1 * alpha})`); g.addColorStop(1, 'rgba(40,40,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
  }
  ctx.strokeStyle = `rgba(28,28,26,${(landed ? 0.95 : 0.55) * alpha})`; ctx.lineWidth = landed ? 1.6 : 1.3; ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) { const a = spin + k / n * 6.283; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
  if (!landed) { ctx.strokeStyle = `rgba(28,28,26,${0.18 * alpha})`; for (let k = 0; k < n; k++) { const a = spin - 0.25 + k / n * 6.283; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } }
  ctx.fillStyle = '#2a2a28'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.28); ctx.fill();
}
function heliArt(ctx, u, color, t, o, type) {
  const H = HELI[type], z = o.z ?? 26, landed = !!o.landed;
  const p = heliBody(type, color);
  const zz = landed ? 0 : z / 1.62;
  // Schatten am Boden
  ctx.save(); ctx.translate(zz * 0.55, zz * 0.85); ctx.rotate(u.facing);
  drawPartShadow(ctx, p, 0, 0, landed ? 0.4 : 0.26);
  ctx.globalAlpha *= landed ? 0.08 : 0.04; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(H.len * 0.06, 0, H.rot, 0, 6.28); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(0, -zz); ctx.rotate(u.facing + (o.bank || 0) * 0.15);
  if (u.cargoP && u.cargoP.length && !landed) { ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 0.5; u.cargoP.forEach((k, i) => { const y = (i - (u.cargoP.length - 1) / 2) * 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, y + zz * 0.3); ctx.stroke(); ctx.save(); ctx.translate(-2, y + zz * 0.3); drawPart(ctx, palletPart(k)); ctx.restore(); }); }
  drawPart(ctx, p);
  // Heckrotor
  const big = type === 'lastheli' || type === 'lakotamini';
  const tx = -H.len / 2 - (big ? 4 : 2), spinT = landed ? 0 : t * 30;
  ctx.save(); ctx.translate(tx + 1, -4.5); ctx.strokeStyle = 'rgba(30,30,28,0.7)'; ctx.lineWidth = 0.9;
  for (let k = 0; k < H.tail; k++) { const a = spinT + k / H.tail * 3.14; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 4, 0); ctx.lineTo(Math.cos(a) * 4, 0); ctx.stroke(); }
  ctx.restore();
  // Hauptrotor
  ctx.save(); ctx.translate(big ? 2 : 3, 0); rotor(ctx, H.rot, H.blades, t + u.id * 0.37, landed); ctx.restore();
  // Insassen-Lichter
  if (u.def.transport) { const n = (u.passengers || []).length; for (let k = 0; k < u.def.transport; k++) { ctx.fillStyle = k < n ? '#8ef08a' : 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(-4 + k * 3.2, 0, 1, 0, 6.28); ctx.fill(); } }
  ctx.restore();
}

function hullTurret(ctx, u, color, t, o, hull, turret, tr, turretOffset = 0) {
  ctx.rotate(u.facing);
  drawPartShadow(ctx, hull, 4, 5, 0.38); drawPart(ctx, hull);
  if (tr) for (const [x, y, w, h] of tr) treadAnim(ctx, x, y, w, h, t, o.moving);
  if (turret) {
    ctx.save(); ctx.translate(turretOffset, 0); ctx.rotate(o.turret ?? 0); ctx.translate(-(o.recoil || 0) * 3.5, 0);
    drawPartShadow(ctx, turret, 1.5, 2, 0.35); drawPart(ctx, turret); ctx.restore();
  }
}
function seats(ctx, u, x0) { const n = (u.passengers || []).length, cap = u.def.transport || 0; for (let k = 0; k < cap; k++) { ctx.fillStyle = k < n ? '#8ef08a' : 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(x0 + k * 3.4, 0, 1.1, 0, 6.28); ctx.fill(); } }

export const MDRAW = {
  jeep(ctx, u, color, t, o) { hullTurret(ctx, u, color, t, o, jeepHull(color), jeepGun(color, false), null, -1.5); seats(ctx, u, -10); },
  rotorjeep(ctx, u, color, t, o) { hullTurret(ctx, u, color, t, o, jeepHull(color), jeepGun(color, true), null, -1.5); if (o.firing) { ctx.rotate(o.turret || 0); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,90,0.8)'; ctx.beginPath(); ctx.arc(11.5, 0, 2, 0, 6.28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } },
  laster(ctx, u, color, t, o) {
    ctx.rotate(u.facing); const h = lasterHull(color); drawPartShadow(ctx, h, 4, 5, 0.38); drawPart(ctx, h);
    const cp = u.cargoP || [];
    if (cp.length) cp.forEach((k, i) => { ctx.save(); ctx.translate(-14 + i * 14.5, 0); drawPart(ctx, palletPart(k)); ctx.restore(); });
    else { ctx.save(); ctx.translate(-6, 0); drawPart(ctx, lasterTarp(color)); ctx.restore(); seats(ctx, u, -10); }
  },
  spz(ctx, u, color, t, o) {
    hullTurret(ctx, u, color, t, o, spzHull(color, u.antenna !== false), jeepGun(color, false), [[-17, -12.5, 34, 0.9], [-17, 11.6, 34, 0.9]], 3);
    if (u.antenna !== false) { ctx.strokeStyle = 'rgba(40,40,40,0.8)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-13, 5); ctx.quadraticCurveTo(-18, 7 + Math.sin(t * 3) * 1.5, -22, 6); ctx.stroke(); }
    seats(ctx, u, -4);
  },
  panzer(ctx, u, color, t, o) {
    hullTurret(ctx, u, color, t, o, panzerHull(color), panzerTurret(color), [[-19, -13.5, 38, 0.9], [-19, 12.6, 38, 0.9]], -1);
    ctx.rotate(o.turret ?? 0); ctx.strokeStyle = 'rgba(30,25,20,0.85)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(-13, 7 + Math.sin(t * 3) * 1.5, -19, 6); ctx.stroke();
  },
  artillerie(ctx, u, color, t, o) { hullTurret(ctx, u, color, t, o, artyHull(color), artyTurret(color), [[-19, -13, 38, 0.9], [-19, 12.1, 38, 0.9]], -5); },
  grad(ctx, u, color, t, o) {
    ctx.rotate(u.facing); const h = gradHull(color); drawPartShadow(ctx, h, 4, 5, 0.38); drawPart(ctx, h);
    ctx.save(); ctx.translate(-6, 0); ctx.rotate((o.turret || 0) * 0.3); drawPartShadow(ctx, gradPod(color), 1.5, 2, 0.35); drawPart(ctx, gradPod(color)); ctx.restore();
  },
  heli(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'heli'); },
  sperber(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'sperber'); },
  lastheli(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'lastheli'); },
  kampfheli(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'kampfheli'); },
};

// ---------- Wardogs-Fahrzeuge: parametrisierte Rümpfe ----------
// o: len, wid, cab (Anteil Motorhaube vorn), bed (offene Ladefläche), box (kantig), armor (Panzerplatten), frame (Gitterrohr)
const carHull = (color, k, o) => part(`m-car-${k}-${color}`, o.len + 10, o.wid + 12, (L) => {
  const cm = camo(color), hl = o.len / 2, hw = o.wid / 2;
  L((c) => { const xs = o.axles || [-hl * 0.6, hl * 0.55]; for (const x of xs) for (const y of [-hw - 0.6, hw + 0.6]) wheel(c, x, y, o.wr || 2.9, 1.7); }, { bevel: 0.4, grime: 0.3 });
  L((c) => {
    if (o.frame) {
      c.fillStyle = '#2b2a26'; rr(c, -hl, -hw + 1, o.len, o.wid - 2, 2); c.fill();
      c.strokeStyle = tone(cm[1], 1.1); c.lineWidth = 1.4; c.strokeRect(-hl + 2, -hw + 1.5, o.len - 6, o.wid - 3);
      c.beginPath(); c.moveTo(-hl + 2, -hw + 1.5); c.lineTo(hl - 4, hw - 1.5); c.moveTo(-hl + 2, hw - 1.5); c.lineTo(hl - 4, -hw + 1.5); c.stroke();
      c.fillStyle = '#3a3a36'; c.beginPath(); c.arc(-2, -2, 2, 0, 6.28); c.arc(-2, 2, 2, 0, 6.28); c.fill();
      c.fillStyle = color; c.fillRect(hl - 5, -hw + 1, 1.4, o.wid - 2);
      return;
    }
    const r0 = o.box ? 1 : 2.4, front = hl - o.len * (o.cab ?? 0.3);
    plate(c, [[hl, -hw + r0], [hl - r0, -hw], [-hl + r0, -hw], [-hl, -hw + r0], [-hl, hw - r0], [-hl + r0, hw], [hl - r0, hw], [hl, hw - r0]], tone(cm[0], 1.1), cm[2], -hl, -hw, hl, hw);
    blotches(c, -hl + 1, -hw + 1, o.len - 2, o.wid - 2, cm, k.length * 97 + o.len, 9);
    if (o.armor) { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.5; for (let x = -hl + 4; x < hl - 2; x += 5) { c.beginPath(); c.moveTo(x, -hw); c.lineTo(x, hw); c.stroke(); } rivetRow(c, -hl + 2, -hw + 1, hl - 2, -hw + 1, 10, 0.3); rivetRow(c, -hl + 2, hw - 1, hl - 2, hw - 1, 10, 0.3); }
    vents(c, hl - 4.5, -2.5, 3, 5, 3, true);
    c.fillStyle = 'rgba(130,190,220,0.85)'; rr(c, front - 2, -hw + 1.2, 1.8, o.wid - 2.4, 0.5); c.fill();
    if (o.bed) { c.fillStyle = tone(cm[2], 0.9); rr(c, -hl + 1, -hw + 1.2, front - (-hl) - 4, o.wid - 2.4, 0.8); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.4; for (let x = -hl + 3; x < front - 4; x += 2.5) { c.beginPath(); c.moveTo(x, -hw + 1.2); c.lineTo(x, hw - 1.2); c.stroke(); } }
    else { c.fillStyle = tone(cm[1], 0.95); rr(c, -hl + 2, -hw + 1, front - (-hl) - 4, o.wid - 2, 1.2); c.fill(); }
    c.fillStyle = color; c.fillRect(-hl + 1, -hw, 1.4, o.wid);
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fillRect(hl - 0.8, -hw + 1.2, 0.8, 1.5); c.fillRect(hl - 0.8, hw - 2.7, 0.8, 1.5);
  }, { bevel: 0.6, dust: 0.25 });
});
const CARS = {
  bobcat: { len: 20, wid: 13, cab: 0.35, bed: true, wr: 2.4, axles: [-6, 6] },
  kodiak: { len: 30, wid: 15, cab: 0.32 },
  kodiak_m249: { len: 30, wid: 15, cab: 0.32, gun: 'mg' },
  pickup: { len: 32, wid: 15, cab: 0.5, bed: true },
  wolf: { len: 28, wid: 15, cab: 0.3, box: true },
  wolf_m2: { len: 28, wid: 15, cab: 0.3, box: true, gun: 'mg' },
  buggy: { len: 24, wid: 15, frame: true, wr: 3.2, axles: [-8, 7] },
  humvee: { len: 31, wid: 18, cab: 0.32, box: true, armor: true },
  humvee_m249: { len: 31, wid: 18, cab: 0.32, box: true, armor: true, gun: 'mg' },
  humvee_mini: { len: 31, wid: 18, cab: 0.32, box: true, armor: true, gun: 'mini' },
};
function carArt(ctx, u, color, t, o, k) {
  const C = CARS[k]; ctx.rotate(u.facing);
  const h = carHull(color, k, C); drawPartShadow(ctx, h, 3.5, 4.5, 0.38); drawPart(ctx, h);
  if (u.cargoP && u.cargoP.length) u.cargoP.forEach((kk, i) => { ctx.save(); ctx.translate(-C.len / 2 + 7 + i * 13, 0); ctx.scale(0.85, 0.85); drawPart(ctx, palletPart(kk)); ctx.restore(); });
  if (C.gun) { ctx.save(); ctx.translate(-2, 0); ctx.rotate((o.turret ?? 0) - 0); ctx.translate(-(o.recoil || 0) * 2, 0); drawPartShadow(ctx, jeepGun(color, C.gun === 'mini'), 1.2, 1.6, 0.35); drawPart(ctx, jeepGun(color, C.gun === 'mini')); ctx.restore(); }
  if (o.moving && k === 'buggy') { ctx.strokeStyle = 'rgba(140,125,95,0.5)'; ctx.lineWidth = 1; for (const yy of [-8, 8]) { ctx.beginPath(); ctx.moveTo(-13, yy); ctx.lineTo(-19 - Math.random() * 4, yy); ctx.stroke(); } }
  seats(ctx, u, -C.len / 2 + 4);
}
// Gepanzerter Ural: dunklere Platten auf der Kabine
const uralArmor = (color) => part(`m-uraldef-${color}`, 14, 18, (L) => { const cm = camo(color); L((c) => { c.fillStyle = lg(c, 0, -7, 0, 7, tone(cm[1], 1.05), cm[2]); rr(c, -5, -7.6, 10, 15.2, 1); c.fill(); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(2.6, -5, 1, 10); rivetRow(c, -4, -6.8, 4, -6.8, 5, 0.3); rivetRow(c, -4, 6.8, 4, 6.8, 5, 0.3); }, { bevel: 0.6 }); });
// T-72: runder Turm
const t72Turret = (color) => part(`m-t72t-${color}`, 58, 26, (L) => {
  const cm = camo(color);
  L((c) => { c.fillStyle = lg(c, 0, -2, 0, 2, '#4a4840', '#1c1b17'); c.fillRect(5, -1.4, 23, 2.8); c.fillStyle = '#2a2925'; rr(c, 16, -2, 3, 4, 0.6); c.fill(); }, { bevel: 0.4 });
  L((c) => {
    c.fillStyle = rg(c, -4, -4, 1, 11, tone(cm[0], 1.15), cm[2]); c.beginPath(); c.ellipse(-2, 0, 10, 9, 0, 0, 6.28); c.fill();
    blotches(c, -11, -8, 18, 16, cm, 7272, 6);
    for (let k = 0; k < 8; k++) { const a = -2.2 + k * 0.62; c.fillStyle = 'rgba(40,36,30,0.6)'; rr(c, -2 + Math.cos(a) * 7.5 - 1.6, Math.sin(a) * 7 - 1.2, 3.2, 2.4, 0.5); c.fill(); }
    c.fillStyle = tone(cm[1], 0.9); c.beginPath(); c.arc(-4, -3, 2.2, 0, 6.28); c.fill(); rivets(c, [[-4, -3]], 0.45);
    emblem(c, 1, 4, 1.8, color);
  }, { bevel: 0.8, dust: 0.2 });
});
// Gepard: Turm mit zwei Flak-Rohren und Radarschüssel
const gepardTurret = (color) => part(`m-gept-${color}`, 50, 34, (L) => {
  const cm = camo(color);
  L((c) => { for (const y of [-9.5, 9.5]) { c.fillStyle = lg(c, 0, y - 1, 0, y + 1, '#4a4840', '#1c1b17'); c.fillRect(0, y - 1, 21, 2); c.fillStyle = '#2a2925'; rr(c, -3, y - 2.6, 9, 5.2, 1); c.fill(); } }, { bevel: 0.4 });
  L((c) => { c.fillStyle = lg(c, -9, -8, 9, 8, tone(cm[0], 1.12), cm[2]); rr(c, -11, -7.5, 18, 15, 2.5); c.fill(); blotches(c, -10, -7, 16, 14, cm, 4040, 5); c.fillStyle = 'rgba(150,215,255,0.8)'; c.fillRect(3, -3, 1.2, 6); emblem(c, -5, 3.5, 1.8, color); }, { bevel: 0.8 });
});
function gepardArt(ctx, u, color, t, o) {
  hullTurret(ctx, u, color, t, o, panzerHull(color), gepardTurret(color), [[-19, -13.5, 38, 0.9], [-19, 12.6, 38, 0.9]], -2);
  ctx.save(); ctx.rotate(o.turret ?? 0); ctx.translate(-9, 0); ctx.rotate(t * 2.4);
  ctx.fillStyle = '#d8d6ca'; ctx.beginPath(); ctx.ellipse(0, 0, 2, 6, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-0.4, -6, 0.8, 12);
  ctx.restore();
}
// L2A6: längerer Rumpf, Keilturm
function l2Art(ctx, u, color, t, o) { ctx.scale(1.12, 1.08); hullTurret(ctx, u, color, t, o, panzerHull(color), panzerTurret(color), [[-19, -13.5, 38, 0.9], [-19, 12.6, 38, 0.9]], -1); }
Object.assign(MDRAW, {
  bobcat(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'bobcat'); },
  kodiak(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'kodiak'); },
  kodiak_m249(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'kodiak_m249'); },
  pickup(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'pickup'); },
  wolf(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'wolf'); },
  wolf_m2(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'wolf_m2'); },
  buggy(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'buggy'); },
  humvee(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'humvee'); },
  humvee_m249(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'humvee_m249'); },
  humvee_mini(ctx, u, color, t, o) { carArt(ctx, u, color, t, o, 'humvee_mini'); },
  ural(ctx, u, color, t, o) { MDRAW.laster(ctx, u, color, t, o); },
  ural_def(ctx, u, color, t, o) { MDRAW.laster(ctx, u, color, t, o); ctx.save(); ctx.translate(14.5, 0); drawPart(ctx, uralArmor(color)); ctx.restore(); },
  ural_def_m249(ctx, u, color, t, o) { MDRAW.ural_def(ctx, u, color, t, o); ctx.save(); ctx.translate(13, 0); ctx.rotate(o.turret ?? 0); drawPart(ctx, jeepGun(color, false)); ctx.restore(); },
  t72(ctx, u, color, t, o) { hullTurret(ctx, u, color, t, o, panzerHull(color), t72Turret(color), [[-19, -13.5, 38, 0.9], [-19, 12.6, 38, 0.9]], -1); },
  l2a6(ctx, u, color, t, o) { l2Art(ctx, u, color, t, o); },
  gepard(ctx, u, color, t, o) { gepardArt(ctx, u, color, t, o); },
  sph2(ctx, u, color, t, o) { MDRAW.artillerie(ctx, u, color, t, o); },
  mh6(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'heli'); },
  ah6m(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'sperber'); },
  ah6r(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'ah6r'); },
  lakota(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'lastheli'); },
  lakota_mini(ctx, u, color, t, o) { heliArt(ctx, u, color, t, o, 'lakotamini'); },
  havoc(ctx, u, color, t, o) { ctx.scale(1.12, 1.12); heliArt(ctx, u, color, t, o, 'kampfheli'); },
});
HELI.ah6r = { len: 38, rot: 25, blades: 4, tail: 2, body(c, cm, color) { HELI.heli.body(c, cm, color); for (const s of [-1, 1]) { c.fillStyle = '#2b2c2f'; rr(c, -1, s * 9 - 1.6, 9, 3.2, 1.4); c.fill(); c.fillStyle = '#c84a30'; c.beginPath(); c.arc(8, s * 9, 0.9, 0, 6.28); c.fill(); } } };
HELI.lakotamini = { len: 52, rot: 34, blades: 5, tail: 3, body(c, cm, color) { HELI.lastheli.body(c, cm, color); for (const s of [-1, 1]) { c.fillStyle = '#1b1c1e'; for (const y of [-0.5, 0, 0.5]) c.fillRect(4, s * 8.6 + y - 0.25, 7, 0.5); c.fillStyle = '#2c2d30'; rr(c, 2, s * 8.6 - 1.4, 3, 2.8, 0.6); c.fill(); } } };

export { palletPart };
