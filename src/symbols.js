// Wardogs-Kartensymbole: für die herausgezoomte Ansicht und die Taktikkarte
import { center, R, ring } from './hex.js';

const OWN = '#4aa8ff';
export const symColor = (g, owner) => (owner === 0 ? OWN : g.players[owner].color);

function label(ctx, x, y, txt, s, col = '#fff') {
  ctx.font = `700 ${10 * s}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
}
function arrow(ctx, x, y, a, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-6, 6.5); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke(); ctx.restore();
}
function vehicleGlyph(ctx, x, y, a, s, col, kind) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 1.4;
  if (kind === 'air') {
    ctx.beginPath(); ctx.ellipse(1, 0, 6, 3.6, 0, 0, 6.28); ctx.fill(); ctx.stroke();
    ctx.fillRect(-12, -1, 8, 2); ctx.strokeRect(-12, -1, 8, 2);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(10, 8); ctx.moveTo(-8, 8); ctx.lineTo(10, -8); ctx.stroke();
  } else if (kind === 'track') {
    ctx.beginPath(); ctx.rect(-9, -6, 17, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-1, 0, 3.6, 0, 6.28); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(2, -1, 11, 2); ctx.strokeRect(2, -1, 11, 2);
  } else {
    ctx.beginPath(); ctx.roundRect(-9, -5, 18, 10, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(3, -4, 2.5, 8);
  }
  ctx.restore();
}

// eine Einheit als Symbol; s = Bildschirmmaßstab (1/zoom)
export function drawUnitSymbol(ctx, g, u, x, y, s) {
  const col = symColor(g, u.owner);
  if (u.def.cat === 'inf') {
    if (u.downed) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.fillRect(-1.6, -6, 3.2, 12); ctx.fillRect(-6, -1.6, 12, 3.2); ctx.restore(); return; }
    arrow(ctx, x, y, u.facing || 0, s, col);
    const ab = { rekrut: 'RK', schuetze: 'ST', sani: 'SAN', pionier: 'PIO', spaeher: 'SP', mgtrupp: 'MG' }[u.type] || (u.def.gun === 'verba' ? 'AA' : u.type === 'panzerjaeger' ? 'AT' : '');
    if (ab) label(ctx, x + 12 * s, y + 9 * s, ab, s * 0.75, '#fff');
    return;
  }
  const kind = u.def.mt === 'air' ? 'air' : u.def.mt === 'track' ? 'track' : 'wheel';
  vehicleGlyph(ctx, x, y, u.facing || 0, s * 1.1, col, kind);
  if (u.def.transport) label(ctx, x, y - 15 * s, `[${(u.passengers || []).length}/${u.def.transport}]`, s * 0.9);
  else if (u.def.pallets) label(ctx, x, y - 15 * s, `[${(u.cargoP || []).length}/${u.def.pallets}]`, s * 0.9, '#ffd36a');
}

export function drawBuildingSymbol(ctx, g, b, x, y, s) {
  const col = symColor(g, b.owner), T = b.type;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  if (T === 'hq' || T === 'fob') {
    const w = T === 'hq' ? 22 : 16;
    ctx.fillStyle = 'rgba(20,24,20,0.85)'; ctx.fillRect(-w / 2, -w / 2, w, w); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.strokeRect(-w / 2, -w / 2, w, w);
    if (T === 'hq') { // Einkaufswagen wie bei Wardogs
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-4, -5); ctx.lineTo(-2, 3); ctx.lineTo(6, 3); ctx.lineTo(7, -3); ctx.lineTo(-3, -3); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, 6, 1.4, 0, 6.28); ctx.arc(5, 6, 1.4, 0, 6.28); ctx.fill();
    } else { ctx.fillStyle = '#fff'; ctx.fillRect(-4, -5, 1.6, 10); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-2.4, -5); ctx.lineTo(5, -2.5); ctx.lineTo(-2.4, 0); ctx.fill(); }
  } else if (T === 'bohrturm') {
    ctx.rotate(Math.PI / 4); ctx.fillStyle = b.drillOn ? '#ffb040' : col; ctx.fillRect(-7, -7, 14, 14); ctx.strokeRect(-7, -7, 14, 14); ctx.rotate(-Math.PI / 4);
    const f = b.fob && g.byId.get(b.fob); ctx.restore(); label(ctx, x, y, String(f ? f.stock.sprit : 0), s, '#111'); return;
  } else if (T === 'kiste') {
    ctx.fillStyle = '#e8e4d8'; ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.fillStyle = '#c83a2a'; ctx.fillRect(-1.2, -3.5, 2.4, 7); ctx.fillRect(-3.5, -1.2, 7, 2.4);
  } else if (b.def.weapon) {
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.28); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111'; ctx.fillRect(0, -1, 8, 2);
  } else {
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(-4, -4, 8, 8); ctx.globalAlpha = 1; ctx.strokeRect(-4, -4, 8, 8);
  }
  ctx.restore();
}

export function drawTowerSymbol(ctx, g, tw, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.28); ctx.fillStyle = tw.owner >= 0 ? symColor(g, tw.owner) : 'rgba(30,30,30,0.85)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
  label(ctx, x, y, 'ABCD'[tw.i], s * 1.1);
}

// Herzschlag-Symbol der Hot Zone
export function heartbeat(ctx, x, y, s, t) {
  const pu = 1 + 0.12 * Math.max(0, Math.sin(t * 6));
  ctx.save(); ctx.translate(x, y); ctx.scale(s * pu, s * pu);
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.28); ctx.fillStyle = 'rgba(255,214,64,0.95)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-4, 0); ctx.lineTo(-2, -6); ctx.lineTo(1, 6); ctx.lineTo(3, -2); ctx.lineTo(5, 0); ctx.lineTo(9, 0); ctx.stroke();
  ctx.restore();
}

// Kreis um eine Zone (Pixelradius aus Hex-Radius)
export function zoneCircle(ctx, z, col, w, s) {
  const p = center(z.c, z.r), rad = (z.rad + 0.55) * R * 1.75;
  ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.28); ctx.lineWidth = w * s; ctx.strokeStyle = col; ctx.stroke();
  return { p, rad };
}

// komplette Symbolschicht (gemeinsam für Zoom-Symbolmodus und Taktikkarte)
export function drawSymbolLayer(ctx, g, s, t, opt = {}) {
  const cz = zoneCircle(ctx, g.cz, 'rgba(255,255,255,0.95)', 3, s);
  const hz = zoneCircle(ctx, g.hz, 'rgba(255,214,64,1)', 3.4, s);
  ctx.fillStyle = 'rgba(255,214,64,0.12)'; ctx.beginPath(); ctx.arc(hz.p.x, hz.p.y, hz.rad, 0, 6.28); ctx.fill();
  const n = g.hz.next;
  if (n && (n.c !== g.hz.c || n.r !== g.hz.r)) { ctx.setLineDash([8 * s, 8 * s]); zoneCircle(ctx, { ...n, rad: g.hz.rad }, 'rgba(255,214,64,0.6)', 2, s); ctx.setLineDash([]); }
  if (opt.labels) { label(ctx, cz.p.x, cz.p.y - cz.rad - 10 * s, 'CONTROL ZONE', s * 1.1); }
  for (const tw of g.towers) { const p = center(tw.c, tw.r); drawTowerSymbol(ctx, g, tw, p.x, p.y, s); }
  for (const b of g.buildings) {
    if (b.dead || b.gone || !g.seen(b)) continue;
    if (!opt.all && !(b.type === 'hq' || b.type === 'fob' || b.type === 'bohrturm' || b.type === 'kiste' || b.def.weapon)) continue;
    const p = center(b.c, b.r); drawBuildingSymbol(ctx, g, b, p.x, p.y, s);
  }
  // eigene Minen
  for (const m of g.mines) if (m.owner === 0) { const p = center(m.c, m.r); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.fill(); ctx.restore(); }
  heartbeat(ctx, hz.p.x, hz.p.y, s, t);
  const us = g.units.filter((u) => !u.dead && !u.gone && !u.carried && (g.seen(u) || u.owner === 0));
  for (const u of us) { const p = opt.posOf ? opt.posOf(u) : center(u.c, u.r); drawUnitSymbol(ctx, g, u, p.x, p.y, s); }
}
