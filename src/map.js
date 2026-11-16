// Prozedurale Hexkarte: ländliches Einsatzgebiet mit Feldern, Wäldern, Ortschaften, Fluss und Straßen
import { Noise, clamp, smoothstep } from './util.js';
import { center, neighbors, distance, worldSize, pixelToHex, R, HW } from './hex.js';
import { MOVE_COST } from './data.js';

const NAMES = ['Kervana', 'Dalmor', 'Zelenka', 'Ostrova', 'Talvessa', 'Brankov', 'Mirgorod', 'Vessan', 'Korsk', 'Lobresh', 'Ardani', 'Sevrin'];
export function mapName(seed) { return NAMES[seed % NAMES.length] + (seed % 3 === 0 ? '-Tal' : seed % 3 === 1 ? 'er Senke' : ' an der Furt'); }

export function generateMap(seed, W = 36, H = 26) {
  const rnd = mulberry(seed * 13 + 5);
  const N = new Noise(seed), N2 = new Noise(seed + 7), N3 = new Noise(seed + 13), N4 = new Noise(seed + 29);
  const idx = (c, r) => r * W + c;
  const starts = [{ c: 4, r: H - 5 }, { c: W - 5, r: H - 5 }, { c: Math.round(W / 2), r: 3 }];
  const ter = new Array(W * H).fill('feld');
  const nearHQ = (c, r, d) => starts.some((s) => distance(c, r, s.c, s.r) <= d);

  // Control Zone: nahe dem Schwerpunkt der drei Hauptquartiere, leicht zufällig verschoben
  const gc = starts.reduce((a, s) => a + s.c, 0) / 3, gr = starts.reduce((a, s) => a + s.r, 0) / 3;
  const ca = rnd() * 6.283, cd = rnd() * 2.2;
  const cz = { c: clamp(Math.round(gc + Math.cos(ca) * cd * 1.2), 7, W - 8), r: clamp(Math.round(gr + Math.sin(ca) * cd), 7, H - 8), rad: 4 };

  // Grundgelände: Hügel, Felsgrate, Wälder
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const p = center(c, r), x = p.x / HW, y = p.y / HW;
    const h = N.fbm(x / 5.5, y / 5.5, 4);
    const f = N2.fbm(x / 3.6 + 20, y / 3.6, 4);
    let t = 'feld';
    if (h > 0.74) t = 'fels'; else if (h > 0.6) t = 'huegel';
    if (f > 0.58 && t !== 'fels') t = 'wald';
    if (nearHQ(c, r, 2)) t = 'feld';
    ter[idx(c, r)] = t;
  }
  // Mitte der Zone etwas offener (kein Felsgrat im Kern)
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (distance(c, r, cz.c, cz.r) <= 2 && ter[idx(c, r)] === 'fels') ter[idx(c, r)] = 'huegel';

  // Fluss: mäandert von einer Seite zur anderen, nahe an der Zone vorbei
  const river = [];
  {
    const horizontal = rnd() < 0.5;
    let c, r, dirMain;
    if (horizontal) { c = 0; r = clamp(Math.round(cz.r + (rnd() - 0.5) * 6), 3, H - 4); dirMain = 0; }
    else { r = 0; c = clamp(Math.round(cz.c + (rnd() - 0.5) * 8), 3, W - 4); dirMain = 1; }
    let drift = 0; const phase = rnd() * 6.283;
    for (let k = 0; k < 200; k++) {
      if (!nearHQ(c, r, 3)) river.push([c, r]);
      if (horizontal ? c >= W - 1 : r >= H - 1) break;
      drift = Math.sin(k * 0.32 + phase) * 1.7 + Math.sin(k * 0.11 + phase * 2) * 0.8 + (rnd() - 0.5) * 0.6;
      // Zur Zone hin biegen (Flussschleife durch die Control Zone)
      const toZ = horizontal ? Math.sign(cz.r - r) : Math.sign(cz.c - c);
      const dz = horizontal ? Math.abs(c - cz.c) : Math.abs(r - cz.r);
      if (dz < 8) drift += toZ * 0.6;
      const nb = neighbors(c, r, W, H);
      let best = null, bs = -1e9;
      for (const [nc, nr] of nb) {
        if (river.some(([a, b]) => a === nc && b === nr)) continue;
        const fwd = horizontal ? nc - c : nr - r, side = horizontal ? nr - r : nc - c;
        const s = fwd * 2 + side * drift + rnd() * 0.6 - (nearHQ(nc, nr, 3) ? 9 : 0);
        if (s > bs) { bs = s; best = [nc, nr]; }
      }
      if (!best) break;
      [c, r] = best;
    }
    for (const [a, b] of river) ter[idx(a, b)] = 'wasser';
  }

  // Ortschaften: eine im Herzen der Zone, weitere verteilt
  const towns = [];
  const grow = (sc, sr, n, tag) => {
    const cells = [[sc, sr]];
    ter[idx(sc, sr)] = 'ort';
    for (let k = 0; k < n * 6 && cells.length < n; k++) {
      const [bc, br] = cells[Math.floor(rnd() * cells.length)];
      const nb = neighbors(bc, br, W, H).filter(([c, r]) => ter[idx(c, r)] !== 'wasser' && ter[idx(c, r)] !== 'ort' && !nearHQ(c, r, 3));
      if (!nb.length) continue;
      const [c, r] = nb[Math.floor(rnd() * nb.length)];
      ter[idx(c, r)] = 'ort'; cells.push([c, r]);
    }
    towns.push({ c: sc, r: sr, cells, tag });
  };
  {
    let tc = cz.c, tr = cz.r;
    for (let k = 0; k < 20 && ter[idx(tc, tr)] === 'wasser'; k++) { tc += k % 2 ? 1 : -1; }
    grow(tc, tr, 7 + Math.floor(rnd() * 3), 'zone');
  }
  for (let k = 0, tries = 0; k < 4 && tries < 200; tries++) {
    const c = 2 + Math.floor(rnd() * (W - 4)), r = 2 + Math.floor(rnd() * (H - 4));
    if (nearHQ(c, r, 5) || ter[idx(c, r)] === 'wasser' || ter[idx(c, r)] === 'fels') continue;
    if (towns.some((t) => distance(c, r, t.c, t.r) < 7)) continue;
    grow(c, r, 3 + Math.floor(rnd() * 4), 'dorf'); k++;
  }

  // Funktürme: vier im Ring 3 um das Zonenzentrum, möglichst gleichmäßig verteilt
  const towers = [];
  {
    const zc = center(cz.c, cz.r), a0 = rnd() * 6.283;
    for (let k = 0; k < 4; k++) {
      const a = a0 + k * 1.5708;
      let best = null, bd = 1e9;
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        if (distance(c, r, cz.c, cz.r) !== 3) continue;
        if (towers.some((t) => distance(c, r, t.c, t.r) < 3)) continue;
        const p = center(c, r), aa = Math.atan2(p.y - zc.y, p.x - zc.x);
        let da = Math.abs(((aa - a) % 6.283 + 9.425) % 6.283 - 3.1416);
        const t = ter[idx(c, r)];
        da += t === 'wasser' ? 3 : t === 'fels' ? 1.5 : t === 'ort' ? 0.4 : 0;
        if (da < bd) { bd = da; best = [c, r]; }
      }
      if (best) { if (ter[idx(best[0], best[1])] === 'wasser' || ter[idx(best[0], best[1])] === 'fels') ter[idx(best[0], best[1])] = 'feld'; towers.push({ c: best[0], r: best[1] }); }
    }
  }

  // Straßen: A* von jedem HQ zur Zone und von der Zone zu den Dörfern; Flussquerungen werden Brücken
  const road = new Uint8Array(W * H);
  const roadCost = (c, r) => {
    const t = ter[idx(c, r)];
    if (road[idx(c, r)]) return 0.35;
    return { feld: 1, wald: 3.2, ort: 0.8, huegel: 2.4, fels: 12, wasser: 7, strasse: 0.35, bruecke: 0.35, truemmer: 2 }[t] + (towers.some((tw) => tw.c === c && tw.r === r) ? 6 : 0);
  };
  const astar = (a, b) => {
    const g = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    g[idx(a.c, a.r)] = 0; const open = [[a.c, a.r, distance(a.c, a.r, b.c, b.r)]];
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][2] < open[bi][2]) bi = k;
      const [c, r] = open.splice(bi, 1)[0];
      if (c === b.c && r === b.r) break;
      for (const [nc, nr] of neighbors(c, r, W, H)) {
        const ng = g[idx(c, r)] + roadCost(nc, nr);
        if (ng < g[idx(nc, nr)]) { g[idx(nc, nr)] = ng; prev[idx(nc, nr)] = idx(c, r); open.push([nc, nr, ng + distance(nc, nr, b.c, b.r) * 0.9]); }
      }
    }
    const path = []; let k = idx(b.c, b.r);
    while (k !== -1) { path.push([k % W, Math.floor(k / W)]); k = prev[k]; }
    return path.reverse();
  };
  const roads = [];
  const lay = (a, b) => {
    const p = astar(a, b); if (p.length < 2) return;
    roads.push(p);
    for (const [c, r] of p) {
      road[idx(c, r)] = 1;
      const t = ter[idx(c, r)];
      if (t === 'wasser') ter[idx(c, r)] = 'bruecke';
      else if (t !== 'ort' && t !== 'bruecke') ter[idx(c, r)] = 'strasse';
    }
  };
  const zt = towns[0];
  for (const s of starts) lay(s, zt);
  for (const t of towns.slice(1)) { const s = starts.slice().sort((a, b) => distance(a.c, a.r, t.c, t.r) - distance(b.c, b.r, t.c, t.r))[0]; lay(t, distance(t.c, t.r, zt.c, zt.r) < distance(t.c, t.r, s.c, s.r) + 4 ? zt : s); }

  // Erreichbarkeit für Kettenfahrzeuge sicherstellen
  for (const s of starts) if (!reachable(ter, W, H, s, cz)) carve(ter, W, H, s, cz);
  for (const s of starts) { ter[idx(s.c, s.r)] = 'feld'; }

  const map = { W, H, seed, ter, ter0: ter.slice(), starts, idx, cz, towers, towns, road, roads, river, name: mapName(seed) };
  map.size = worldSize(W, H);
  map.base = renderBase(map);
  return map;
}

