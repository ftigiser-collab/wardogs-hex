// Moderne Infanterie: vorgerenderte Figuren im Fraktions-Tarnanstrich, animierte Beine und Effekte
import { part, drawPart, drawPartShadow, rr, lg, rg, rivets } from './art.js';
import { camo, tone } from './mart.js';

const S = {
  rekrut:  { n: 2, head: 'cap', gun: 'smg', pack: null, plain: true },
  schuetze: { n: 3, head: 'helmet', gun: 'rifle', pack: 'radio' },
  sani:    { n: 2, head: 'helmet', gun: 'smg', pack: 'medic', cross: true },
  pionier: { n: 2, head: 'helmet', gun: 'hammer', pack: 'tools' },
  mgtrupp: { n: 2, head: 'helmet', gun: 'mg', pack: 'ammo' },
  panzerjaeger: { n: 2, head: 'helmet', gun: 'launcher', pack: 'ammo' },
  drohnen: { n: 2, head: 'helmet', gun: 'tablet', pack: 'drone' },
};
const POS = { 1: [[0, 0]], 2: [[5, -5], [-4, 5]], 3: [[6, 0], [-5, -7], [-5, 7]] };

function weapon(c, g) {
  const line = (x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  if (g === 'rifle') { line(0, 2.4, 10, 2.4, 1.4, '#1b1d20'); c.fillStyle = '#3a3630'; c.fillRect(1, 1.6, 3, 1.6); c.fillStyle = '#26282b'; c.fillRect(4.5, 1.7, 2, 1.4); }
  else if (g === 'smg') { line(0.5, 2.4, 7.5, 2.4, 1.4, '#1b1d20'); c.fillStyle = '#2c2d30'; c.fillRect(2, 2.6, 1.2, 2.2); }
  else if (g === 'mg') { line(-1, 2.4, 11.5, 2.4, 1.9, '#1b1d20'); c.fillStyle = '#3a3a36'; rr(c, 0.5, 1.2, 4, 2.6, 0.5); c.fill(); line(9, 2.4, 10.5, 4.6, 0.5, '#1b1d20'); line(9, 2.4, 10.5, 0.2, 0.5, '#1b1d20'); }
  else if (g === 'launcher') { line(-5, -2.8, 9.5, -2.8, 3, '#3a4234'); c.fillStyle = '#4a5240'; c.fillRect(6.5, -4.4, 3.4, 3.2); c.fillStyle = '#c84a30'; c.beginPath(); c.arc(9.8, -2.8, 0.9, 0, 6.28); c.fill(); }
  else if (g === 'hammer') { line(1, 3, 7.5, 3.6, 1.2, '#6a5236'); c.fillStyle = '#8f949b'; rr(c, 6.6, 2, 2.6, 3.4, 0.4); c.fill(); }
  else if (g === 'tablet') { c.fillStyle = '#1e2124'; rr(c, 2.2, -1.9, 3, 3.8, 0.5); c.fill(); c.fillStyle = 'rgba(120,220,255,0.9)'; c.fillRect(2.7, -1.3, 2, 2.6); }
}
function trooper(c, sp, color) {
  if (sp.ghillie) {   // Ghillie-Anzug: zottelige Umrandung
    for (let k = 0; k < 26; k++) { const a = k * 0.2417, r0 = 4.6 + (k * 37 % 7) * 0.25; c.strokeStyle = ['#4d5a2c', '#6b7238', '#3b4322', '#7d7a48'][k % 4]; c.lineWidth = 1.1; c.beginPath(); c.moveTo(Math.cos(a) * 2.5, Math.sin(a) * 3.2); c.lineTo(Math.cos(a) * r0, Math.sin(a) * (r0 + 0.8)); c.stroke(); }
  }
  const cm = camo(color), body = sp.plain ? ['#7d7a6c', '#45433a'] : [tone(cm[0], 1.05), cm[2]], helm = sp.plain ? ['#5a5648', '#2e2c25'] : [tone(cm[1], 1.15), tone(cm[2], 0.9)];
  if (sp.pack) {
    c.fillStyle = lg(c, -6, -3, -2, 3, tone(cm[1], 1.1), cm[2]); rr(c, -6.4, -3.2, 3.8, 6.4, 1); c.fill();
    if (sp.pack === 'radio') { c.strokeStyle = '#1e1c19'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-5.5, -2.5); c.lineTo(-8.5, -6); c.stroke(); }
    if (sp.pack === 'tools') { c.fillStyle = '#d9a33a'; c.fillRect(-6, -0.8, 3, 1.6); }
    if (sp.pack === 'medic') { c.fillStyle = '#eee'; c.fillRect(-5.9, -2.2, 2.8, 4.4); c.fillStyle = '#d0302a'; c.fillRect(-5.1, -1.6, 1.2, 3.2); c.fillRect(-6, -0.6, 3, 1.2); }
    if (sp.pack === 'ammo') { c.fillStyle = '#4a4434'; c.fillRect(-6.2, -3, 3.4, 2); c.fillRect(-6.2, 1, 3.4, 2); }
    if (sp.pack === 'drone') { c.fillStyle = '#2a2d2f'; c.fillRect(-6.4, -2.6, 3.6, 5.2); }
  }
  // Körper mit Plattenträger
  c.fillStyle = lg(c, -4, -5, 4, 5, body[0], body[1]); c.beginPath(); c.ellipse(0, 0, 3.8, 4.9, 0, 0, 6.28); c.fill();
  if (!sp.plain) { c.fillStyle = tone(cm[2], 1.1); rr(c, -2.4, -3.2, 4.2, 6.4, 1); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-1.6, -2.6, 0.5, 5.2); c.fillRect(0, -2.6, 0.5, 5.2); }
  if (sp.vest === 'schwer') { c.fillStyle = lg(c, -3, -4, 3, 4, '#4b4d47', '#23241f'); rr(c, -3.2, -4, 5.6, 8, 1.4); c.fill(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-2.6, -3.4, 4.4, 0.6); c.fillStyle = '#1a1b18'; c.fillRect(-0.6, -3.6, 1.6, 7.2); }
  else if (sp.vest === 'leicht') { c.strokeStyle = 'rgba(30,30,25,0.6)'; c.lineWidth = 0.6; c.strokeRect(-2.6, -3.4, 4.6, 6.8); }
  for (const s of [-1, 1]) { c.fillStyle = color; c.beginPath(); c.ellipse(-0.5, s * 3.8, 1.7, 1.15, 0, 0, 6.28); c.fill(); }
  if (sp.cross) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-0.5, 3.8, 1, 0, 6.28); c.fill(); c.fillStyle = '#d0302a'; c.fillRect(-0.85, 3.1, 0.7, 1.4); c.fillRect(-1.2, 3.45, 1.4, 0.7); }
  c.strokeStyle = body[1]; c.lineWidth = 1.3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -3); c.lineTo(3.4, -0.4); c.moveTo(0, 3); c.lineTo(3.6, 2.4); c.stroke();
  weapon(c, sp.gun);
  // Kopf
  if (sp.head === 'cap') { c.fillStyle = rg(c, -0.5, -1, 0.3, 3, helm[0], helm[1]); c.beginPath(); c.arc(0.8, 0, 2.4, 0, 6.28); c.fill(); c.fillStyle = helm[1]; c.fillRect(2.4, -1.6, 1.6, 3.2); }
  else {
    c.fillStyle = rg(c, -0.5, -1, 0.3, 3.2, helm[0], helm[1]); c.beginPath(); c.arc(0.8, 0, 2.75, 0, 6.28); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.35; c.beginPath(); c.arc(0.8, 0, 2.1, 2, 4.3); c.stroke();
    c.fillStyle = '#1c1c1a'; c.fillRect(2.6, -1.1, 0.9, 2.2);
    if (sp.cross) { c.fillStyle = '#fff'; c.fillRect(0.2, -0.9, 1.6, 1.8); c.fillStyle = '#d0302a'; c.fillRect(0.75, -0.75, 0.5, 1.5); c.fillRect(0.3, -0.25, 1.4, 0.5); }
  }
}
function trooperPart(type, color, gunArt, vest = '', ghillie = false) { const sp = { ...S[type], ...(gunArt ? { gun: gunArt } : {}), vest, ghillie }; return part(`in-${type}-${gunArt || ''}-${vest}-${ghillie ? 1 : 0}-${color}`, 30, 22, (L) => L((c) => trooper(c, sp, color), { bevel: 0.32, grime: 0.3, light: 0.55, shade: 0.5, rim: false }), 7); }
const GUN_ART = { ar: 'rifle', dmr: 'rifle', smg: 'smg', sg: 'smg', lmg: 'mg', at: 'launcher', aa: 'launcher', gl: 'launcher' };
import { GUNS } from './data.js';
function gunArtOf(u, type) { const g = u.def && u.def.gun && GUNS[u.def.gun]; if (!g) return null; if (type === 'pionier' && g.cls === 'sg') return null; return GUN_ART[g.cls] || null; }
function legs(c, x, y, a, t, moving, col) {
  const st = moving ? Math.sin(t * 13 + x * 0.7 + y) * 3 : 0.7;
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(1.8, 2.2, 4.6, 3.6, 0, 0, 6.28); c.fill();
  c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-1, -1.8); c.lineTo(-1 + st, -2.7); c.moveTo(-1, 1.8); c.lineTo(-1 - st, 2.7); c.stroke();
  c.restore();
}
function drone(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 5, 3.6, 2.4, 0, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#26282a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-2.6, -2.6); ctx.lineTo(2.6, 2.6); ctx.moveTo(2.6, -2.6); ctx.lineTo(-2.6, 2.6); ctx.stroke();
  ctx.fillStyle = '#2f3234'; ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  ctx.fillStyle = 'rgba(60,60,60,0.35)'; for (const [a, b] of [[-2.6, -2.6], [2.6, 2.6], [2.6, -2.6], [-2.6, 2.6]]) { ctx.beginPath(); ctx.arc(a, b, 1.6, 0, 6.28); ctx.fill(); }
  ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff4030' : '#40ff60'; ctx.fillRect(-0.4, -0.4, 0.8, 0.8);
  ctx.restore();
}
function squad(type) {
  return (ctx, u, color, t, o) => {
    const sp = S[type], p = trooperPart(type, color, type === 'pionier' || type === 'sani' ? null : gunArtOf(u, type), (u.lo && u.lo.vest) || '', !!(u.def && u.def.ghillie)), a = u.facing, ca = Math.cos(a), sa = Math.sin(a);
    const cm = camo(color), legCol = sp.plain ? '#45433a' : cm[2];
    for (const [px, py] of POS[sp.n]) {
      const x = px * ca - py * sa, y = px * sa + py * ca;
      const bob = o.moving ? Math.sin(t * 13 + px) * 0.35 : 0;
      legs(ctx, x, y, a, t, o.moving, legCol);
      ctx.save(); ctx.translate(x, y + bob); ctx.rotate(a); drawPart(ctx, p); ctx.restore();
    }
    if (type === 'drohnen' && (u.ammo ?? 1) > 0) drone(ctx, Math.cos(t * 0.9 + u.id) * 9, -10 + Math.sin(t * 1.3 + u.id) * 3, t);
  };
}
// Späher: liegend im Tarnumhang
function sniperPart(color) {
  const cm = camo(color);
  return part(`in-spaeher-${color}`, 44, 18, (L) => L((c) => {
    c.fillStyle = lg(c, -9, -5, 6, 5, tone(cm[0], 0.95), cm[2]);
    c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(0, -6.4, -10, -4.6); c.quadraticCurveTo(-13.5, 0, -10, 4.6); c.quadraticCurveTo(0, 6.4, 4, 0); c.fill();
    for (let k = 0; k < 26; k++) { c.fillStyle = k % 3 === 0 ? tone(cm[1], 1.2) : k % 3 === 1 ? cm[2] : '#55603a'; c.beginPath(); c.arc(-10 + Math.random() * 13, (Math.random() - 0.5) * 8, 0.7 + Math.random() * 0.9, 0, 6.28); c.fill(); }
    c.fillStyle = color; c.fillRect(-6, -1, 2.2, 2);
    c.fillStyle = rg(c, 2.5, -0.5, 0.3, 2.6, tone(cm[1], 1.1), cm[2]); c.beginPath(); c.arc(3, 0, 2.4, 0, 6.28); c.fill();
    c.strokeStyle = '#1b1d20'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(1, 1.4); c.lineTo(20, 1.4); c.stroke();
    c.fillStyle = '#2a2d31'; rr(c, 5, -0.5, 6.5, 1.8, 0.6); c.fill();
    c.strokeStyle = '#1b1d20'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(15.5, 1.4); c.lineTo(16.5, 4); c.moveTo(15.5, 1.4); c.lineTo(16.5, -1.2); c.stroke();
  }, { bevel: 0.32, grime: 0.35, rim: false }), 7);
}

export const IDRAW = {
  spaeher(ctx, u, color, t) {
    const p = sniperPart(color);
    ctx.rotate(u.facing);
    drawPartShadow(ctx, p, 1.5, 2.5, 0.3); drawPart(ctx, p);
    const glint = Math.sin(t * 1.3 + u.id) > 0.92 ? 1 : 0.2;
    ctx.fillStyle = `rgba(200,240,255,${glint})`; ctx.beginPath(); ctx.arc(11.5, 0.4, 0.9, 0, 6.28); ctx.fill();
  },
};
for (const k of Object.keys(S)) IDRAW[k] = squad(k);
