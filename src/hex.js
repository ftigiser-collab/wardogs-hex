// Hex-Mathematik: spitze Oberseite, "odd-r"-Versatz (ungerade Reihen nach rechts)
export const R = 38;                 // Hex-Radius in Weltpixeln
export const HW = Math.sqrt(3) * R;  // Hex-Breite
export const VS = 1.5 * R;           // Reihenabstand
export const PAD = 24;

export function center(col, row) {
  return { x: PAD + HW * (col + 0.5 * (row & 1)) + HW / 2, y: PAD + VS * row + R };
}

const NB_EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const NB_ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
export function neighbors(col, row, W, H) {
  const t = row & 1 ? NB_ODD : NB_EVEN, out = [];
  for (const [dc, dr] of t) {
    const c = col + dc, r = row + dr;
    if (c >= 0 && r >= 0 && c < W && r < H) out.push([c, r]);
  }
  return out;
}

export function toCube(col, row) { const x = col - (row - (row & 1)) / 2; return { x, z: row, y: -x - row }; }
export function fromCube(x, z) { return { col: x + (z - (z & 1)) / 2, row: z }; }
export function distance(c1, r1, c2, r2) {
  const a = toCube(c1, r1), b = toCube(c2, r2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

export function pixelToHex(px, py) {
  const x = px - PAD - HW / 2, y = py - PAD - R;
  const q = (Math.sqrt(3) / 3 * x - y / 3) / R;
  const r = (2 / 3 * y) / R;
  // Würfelrundung
  let cx = q, cz = r, cy = -cx - cz;
  let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
  const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return fromCube(rx, rz);
}

export function corners(cx, cy, r = R) {
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

export function hexPath(ctx, cx, cy, r = R) {
  const p = corners(cx, cy, r);
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
}

export function worldSize(W, H) {
  return { w: PAD * 2 + HW * (W + 0.5), h: PAD * 2 + VS * (H - 1) + 2 * R };
}

export function ring(col, row, radius, W, H) {
  const out = [];
  for (let r = Math.max(0, row - radius); r <= Math.min(H - 1, row + radius); r++)
    for (let c = Math.max(0, col - radius - 1); c <= Math.min(W - 1, col + radius + 1); c++)
      if (distance(col, row, c, r) <= radius) out.push([c, r]);
  return out;
}
