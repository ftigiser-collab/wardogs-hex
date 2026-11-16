// Animierter Menühintergrund: Dämmerung über Hügeln, ein Dorf, Hubschrauber, Leuchtspur in der Ferne
import { Noise } from './util.js';

export function startMenuBg(host) {
  const cv = document.createElement('canvas');
  cv.className = 'menubg';
  host.prepend(cv);
  const ctx = cv.getContext('2d');
  const N = new Noise(91);
  let W = 0, H = 0, dpr = 1, stat = null, stars = [];
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = host.clientWidth; H = host.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.4, r: Math.random() * 1.1 + 0.2, p: Math.random() * 6 }));
    stat = null;
  }
  resize();
  window.addEventListener('resize', resize);
  const ridge = (y0, amp, f, ph, oct = 4) => (x) => { let v = 0, a = 1, fr = f; for (let o = 0; o < oct; o++) { v += (N.v(x * fr + ph + o * 13, o * 7) - 0.5) * a; a *= 0.5; fr *= 2.1; } return y0 + v * amp; };
  function buildStatic() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c1420'); sky.addColorStop(0.42, '#2a3a44'); sky.addColorStop(0.6, '#a86a3c'); sky.addColorStop(0.7, '#e09a52'); sky.addColorStop(1, '#2a2418');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.3, H * 0.66, 0, W * 0.3, H * 0.66, H * 0.55);
    sun.addColorStop(0, 'rgba(255,215,150,0.8)'); sun.addColorStop(0.2, 'rgba(255,170,90,0.35)'); sun.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    // Wolkenbänder
    for (let k = 0; k < 14; k++) { const y = H * (0.15 + Math.random() * 0.4), x = Math.random() * W, w = 120 + Math.random() * 300; g.fillStyle = `rgba(${k % 2 ? '255,180,120' : '40,50,60'},${0.08 + Math.random() * 0.08})`; g.beginPath(); g.ellipse(x, y, w, 6 + Math.random() * 10, 0, 0, 6.28); g.fill(); }
    // Hügelketten mit Baumsäumen
    const layers = [[0.66, 0.07, 0.003, '#3b4038', 0], [0.72, 0.08, 0.004, '#2a3026', 1], [0.8, 0.09, 0.005, '#1b2018', 2], [0.9, 0.06, 0.006, '#10140e', 3]];
    for (const [y0, amp, f, col, li] of layers) {
      const fn = ridge(H * y0, H * amp, f, li * 11);
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) { const y = fn(x); g.lineTo(x, y - (N.v(x * 0.08, li * 3) > 0.55 ? 4 + N.v(x * 0.3, li) * 8 : 0)); }
      g.lineTo(W, H); g.fill();
      if (li === 1) { // Dorf mit Lichtern und Kirchturm
        for (let k = 0; k < 18; k++) { const x = W * 0.58 + k * 14 + Math.random() * 6, y = fn(x) - 6; g.fillStyle = '#1e241c'; g.fillRect(x, y, 10, 8); g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x + 5, y - 5); g.lineTo(x + 11, y); g.fill(); if (Math.random() < 0.5) { g.fillStyle = 'rgba(255,200,120,0.85)'; g.fillRect(x + 3, y + 3, 2, 2); } }
        const tx = W * 0.66, ty = fn(tx) - 6; g.fillStyle = '#1e241c'; g.fillRect(tx, ty - 26, 7, 30); g.beginPath(); g.moveTo(tx - 1, ty - 26); g.lineTo(tx + 3.5, ty - 40); g.lineTo(tx + 8, ty - 26); g.fill();
        // Funkmast mit Abspannung
        const mx = W * 0.82, my = fn(mx); g.strokeStyle = '#1a1e18'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx, my - 90); g.stroke(); g.lineWidth = 0.6; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(mx, my - 80); g.lineTo(mx + s * 40, my); g.stroke(); }
      }
    }
    return c;
  }
  let t0 = performance.now(), raf = 0, tracers = [];
  function frame(now) {
    const t = (now - t0) / 1000;
    if (!stat) stat = buildStatic();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(stat, 0, 0);
    for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.sin(t * 1.3 + s.p)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill(); }
    // Funkmast-Blinklicht
    if ((t * 0.8) % 1 < 0.12) { ctx.fillStyle = 'rgba(255,60,50,0.95)'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.72 - 90 + (N.v(W * 0.82 * 0.004 + 11, 0) - 0.5) * 0, 3, 0, 6.28); ctx.fill(); }
    // Leuchtspur über dem fernen Kamm
    if (Math.random() < 0.03) tracers.push({ x: W * (0.1 + Math.random() * 0.5), y: H * 0.68, vx: (Math.random() - 0.3) * 200, vy: -150 - Math.random() * 120, life: 1 });
    tracers = tracers.filter((p) => (p.life -= 0.016) > 0);
    for (const p of tracers) { p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.vy += 40 * 0.016; ctx.strokeStyle = `rgba(255,190,90,${p.life})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
    // Hubschrauber-Silhouette
    const hx = ((t * 40) % (W + 400)) - 200, hy = H * 0.34 + Math.sin(t * 0.7) * 10;
    ctx.save(); ctx.translate(hx, hy); ctx.fillStyle = '#0d110c';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, 6.28); ctx.fill();
    ctx.fillRect(-58, -3, 36, 4); ctx.fillRect(-60, -10, 4, 12);
    ctx.fillRect(-14, 9, 30, 2); ctx.fillRect(-10, 6, 2, 4); ctx.fillRect(10, 6, 2, 4);
    ctx.fillRect(-2, -13, 4, 5);
    const bl = Math.abs(Math.sin(t * 30)) * 52 + 8; ctx.fillRect(-bl, -14, bl * 2, 1.6);
    ctx.fillStyle = 'rgba(255,60,60,0.9)'; if (Math.floor(t * 2) % 2) { ctx.beginPath(); ctx.arc(-58, -10, 2, 0, 6.28); ctx.fill(); }
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { stop() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); cv.remove(); } };
}
