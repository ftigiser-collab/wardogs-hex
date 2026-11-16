// Hilfsfunktionen: Zufall, Rauschen, Mathe
export const TILE = 32;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function turnToward(cur, target, maxStep) {
  const d = angDiff(cur, target);
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}

export class Noise {
  constructor(seed) {
    const r = mulberry32(seed);
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
    this.g = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.g[i] = r();
  }
  h(X, Y) { return this.g[this.p[(this.p[X & 255] + (Y & 255)) & 511]]; }
  v(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = this.h(xi, yi), b = this.h(xi + 1, yi), c = this.h(xi, yi + 1), d = this.h(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), w);
  }
  fbm(x, y, oct = 4) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += this.v(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  }
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c) => clamp(Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)), 0, 255);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