function reachable(ter, W, H, a, b) {
  const seen = new Uint8Array(W * H), q = [[a.c, a.r]];
  seen[a.r * W + a.c] = 1;
  while (q.length) {
    const [c, r] = q.pop();
    if (c === b.c && r === b.r) return true;
    for (const [nc, nr] of neighbors(c, r, W, H)) { const i = nr * W + nc; if (!seen[i] && MOVE_COST.track[ter[i]] < Infinity) { seen[i] = 1; q.push([nc, nr]); } }
  }
  return false;
}
function carve(ter, W, H, a, b) {
  let c = a.c, r = a.r;
  for (let k = 0; k < 200 && !(c === b.c && r === b.r); k++) {
    let best = null, bd = 1e9;
    for (const [nc, nr] of neighbors(c, r, W, H)) { const d = distance(nc, nr, b.c, b.r); if (d < bd) { bd = d; best = [nc, nr]; } }
    [c, r] = best;
    const t = ter[r * W + c];
    if (t === 'fels') ter[r * W + c] = 'huegel';
    if (t === 'wasser') ter[r * W + c] = 'bruecke';
  }
}

// ---------- Gelände als Bild ----------
const CROPS = [
  [188, 172, 108], [124, 150, 76], [112, 140, 68], [132, 158, 82], [140, 162, 86], [128, 108, 78], [150, 162, 92], [176, 166, 104], [118, 146, 72], [104, 132, 64],
];
function renderBase(map) {
  const { W, H, ter, seed } = map;
  const S = 0.6;
  const w = Math.ceil(map.size.w * S), h = Math.ceil(map.size.h * S);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const N3 = new Noise(seed + 13), N4 = new Noise(seed + 29), N5 = new Noise(seed + 41);
  const height = new Float32Array(w * h), waterW = new Float32Array(w * h), forestW = new Float32Array(w * h), townW = new Float32Array(w * h), rockW = new Float32Array(w * h), hillW = new Float32Array(w * h);
  const WT = { wasser: 1, bruecke: 1 }, FT = { wald: 1 }, TT = { ort: 1, truemmer: 1 }, RT = { fels: 1 }, HT = { huegel: 1, fels: 0.6 };
  // Parzellen: verzerrtes Raster mit Zufallspunkten (Voronoi)
  const CELL = 92, pts = new Map(), prng = mulberry(seed * 3 + 1);
  const cell = (i, j) => { const k = i * 7919 + j; let p = pts.get(k); if (!p) { const hsh = hash2(i, j, seed); p = { x: (i + 0.15 + hsh[0] * 0.7) * CELL, y: (j + 0.15 + hsh[1] * 0.7) * CELL, crop: Math.floor(hsh[2] * CROPS.length), dir: hsh[3] * 3.1416, f: 0.3 + hsh[4] * 0.45, plain: hsh[4] < 0.3 }; pts.set(k, p); } return p; };
  const parcelId = new Int32Array(w * h), edgeD = new Float32Array(w * h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const X = px / S, Y = py / S;
    const wx = X + (N4.v(X / 40, Y / 40) - 0.5) * 26 + (N5.v(X / 11, Y / 11) - 0.5) * 8, wy = Y + (N4.v(X / 40 + 50, Y / 40) - 0.5) * 26 + (N5.v(X / 11 + 30, Y / 11) - 0.5) * 8;
    const hx = pixelToHex(wx, wy);
    let sw = 0, sW = 0, sF = 0, sT = 0, sR = 0, sH = 0;
    const cand = [[hx.col, hx.row], ...neighbors(clamp(hx.col, 0, W - 1), clamp(hx.row, 0, H - 1), W, H)];
    for (const [c, r] of cand) {
      if (c < 0 || r < 0 || c >= W || r >= H) continue;
      const p = center(c, r), d = Math.hypot(wx - p.x, wy - p.y);
      let k = 1 - d / (R * 1.22); if (k <= 0) continue; k = k * k * k;
      const t = ter[r * W + c];
      sW += (WT[t] || 0) * k; sF += (FT[t] || 0) * k; sT += (TT[t] || 0) * k; sR += (RT[t] || 0) * k; sH += (HT[t] || 0) * k; sw += k;
    }
    if (!sw) sw = 1;
    const i = py * w + px;
    waterW[i] = sW / sw; forestW[i] = sF / sw; townW[i] = sT / sw; rockW[i] = sR / sw; hillW[i] = sH / sw;
    const x = X / HW, y = Y / HW;
    height[i] = N3.fbm(x * 0.9, y * 0.9, 4) * 0.25 + smoothstep(0.2, 0.9, hillW[i]) * (0.35 + N5.fbm(x * 2.5, y * 2.5, 3) * 0.3) + rockW[i] * N5.fbm(x * 6, y * 6, 3) * 0.4 - smoothstep(0.3, 0.8, waterW[i]) * 0.25;
    // Parzelle
    const gi = Math.floor(X / CELL), gj = Math.floor(Y / CELL);
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const p = cell(gi + a, gj + b), d = Math.hypot(wx - p.x, wy - p.y);
      if (d < d1) { d2 = d1; d1 = d; best = (gi + a) * 7919 + (gj + b); } else if (d < d2) d2 = d;
    }
    parcelId[i] = best; edgeD[i] = d2 - d1;
  }
  const L = [-0.6, -0.6, 0.53];
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px;
    const hx = height[py * w + Math.min(px + 1, w - 1)] - height[py * w + Math.max(px - 1, 0)];
    const hy = height[Math.min(py + 1, h - 1) * w + px] - height[Math.max(py - 1, 0) * w + px];
    const k = 14;
    let nx = -hx * k, ny = -hy * k, nz = 1;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const dot = clamp(nx * L[0] + ny * L[1] + nz * L[2], 0, 1);
    const sh = 0.55 + dot * 0.62;
    const X = px / S, Y = py / S, x = X / HW, y = Y / HW;
    const grain = (N5.v(x * 40, y * 40) - 0.5) * 10, v1 = N4.v(x * 2, y * 2);
    // Felder mit Saatreihen
    const p = pts.get(parcelId[i]), col = CROPS[p.crop];
    const along = X * Math.cos(p.dir) + Y * Math.sin(p.dir), rows = p.plain ? 0.5 + (N5.v(x * 6, y * 6) - 0.5) * 0.6 : Math.sin(along * p.f) * 0.5 + 0.5;
    let r = col[0] + (rows - 0.5) * 16 + grain - v1 * 12, g = col[1] + (rows - 0.5) * 14 + grain - v1 * 10, b = col[2] + (rows - 0.5) * 8 + grain * 0.7 - v1 * 8;
    // Hecken und Feldraine
    const hedge = (1 - smoothstep(0.8, 3.2, edgeD[i])) * 0.85;
    r = r * (1 - hedge * 0.75) + 62 * hedge * 0.75; g = g * (1 - hedge * 0.75) + 86 * hedge * 0.75; b = b * (1 - hedge * 0.75) + 44 * hedge * 0.75;
    // Hügel: grasiger, etwas trockener
    const hw = smoothstep(0.25, 0.8, hillW[i]);
    r = r * (1 - hw * 0.5) + (150 + grain - v1 * 14) * hw * 0.5; g = g * (1 - hw * 0.5) + (160 + grain - v1 * 12) * hw * 0.5; b = b * (1 - hw * 0.5) + (92 + grain) * hw * 0.5;
    // Waldboden
    const fw = smoothstep(0.2, 0.75, forestW[i]);
    r = r * (1 - fw) + (52 + grain + v1 * 10) * fw; g = g * (1 - fw) + (72 + grain + v1 * 12) * fw; b = b * (1 - fw) + (40 + grain * 0.6) * fw;
    // Ortschaft: Schotter, Höfe
    const tw = smoothstep(0.3, 0.8, townW[i]);
    r = r * (1 - tw) + (150 + grain - v1 * 16) * tw; g = g * (1 - tw) + (144 + grain - v1 * 16) * tw; b = b * (1 - tw) + (128 + grain - v1 * 14) * tw;
    // Fels
    const rw = smoothstep(0.3, 0.85, rockW[i]);
    r = r * (1 - rw) + (128 + grain - v1 * 18) * rw; g = g * (1 - rw) + (124 + grain - v1 * 18) * rw; b = b * (1 - rw) + (112 + grain - v1 * 14) * rw;
    // Wasser mit Uferkante
    const ww = waterW[i], wv = smoothstep(0.42, 0.62, ww), bank = smoothstep(0.25, 0.42, ww) * (1 - wv);
    r = r * (1 - bank) + 112 * bank; g = g * (1 - bank) + 100 * bank; b = b * (1 - bank) + 70 * bank;
    const deep = smoothstep(0.62, 1, ww);
    let wr = 62 - deep * 18 + grain * 0.4, wg = 104 - deep * 20 + grain * 0.4, wb = 116 - deep * 10 + grain * 0.3;
    r = r * (1 - wv) + wr * wv; g = g * (1 - wv) + wg * wv; b = b * (1 - wv) + wb * wv;
    const shd = wv > 0.5 ? 0.95 : sh;
    img.data[i * 4] = clamp(r * shd, 0, 255); img.data[i * 4 + 1] = clamp(g * shd, 0, 255); img.data[i * 4 + 2] = clamp(b * shd, 0, 255); img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const full = document.createElement('canvas');
  full.width = Math.ceil(map.size.w); full.height = Math.ceil(map.size.h);
  const fc = full.getContext('2d');
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high';
  fc.drawImage(cv, 0, 0, full.width, full.height);
  const at = (arr, X, Y) => { const ix = clamp(Math.floor(X * S), 0, w - 1), iy = clamp(Math.floor(Y * S), 0, h - 1); return arr[iy * w + ix]; };
  const rr = mulberry(seed);

  // Feine Körnung
  const grain = fc.createImageData(full.width, full.height);
  for (let i = 0; i < grain.data.length; i += 4) { const gv = Math.random() * 255; grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = gv; grain.data[i + 3] = 14; }
  const gcv = document.createElement('canvas'); gcv.width = full.width; gcv.height = full.height; gcv.getContext('2d').putImageData(grain, 0, 0);
  fc.globalCompositeOperation = 'overlay'; fc.drawImage(gcv, 0, 0); fc.globalCompositeOperation = 'source-over';

  // Wasser: Glanzlinien
  for (let k = 0; k < 2600; k++) {
    const X = rr() * full.width, Y = rr() * full.height; if (at(waterW, X, Y) < 0.62) continue;
    const len = 6 + rr() * 16;
    fc.strokeStyle = `rgba(200,230,240,${0.08 + rr() * 0.12})`; fc.lineWidth = 0.8 + rr() * 0.8;
    fc.beginPath(); fc.moveTo(X, Y); fc.quadraticCurveTo(X + len / 2, Y - 1.5, X + len, Y); fc.stroke();
  }
  // Felsbrocken
  for (let k = 0; k < 4000; k++) {
    const X = rr() * full.width, Y = rr() * full.height, rw = at(rockW, X, Y);
    if (rw < 0.5 || rr() > rw) continue;
    const s0 = 1 + rr() * 3.5, a = rr() * 6.28;
    const ps = []; for (let j = 0; j < 5; j++) { const aa = a + j * 1.256 + (rr() - 0.5) * 0.6, q = s0 * (0.6 + rr() * 0.6); ps.push([X + Math.cos(aa) * q, Y + Math.sin(aa) * q * 0.8]); }
    const path = (d) => { fc.beginPath(); ps.forEach(([x, y], j) => j ? fc.lineTo(x + d, y + d) : fc.moveTo(x + d, y + d)); fc.closePath(); };
    fc.fillStyle = 'rgba(20,18,14,0.35)'; path(s0 * 0.5); fc.fill();
    const b0 = 108 + rr() * 50; fc.fillStyle = `rgb(${b0},${b0 - 4},${b0 - 14})`; path(0); fc.fill();
    fc.fillStyle = 'rgba(255,250,235,0.3)'; fc.beginPath(); fc.moveTo(ps[0][0], ps[0][1]); fc.lineTo(ps[1][0], ps[1][1]); fc.lineTo(X, Y); fc.closePath(); fc.fill();
  }

  // Straßen: Bankett, Asphalt, Mittelstreifen; Brücken mit Geländer
  const roadPts = (p) => p.map(([c, r]) => center(c, r));
  const strokeRoad = (pts, wdt, col, dash) => {
    fc.strokeStyle = col; fc.lineWidth = wdt; fc.lineCap = 'round'; fc.lineJoin = 'round'; if (dash) fc.setLineDash(dash); else fc.setLineDash([]);
    fc.beginPath(); fc.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length - 1; k++) { const m = { x: (pts[k].x + pts[k + 1].x) / 2, y: (pts[k].y + pts[k + 1].y) / 2 }; fc.quadraticCurveTo(pts[k].x, pts[k].y, m.x, m.y); }
    fc.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); fc.stroke(); fc.setLineDash([]);
  };
  for (const p of map.roads) { const pts = roadPts(p); strokeRoad(pts, 20, 'rgba(70,64,48,0.35)'); }
  for (const p of map.roads) { const pts = roadPts(p); strokeRoad(pts, 15, 'rgb(150,140,116)'); }
  for (const p of map.roads) { const pts = roadPts(p); strokeRoad(pts, 12, 'rgb(84,84,82)'); }
  for (const p of map.roads) { const pts = roadPts(p); strokeRoad(pts, 1.4, 'rgba(235,225,190,0.7)', [7, 9]); }
  // Asphaltflecken
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!map.road[r * W + c]) continue; const p = center(c, r);
    for (let k = 0; k < 4; k++) { fc.fillStyle = `rgba(${rr() < 0.5 ? '40,40,40' : '120,118,110'},0.18)`; fc.beginPath(); fc.ellipse(p.x + (rr() - 0.5) * 30, p.y + (rr() - 0.5) * 30, 2 + rr() * 4, 1.5 + rr() * 2, rr() * 3, 0, 6.28); fc.fill(); }
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (ter[r * W + c] !== 'bruecke') continue;
    const p = center(c, r);
    // Brückenrichtung: entlang der Straßennachbarn
    const nb = neighbors(c, r, W, H).filter(([a, b]) => map.road[b * W + a]);
    let a = 0;
    if (nb.length) { const q0 = center(nb[0][0], nb[0][1]), q1 = nb[1] ? center(nb[1][0], nb[1][1]) : p; a = Math.atan2(q0.y - q1.y, q0.x - q1.x); }
    fc.save(); fc.translate(p.x, p.y); fc.rotate(a);
    fc.fillStyle = 'rgba(0,0,0,0.35)'; fc.fillRect(-36, -9, 72, 22);
    fc.fillStyle = '#7d776b'; fc.fillRect(-38, -11, 76, 22);
    fc.fillStyle = '#58585a'; fc.fillRect(-38, -7, 76, 14);
    fc.fillStyle = '#b8b2a2'; fc.fillRect(-38, -12, 76, 2.5); fc.fillRect(-38, 9.5, 76, 2.5);
    fc.fillStyle = '#4a463e'; for (let x = -34; x <= 34; x += 8) { fc.fillRect(x, -12, 1.4, 2.5); fc.fillRect(x, 9.5, 1.4, 2.5); }
    fc.restore();
  }

  // Wald: Baumkronen mit Licht von oben links
  const tree = (X, Y, s, dark) => {
    fc.fillStyle = 'rgba(15,22,10,0.4)'; fc.beginPath(); fc.ellipse(X + s * 0.45, Y + s * 0.55, s, s * 0.9, 0, 0, 6.28); fc.fill();
    const g = fc.createRadialGradient(X - s * 0.35, Y - s * 0.4, s * 0.1, X, Y, s);
    const base = dark ? [44, 70, 34] : [60, 92, 44], hi = dark ? [96, 128, 66] : [122, 156, 82];
    g.addColorStop(0, `rgb(${hi})`); g.addColorStop(0.6, `rgb(${base})`); g.addColorStop(1, `rgb(${base.map((v) => v * 0.6 | 0)})`);
    fc.fillStyle = g; fc.beginPath();
    for (let j = 0; j < 9; j++) { const a = j / 9 * 6.283, q = s * (0.82 + Math.sin(j * 2.7 + X) * 0.18); fc.lineTo(X + Math.cos(a) * q, Y + Math.sin(a) * q); }
    fc.closePath(); fc.fill();
  };
  const treeList = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (ter[r * W + c] !== 'wald') continue;
    const p = center(c, r);
    for (let k = 0; k < 22; k++) { const a = rr() * 6.283, d = Math.sqrt(rr()) * R * 1.05; treeList.push([p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.95, 6 + rr() * 6, rr() < 0.4]); }
  }
  // Einzelbäume an Feldrainen
  for (let k = 0; k < 900; k++) {
    const X = rr() * full.width, Y = rr() * full.height, i = clamp(Math.floor(Y * S), 0, h - 1) * w + clamp(Math.floor(X * S), 0, w - 1);
    if (edgeD[i] > 3 || waterW[i] > 0.2 || townW[i] > 0.2 || forestW[i] > 0.3 || rockW[i] > 0.3) continue;
    const hc = pixelToHex(X, Y); if (hc.col >= 0 && hc.row >= 0 && hc.col < W && hc.row < H && map.road[hc.row * W + hc.col]) continue;
    if (rr() < 0.55) treeList.push([X, Y, 4 + rr() * 4, rr() < 0.5]);
  }
  treeList.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s, d] of treeList) tree(x, y, s, d);

  // Ortschaften: Häuser mit Satteldach, Höfe, ausgerichtet an der Straße
  const roofs = [[168, 74, 52], [150, 64, 48], [96, 92, 90], [120, 84, 60], [178, 98, 62], [84, 78, 74]];
  map.houses = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (ter[r * W + c] !== 'ort') continue;
    const p = center(c, r);
    // Ausrichtung: zur nächsten Straße
    let a = (hash2(c, r, seed)[0] - 0.5) * 0.6;
    const nb = neighbors(c, r, W, H).find(([x, y]) => map.road[y * W + x]);
    if (nb) { const q = center(nb[0], nb[1]); a = Math.atan2(q.y - p.y, q.x - p.x) + 1.5708; }
    const n = 3 + Math.floor(rr() * 3), list = [];
    for (let k = 0; k < n * 4 && list.length < n; k++) {
      const ox = (rr() - 0.5) * R * 1.3, oy = (rr() - 0.5) * R * 1.2, hw = 7 + rr() * 5, hh = 5 + rr() * 3;
      if (list.some((o) => Math.hypot(o.x - ox, o.y - oy) < 17)) continue;
      list.push({ x: ox, y: oy, hw, hh, col: roofs[Math.floor(rr() * roofs.length)], a: a + (rr() < 0.25 ? 1.5708 : 0) + (rr() - 0.5) * 0.12 });
    }
    for (const hs of list) {
      fc.save(); fc.translate(p.x + hs.x, p.y + hs.y); fc.rotate(hs.a);
      // Hof / Garten
      fc.fillStyle = rr() < 0.5 ? 'rgba(110,140,70,0.35)' : 'rgba(170,160,130,0.3)'; fc.fillRect(-hs.hw - 4, -hs.hh - 4, hs.hw * 2 + 8, hs.hh * 2 + 8);
      fc.fillStyle = 'rgba(15,12,8,0.45)'; fc.fillRect(-hs.hw + 2.5, -hs.hh + 3, hs.hw * 2, hs.hh * 2);
      const [cr, cg, cb] = hs.col;
      fc.fillStyle = `rgb(${cr * 1.12 | 0},${cg * 1.12 | 0},${cb * 1.1 | 0})`; fc.fillRect(-hs.hw, -hs.hh, hs.hw * 2, hs.hh);
      fc.fillStyle = `rgb(${cr * 0.72 | 0},${cg * 0.72 | 0},${cb * 0.72 | 0})`; fc.fillRect(-hs.hw, 0, hs.hw * 2, hs.hh);
      fc.strokeStyle = 'rgba(30,20,15,0.6)'; fc.lineWidth = 0.7; fc.beginPath(); fc.moveTo(-hs.hw, 0); fc.lineTo(hs.hw, 0); fc.stroke();
      fc.strokeStyle = 'rgba(0,0,0,0.15)'; fc.lineWidth = 0.5; for (let x = -hs.hw + 2; x < hs.hw; x += 2.2) { fc.beginPath(); fc.moveTo(x, -hs.hh); fc.lineTo(x, hs.hh); fc.stroke(); }
      if (rr() < 0.5) { fc.fillStyle = '#5a4a40'; fc.fillRect(hs.hw * 0.4, -hs.hh * 0.75, 2.2, 2.2); }
      fc.restore();
    }
    map.houses.push({ c, r, list });
  }
  return full;
}

function hash2(i, j, s) {
  let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0;
  const out = [];
  for (let k = 0; k < 5; k++) { h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; out.push(((h >>> 0) % 10000) / 10000); h += 0x9e3779b9; }
  return out;
}
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
