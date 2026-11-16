// Fraktionsabzeichen: Ärmelpatch mit eigenem Zeichen, auf Canvas gezeichnet
const STYLE = {
  ironstar: { field: ['#2b5f9a', '#0e2238'], metal: ['#eef3f8', '#9aaabb'], rim: '#c9d4df' },
  volkhova: { field: ['#9c2a20', '#360b07'], metal: ['#f0cf86', '#a07a36'], rim: '#dab56a' },
  simurgh:  { field: ['#2e7a46', '#0b2212'], metal: ['#e6ecd6', '#97a284'], rim: '#c3ccb0' },
};

// Patch-Form: abgerundetes Sechseck (Ärmelabzeichen)
function patch(c) {
  c.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 - 1.571, r = 48; const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.02; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.closePath();
}

const EMBLEM = {
  // Stahlstern im Zielkreis
  ironstar(c, m) {
    c.strokeStyle = m; c.lineWidth = 3.2; c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.stroke();
    c.lineWidth = 2; for (const a of [0, 1.571, 3.1416, 4.712]) { c.beginPath(); c.moveTo(Math.cos(a) * 31, Math.sin(a) * 31); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); c.stroke(); }
    c.fillStyle = m; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.571, r = i % 2 ? 9 : 22; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(0, -22); c.lineTo(0, 0); c.lineTo(21, -7); c.closePath(); c.fill();
  },
  // Wolfskopf über gekreuzten Ähren
  volkhova(c, m) {
    c.fillStyle = m;
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1); c.rotate(-0.5);
      for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(6 + k * 5.2, 26 - k * 0.6, 3.4, 1.8, -0.5, 0, 6.283); c.fill(); }
      c.fillRect(2, 25, 32, 1.6);
      c.restore();
    }
    c.beginPath();
    c.moveTo(0, 22); c.lineTo(-10, 12); c.lineTo(-15, -2); c.lineTo(-19, -24); c.lineTo(-8, -12); c.lineTo(0, -14); c.lineTo(8, -12); c.lineTo(19, -24); c.lineTo(15, -2); c.lineTo(10, 12); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.5)';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4, -2); c.lineTo(s * 11, -5); c.lineTo(s * 9, 1); c.closePath(); c.fill(); }
    c.beginPath(); c.moveTo(-4, 12); c.lineTo(4, 12); c.lineTo(0, 17); c.closePath(); c.fill();
  },
  // Simurgh: Vogel mit ausgebreiteten Schwingen und Flammenschweif
  simurgh(c, m) {
    c.fillStyle = m;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 3, -4);
      c.quadraticCurveTo(s * 20, -26, s * 38, -20);
      for (let k = 0; k < 5; k++) { c.lineTo(s * (36 - k * 6), -14 + k * 3.5); c.lineTo(s * (32 - k * 6), -12 + k * 4.6); }
      c.quadraticCurveTo(s * 10, 2, s * 3, 4); c.closePath(); c.fill();
    }
    c.beginPath(); c.ellipse(0, -2, 5, 11, 0, 0, 6.283); c.fill();
    c.beginPath(); c.arc(0, -15, 5, 0, 6.283); c.fill();
    c.beginPath(); c.moveTo(3, -16); c.lineTo(10, -13); c.lineTo(3, -12); c.closePath(); c.fill();
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 2, 8); c.quadraticCurveTo(k * 8, 22, k * 6 + Math.sign(k || 1) * 2, 36); c.quadraticCurveTo(k * 3, 24, 0, 9); c.closePath(); c.fill(); }
  },
};

export function drawCrest(ctx, faction, size) {
  const st = STYLE[faction] || STYLE.ironstar, k = size / 110;
  ctx.save(); ctx.scale(k, k); ctx.translate(55, 55);
  ctx.save(); ctx.translate(2.5, 3.5); patch(ctx); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.restore();
  patch(ctx);
  const g = ctx.createLinearGradient(-40, -46, 40, 50); g.addColorStop(0, st.field[0]); g.addColorStop(1, st.field[1]);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); patch(ctx); ctx.clip();
  // Stoffstruktur
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = -60; x < 60; x += 3) { ctx.beginPath(); ctx.moveTo(x, -60); ctx.lineTo(x + 40, 60); ctx.stroke(); }
  const sh = ctx.createRadialGradient(-14, -24, 2, 0, 0, 70); sh.addColorStop(0, 'rgba(255,255,255,0.2)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(-50, -50, 100, 100);
  const mg = ctx.createLinearGradient(-30, -30, 30, 30); mg.addColorStop(0, st.metal[0]); mg.addColorStop(1, st.metal[1]);
  ctx.save(); ctx.translate(1, 1.4); EMBLEM[faction]?.(ctx, 'rgba(0,0,0,0.45)'); ctx.restore();
  EMBLEM[faction]?.(ctx, mg);
  ctx.restore();
  // Steppnaht
  patch(ctx); ctx.lineWidth = 5; ctx.strokeStyle = st.rim; ctx.stroke();
  ctx.save(); ctx.scale(0.9, 0.9); patch(ctx); ctx.setLineDash([3, 2.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke(); ctx.restore();
  patch(ctx); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
  ctx.restore();
}

const URLS = new Map();
export function crestURL(faction, size = 96) {
  const key = faction + size;
  if (URLS.has(key)) return URLS.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2;
  drawCrest(cv.getContext('2d'), faction, size * 2);
  const u = cv.toDataURL('image/png'); URLS.set(key, u);
  return u;
}
export function crestImg(faction, size = 28, cls = 'crest') { return `<img class="${cls}" src="${crestURL(faction, size)}" width="${size}" height="${size}" alt="">`; }
