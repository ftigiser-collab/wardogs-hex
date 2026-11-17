// Steuerung: Eingabe, Auswahl, Menüs, Animationen, Rundenablauf — Hundemarke
import { drawSymbolLayer } from './symbols.js';
import { UNITS, BUILDINGS, WEAPONS, TERRAIN, MOVE_COST, FACTIONS, ARMOR_MOD, RANKS, AMMO, AMMO_ORDER, PALLETS, BUILD_LIST, PAY, CODE_USES, TRACKS, GUNS, GEAR, VESTS, TEMPLATES, infDef, loadoutCost, roleOf, HAMMER_NAME, CHUTE_PRICE, TRACK_KEYS, levelOf, xpForLevel } from './data.js';
import { center, pixelToHex, distance, R, ring } from './hex.js';
import { icon } from './sprites.js';
import { angDiff } from './util.js';
import { aiTurn, autoTurn } from './ai.js';
import { crestImg } from './crest.js';
import { SLOTS, slotMeta, writeSlot } from './saves.js';

const $ = (s) => document.querySelector(s);
const ARMOR_NAME = { inf: 'Infanterie', light: 'Leicht gepanzert', heavy: 'Schwer gepanzert', air: 'Luft', bld: 'Bauwerk' };
const MT_NAME = { foot: 'zu Fuß', wheel: 'Räder', track: 'Ketten', air: 'Flug' };
const money = (v) => '$' + Math.floor(v).toLocaleString('de-DE');
const TAB = { inf: 'Infanterie', veh: 'Fahrzeuge', air: 'Luft' };
const GUN_CLS = { ar: 'Sturmgewehre (AR)', smg: 'Maschinenpistolen (SMG)', sg: 'Schrotflinten', dmr: 'Präzisionsgewehre (DMR)', sr: 'Scharfschützengewehre', lmg: 'Leichte MGs (LMG)', at: 'Panzerabwehr (AT)', aa: 'Fliegerabwehr (AA)', gl: 'Granatwerfer' };
const lockTxt = (it) => `🔒 ${it.track === 'wardog' ? 'Wardog' : TRACKS[it.track].name} ${it.lvl}`;

export class Controller {
  constructor(game, renderer, fx) {
    this.g = game; this.r = renderer; this.fx = fx;
    this.sel = null; this.mode = 'idle'; this.busy = false;
    this.tweens = [];
    this.reach = null; this.afterMove = new Map();
    this.pointers = new Map();
    this.speed = 1; this.aiSpeed = 1;
    this.shopTab = 'inf'; this.deployAt = 'hq';
    this.actAnimated = {
      move: (u, c, r, reach) => this.doMove(u, c, r, reach),
      attack: (u, t) => this.doAttack(u, t),
      board: (apc, t) => this.animBoard(apc, t),
      unload: (apc, c, r) => this.animUnload(apc, c, r),
      act: (ev) => this.playEvents([ev]),
      attack2: async (u, ev) => { await this.animAttack(ev); this.g.cleanup(); this.checkEnd(); },
      land: (u, down) => this.animLand(u, down),
    };
    this.bindInput();
    this.bindDom();
    this.refresh();
  }

  // ---------- Animation ----------
  update(dt) {
    const keep = [];
    for (const tw of this.tweens) { tw.t += dt * this.speed; const done = tw.step(Math.min(1, tw.t / tw.dur), dt); if (tw.t >= tw.dur || done) { tw.step(1, 0); tw.resolve(); } else keep.push(tw); }
    this.tweens = keep;
    this.r.projectiles = this.projectiles;
    this.updateLog();
    if (this.g.xpQueue && this.g.xpQueue.length) this.drainXp();
    if (this.tmOpen) { this.tmT = (this.tmT || 0) - dt; if (this.tmT <= 0) { this.tmT = 0.05; this.drawTacmap(); } }
    this.minimapT = (this.minimapT || 0) - dt;
    if (this.minimapT <= 0) { this.minimapT = 0.25; this.drawMinimap(); }
  }
  tween(dur, step) { return new Promise((resolve) => this.tweens.push({ t: 0, dur, step, resolve })); }
  wait(s) { return this.tween(s, () => {}); }
  async animMove(u, path) {
    if (path.length < 2) return;
    const pts = path.map((h) => center(h.c, h.r));
    const segT = u.def.mt === 'air' ? 0.09 : u.def.cat === 'inf' ? 0.2 : 0.14;
    u.anim = true;
    const dusty = (h) => { const t = this.g.terr(h.c, h.r); return t === 'feld' || t === 'huegel' || t === 'truemmer'; };
    // Eigene Einheiten decken während der Bewegung auf, Feld für Feld (kein Verschwinden im Schwarz)
    const g = this.g, revealed = new Set();
    const sight = u.owner === 0 && !u.carried ? g.sightOf(u) : 0;
    const revealAt = (j) => {
      if (!sight || revealed.has(j)) return; revealed.add(j);
      const h = path[j]; let changed = false;
      for (const [x, y] of ring(h.c, h.r, sight, g.W, g.H)) { const q = g.i(x, y); if (!g.visible[q] || !g.explored[q]) { g.visible[q] = 1; g.explored[q] = 1; changed = true; } }
      if (changed) this.r.fogDirty = true;
    };
    revealAt(0);
    await this.tween(segT * (pts.length - 1), (k) => {
      const f = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), l = f - i;
      if (l > 0.25) revealAt(i + 1);
      const a = pts[i], b = pts[i + 1];
      u.vis = { x: a.x + (b.x - a.x) * l, y: a.y + (b.y - a.y) * l };
      const nf = Math.atan2(b.y - a.y, b.x - a.x);
      if (u.def.mt === 'air') {
        const d = angDiff(u.facing ?? nf, nf);
        u.bank = Math.max(-1, Math.min(1, (u.bank || 0) * 0.85 + d * 1.6));
        if ((k < 0.12 || k > 0.88) && Math.random() < 0.6) { const ga = Math.random() * 6.28; this.fx.dust(u.vis.x + Math.cos(ga) * 18, u.vis.y + Math.sin(ga) * 12, 1, '210,175,120', 6, 5); }
      }
      u.facing = nf;
      if (u.def.mt !== 'air' && u.def.cat === 'veh' && dusty(path[i + 1]) && Math.random() < 0.5) this.fx.dust(u.vis.x - Math.cos(u.facing) * 12, u.vis.y - Math.sin(u.facing) * 12, 1, '140,125,95', 6, 4);
      if (u.def.mt !== 'air' && u.def.cat === 'veh') { const lt = u._lt; if (!lt || Math.hypot(u.vis.x - lt.x, u.vis.y - lt.y) > 7) { this.fx.track(u.vis.x, u.vis.y, u.facing, u.type === 'trike' ? 8 : u.type === 'ernter' ? 15 : 11); u._lt = { ...u.vis }; } }
      
      if (u.def.cat === 'inf' && Math.random() < 0.08) this.fx.dust(u.vis.x, u.vis.y + 4, 1, '190,150,100', 8, 2);
    });
    u.vis = null; u.anim = false;
    if (u.bank) this.tween(0.4, (k) => { u.bank *= 0.8; }).then(() => { u.bank = 0; });
  }

  shotVisual(a, t, proj) {
    const pa = this.r.posOf(a), pt = this.r.posOf(t);
    const az = a.isUnit && a.def.mt === 'air' ? 26 : 0, tz = t.isUnit && t.def.mt === 'air' ? 26 : 0;
    const sx = pa.x, sy = pa.y - az, tx = pt.x + (Math.random() - 0.5) * 10, ty = pt.y - tz + (Math.random() - 0.5) * 10;
    const fx = this.fx;
    const team = a.owner === 0 ? '200,225,255' : '255,210,170';
    if (proj === 'bullet') {
      const ang = Math.atan2(ty - sy, tx - sx), heavy = a.isUnit && ['humvee_mini', 'lakota_mini', 'ah6m', 'gepard'].includes(a.type) || a.type === 'ciws';
      if (a.isUnit) a.firing = 1;
      return this.tween(heavy ? 0.6 : 0.45, (k, dt) => {
        if (Math.random() < dt * (heavy ? 40 : 22)) {
          const jx = (Math.random() - 0.5) * 16, jy = (Math.random() - 0.5) * 16;
          fx.tracer(sx, sy, tx + jx, ty + jy, team); fx.muzzle(sx, sy, ang, heavy ? 0.9 : 0.6); if (Math.random() < 0.5) fx.casing(sx, sy, ang);
          if (Math.random() < 0.6) fx.spark(tx + jx, ty + jy, 2, '255,230,170', 60);
        }
      }).then(() => { if (a.isUnit) a.firing = 0; fx.dust(tx, ty, 3, '120,110,90', 10, 4); });
    }
    if (proj === 'sniper') {
      fx.flash(sx, sy, 10, '255,240,200', 0.07);
      fx.add({ kind: 'line', x: sx, y: sy, x2: tx, y2: ty, life: 0.18, col: '255,250,230', a: 1 });
      return this.wait(0.12).then(() => { fx.spark(tx, ty, 5, '255,220,180', 70); fx.dust(tx, ty, 3, '120,110,90', 8, 3); });
    }
    if (proj === 'drone') {
      const p = { kind: 'drone', x: sx, y: sy, h: 10 }; this.projectiles = this.projectiles || []; this.projectiles.push(p);
      const d = Math.hypot(tx - sx, ty - sy);
      return this.tween(0.5 + d / 500, (k) => { const e = k * k * (3 - 2 * k); p.x = sx + (tx - sx) * e + Math.sin(k * 9) * 4 * (1 - k); p.y = sy + (ty - sy) * e; p.h = 14 * Math.sin(Math.PI * k) + 2; })
        .then(() => { this.projectiles = this.projectiles.filter((q) => q !== p); fx.explosion(tx, ty, 0.55); });
    }
    if (proj === 'c4') {
      return (async () => { this.r.float(tx, ty - 24, 'C4', '#ffd36a'); for (let k = 0; k < 3; k++) { this.fx.add({ kind: 'glow', x: tx, y: ty, life: 0.15, size: 3, grow: 1, col: '255,60,40', a: 1 }); await this.wait(0.18); } this.fx.flash(tx, ty, 90, '255,210,150', 0.35); this.fx.shake = 7; this.fx.smoke(tx, ty, 8, 10, 1.6); this.fx.spark(tx, ty, 20, '255,210,140', 160); this.fx.dust(tx, ty, 18, '120,110,90', 40, 8); })();
    }
    if (proj === 'grad') {
      const salvo = [];
      for (let k = 0; k < 6; k++) salvo.push(this.wait(k * 0.08).then(() => {
        const ox = (Math.random() - 0.5) * 70, oy = (Math.random() - 0.5) * 50, p = { kind: 'grad', x: sx, y: sy, h: 0, ang: 0 };
        this.projectiles = this.projectiles || []; this.projectiles.push(p); fx.flash(sx, sy, 12, '255,200,120', 0.06);
        const ex = tx + ox, ey = ty + oy, d = Math.hypot(ex - sx, ey - sy);
        return this.tween(0.85, (q) => { p.x = sx + (ex - sx) * q; p.y = sy + (ey - sy) * q; const h0 = p.h; p.h = Math.sin(Math.PI * q) * (60 + d * 0.18); p.ang = Math.atan2((ey - sy) * 0.02 - (p.h - h0), (ex - sx) * 0.02); if (Math.random() < 0.8) fx.add({ kind: 'puff', x: p.x, y: p.y - p.h, life: 0.8, size: 2.5, grow: 8, col: '210,205,195', a: 0.35, air: true }); })
          .then(() => { this.projectiles = this.projectiles.filter((q) => q !== p); fx.explosion(ex, ey, 0.6); });
      }));
      fx.shake = 6;
      return Promise.all(salvo);
    }
    const kind = proj === 'arty' ? 'arty' : proj === 'missile' ? 'missile' : proj;
    const p = { kind, x: sx, y: sy, h: 0, ang: Math.atan2(ty - sy, tx - sx) };
    this.projectiles = this.projectiles || []; this.projectiles.push(p);
    const d = Math.hypot(tx - sx, ty - sy);
    const dur = proj === 'arty' ? 0.85 : proj === 'rocket' || proj === 'missile' ? 0.2 + d / 420 : 0.1 + d / 650;
    fx.flash(sx, sy, proj === 'shell' ? 16 : 10, '255,200,120', 0.08);
    if (proj === 'shell') { fx.smoke(sx, sy, 2, 4, 0.9); fx.muzzle(sx, sy, Math.atan2(ty - sy, tx - sx), 1.3); fx.dust(sx, sy + 6, 3, '120,110,90', 16, 5); }
    if (proj === 'arty') { fx.smoke(sx, sy, 4, 6, 0.9); fx.flash(sx, sy, 24, '255,210,140', 0.1); }
    return this.tween(dur, (k) => {
      const kk = proj === 'rocket' || proj === 'missile' ? k * k : k;
      p.x = sx + (tx - sx) * kk; p.y = sy + (ty - sy) * kk;
      p.h = proj === 'arty' ? Math.sin(Math.PI * k) * (60 + d * 0.15) : proj === 'missile' ? Math.sin(Math.PI * k) * 12 : 0;
      if (proj === 'arty') { const k2 = Math.min(1, k + 0.02), nh = Math.sin(Math.PI * k2) * (60 + d * 0.15); p.ang = Math.atan2((ty - sy) * 0.02 - (nh - p.h), (tx - sx) * 0.02); }
      if ((proj === 'rocket' || proj === 'arty' || proj === 'missile') && Math.random() < 0.9) fx.add({ kind: 'puff', x: p.x, y: p.y - p.h, life: 0.7, size: 2.5, grow: 9, col: '220,215,205', a: 0.4, air: true });
    }).then(() => {
      this.projectiles = this.projectiles.filter((q) => q !== p);
      fx.explosion(tx, ty, proj === 'arty' ? 1 : proj === 'missile' ? 0.7 : 0.5);
    });
  }

  async animAttack(ev) {
    const sp = this.speed; this.speed = sp * 0.65;
    try { await this.animAttackInner(ev); } finally { this.speed = sp; }
    if (ev.promos) for (const pr of ev.promos) await this.animPromotion(pr);
    this.showCash(ev.cash);
  }
  async animPromotion(pr) {
    const g = this.g, u = g.get(pr.u); if (!u || u.dead || !(u.owner === 0 || g.seen(u))) return;
    const p = this.r.posOf(u), z = u.def.mt === 'air' ? (u.z ?? 26) : 0, y = p.y - z;
    this.fx.ring(p.x, y, 16, '255,215,120', 0.7); this.fx.flash(p.x, y, 34, '255,220,140', 0.25);
    this.fx.spark(p.x, y, 18, '255,215,120', 90);
    this.r.float(p.x, y - 30, `${'★'.repeat(pr.rank)} ${RANKS[pr.rank].name}!`, '#ffd36a', true);
    u.promoGlow = 1;
    await this.tween(0.9, (k) => { u.promoGlow = 1 - k; });
    u.promoGlow = 0;
  }
  async animAttackInner(ev) {
    const g = this.g;
    const a = g.byId.get(ev.att), t = g.byId.get(ev.target);
    if (!a || !t) return;
    const visible = g.seen(a) || g.seen(t) || a.owner === 0 || t.owner === 0;
    if (!visible) { if (ev.killed) t.gone = true; if (ev.counterKilled) a.gone = true; return; }
    const pt = this.r.posOf(t);
    this.ensureVisible(pt.x, pt.y);
    const pa = this.r.posOf(a);
    await this.aimAt(a, Math.atan2(pt.y - pa.y, pt.x - pa.x));
    this.kick(a, ev.proj);
    await this.shotVisual(a, t, ev.proj);
    const tz = t.isUnit && t.def.mt === 'air' ? 26 : 0;
    if (ev.flared) { for (let k = 0; k < 8; k++) this.fx.add({ kind: 'glow', x: pt.x, y: pt.y - tz, vx: (Math.random() - 0.5) * 120, vy: 30 + Math.random() * 60, life: 1, size: 3, grow: 1, col: '255,220,140', a: 1 }); this.r.float(pt.x, pt.y - 30, 'Täuschkörper!', '#ffe08a', true); }
    else if (ev.miss) this.r.float(pt.x, pt.y - 26, 'Verfehlt', '#cfd6c8');
    else { this.hitFlash(t); this.r.float(pt.x, pt.y - tz, ev.finished ? 'Erledigt' : `-${Math.round(ev.dmg)}`, '#ff8a6a', ev.dmg > 40); }
    if (ev.suppressed) this.r.float(pt.x, pt.y - 44, 'Niedergehalten', '#d8c0ff');
    if (ev.splash) for (const s of ev.splash) { const o = g.byId.get(s.id); if (!o) continue; const q = this.r.posOf(o); this.hitFlash(o); if (g.seen(o) || o.owner === 0) this.r.float(q.x, q.y, `-${s.dmg}`, '#ff9a6a'); if (s.killed) this.finishKill(o, true); if (s.downed) this.r.float(q.x, q.y - 30, 'Verwundet!', '#ff6a50'); }
    if (ev.rubble) for (const [c, r] of ev.rubble) { const q = center(c, r); this.fx.debris(q.x, q.y, 18, '120,105,90'); this.fx.smoke(q.x, q.y, 6, 9, 0.95); this.fx.shake = Math.max(this.fx.shake, 6); }
    if (ev.antenna) { const s = g.byId.get(ev.antenna); if (s) { const q = this.r.posOf(s); this.fx.spark(q.x, q.y, 14, '255,220,150', 90); this.r.float(q.x, q.y - 36, 'Antenne zerstört!', '#ff6a50', true); } }
    if (ev.downed) { this.r.float(pt.x, pt.y - 34, 'Verwundet!', '#ff6a50', true); this.fx.dust(pt.x, pt.y, 6, '110,90,70', 14, 4); await this.wait(0.3); }
    else if (ev.killed) { await this.wait(0.1); await this.finishKill(t, true); await this.wait(0.3); }
    else if (ev.counter > 0 || ev.counterKilled || ev.counterFlared) {
      await this.wait(0.12);
      await this.aimAt(t, Math.atan2(pa.y - pt.y, pa.x - pt.x));
      this.kick(t, ev.counterProj);
      await this.shotVisual(t, a, ev.counterProj);
      if (ev.counterFlared) this.r.float(pa.x, pa.y - 30, 'Täuschkörper!', '#ffe08a');
      else { this.hitFlash(a); this.r.float(pa.x, pa.y - (a.isUnit && a.def.mt === 'air' ? 26 : 0), `-${Math.round(ev.counter)}`, '#ffb36a'); }
      if (ev.counterDowned) this.r.float(pa.x, pa.y - 34, 'Verwundet!', '#ff6a50', true);
      if (ev.counterKilled) { await this.wait(0.1); await this.finishKill(a, true); await this.wait(0.3); }
    }
    await this.wait(0.15);
  }
  async aimAt(a, ang) {
    const turret = a.isUnit && ['t72', 'l2a6', 'gepard', 'sph2'].includes(a.type);
    if (turret) {
      const from = a.turretRel || 0, to = angDiff(a.facing, ang), d = angDiff(from, to);
      a.aimUntil = this.r.t + 4;
      if (Math.abs(d) > 0.05) await this.tween(Math.min(0.35, Math.abs(d) * 0.15 + 0.05), (k) => { a.turretRel = from + d * k; });
      a.turretRel = to; return;
    }
    if (a.isUnit && a.def.cat === 'inf') { a.facing = ang; return; }
    const from = a.facing || 0, d = angDiff(from, ang);
    if (Math.abs(d) > 0.05) await this.tween(Math.min(0.35, Math.abs(d) * 0.13 + 0.05), (k) => { a.facing = from + d * k; });
    a.facing = ang;
  }
  kick(a, proj) {
    if (proj === 'bullet' || proj === 'flak') return;
    a.recoil = 1; this.tween(0.3, (k) => { a.recoil = 1 - k; });
  }
  hitFlash(t) { if (!t || t.dead) return; t.hitFlash = 1; this.tween(0.25, (k) => { t.hitFlash = 1 - k; }); }

  async finishKill(e, killed) {
    if (!killed || !e || e.gone || e.crashing) return;
    const p = { ...this.r.posOf(e) };
    const fx = this.fx, col = this.g.players[e.owner].color;
    if (e.isBuilding) {
      fx.explosion(p.x, p.y, 1.5); fx.shake = 8;
      for (let k = 0; k < 4; k++) setTimeout(() => fx.explosion(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 30, 0.7 + Math.random() * 0.5), 110 * k);
      fx.debris(p.x, p.y, 22, '90,85,80'); this.r.addRubble(p);
      e.gone = true; return;
    }
    if (e.def.mt === 'air' && !e.landed) {
      e.crashing = true;
      const z0 = e.z ?? 26, f0 = e.facing, dx = (Math.random() - 0.5) * 50, dy = 20 + Math.random() * 20;
      fx.explosion(p.x, p.y - z0, 0.6);
      await this.tween(0.9, (k) => {
        e.z = z0 * (1 - k * k); e.facing = f0 + k * 9;
        e.vis = { x: p.x + dx * k, y: p.y + dy * k * 0.5 };
        if (Math.random() < 0.8) { fx.smoke(e.vis.x, e.vis.y - e.z, 1, 4, 0.95); fx.fire(e.vis.x, e.vis.y - e.z, 1, 3); }
      });
      const q = { ...e.vis };
      fx.explosion(q.x, q.y, 1.3); fx.shake = 6;
      this.r.addWreck(e, q);
      e.gone = true; return;
    }
    if (e.def.cat === 'inf') {
      fx.dust(p.x, p.y, 6, '110,90,70', 14, 4); fx.spark(p.x, p.y, 4, '255,160,100', 50);
      fx.corpse(p.x, p.y, e.facing + Math.PI / 2, col, 2);
      e.gone = true; return;
    }
    fx.explosion(p.x, p.y, 1.2);
    fx.debris(p.x, p.y, 10, '60,58,55');
    if (e.def.turret) { const a = Math.random() * 6.28; fx.add({ kind: 'debris', x: p.x, y: p.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, vz: 220, life: 1.6, size: 9, col: '70,62,52', a: 1 }); fx.smoke(p.x, p.y, 6, 8, 0.95); }
    this.r.addWreck(e, p);
    e.gone = true;
  }
  ensureVisible(x, y) {
    const s = this.r.w2s(x, y);
    if (s.x < 60 || s.y < 60 || s.x > this.r.vw - 60 || s.y > this.r.vh - 60) this.r.centerOn(x, y);
  }

  // Geld fliegt auf: nur eigene Einnahmen
  showCash(list) {
    if (!list) return;
    let any = false;
    for (const c of list) {
      if (c.owner !== 0) continue; any = true;
      const p = c.c != null ? center(c.c, c.r) : null;
      if (p) this.r.float(p.x + (Math.random() - 0.5) * 10, p.y - 44, `+${money(c.amount)}`, '#9cf58e', c.amount >= 1000);
    }
    if (any) { this.pulse('#credits'); this.refresh(); }
  }

  async playEvents(evs) {
    const g = this.g;
    for (const ev of evs) {
      if (!ev) continue;
      if (ev.type === 'attack') await this.animAttack(ev);
      else if (ev.type === 'spawn') {
        const u = g.get(ev.u); if (!u || !g.seen(u)) continue;
        const p = center(u.c, u.r); this.fx.ring(p.x, p.y, 8, '200,235,255', 0.5);
        const src = ev.from && g.byId.get(ev.from);
        if (src) {
          const a = this.r.posOf(src);
          u.facing = Math.atan2(p.y - a.y, p.x - a.x);
          if (u.def.mt === 'air') { u.z = 0; this.tween(0.9, (k) => { u.z = 26 * k; u.vis = { x: a.x + (p.x - a.x) * k * k, y: a.y + (p.y - a.y) * k * k }; if (Math.random() < 0.4) this.fx.dust(u.vis.x, u.vis.y, 1, '150,150,120', 18, 6); }).then(() => { u.vis = null; u.z = undefined; }); }
          else { u.anim = true; this.fx.dust(a.x, a.y + 10, 6, '120,115,95', 20, 6); this.tween(0.6, (k) => { const kk = 1 - (1 - k) * (1 - k); u.vis = { x: a.x + (p.x - a.x) * kk, y: a.y + (p.y - a.y) * kk }; }).then(() => { u.vis = null; u.anim = false; }); }
        }
        if (ev.spz && u.owner === 0) { this.r.centerOn(p.x, p.y); this.r.float(p.x, p.y - 40, 'Einsatz-SPz bereit', '#9fd0ff', true); await this.wait(0.6); }
      } else if (ev.type === 'cash') this.showCash([ev]);
      else if (ev.type === 'place' || ev.type === 'hammer') {
        const b = g.get(ev.b), u = g.get(ev.u); if (!b || !g.seen(b)) { this.showCash(ev.cash); continue; }
        const p = center(b.c, b.r);
        if (u) { u.recoil = 1; this.tween(0.25, (k) => { u.recoil = 1 - k; }); }
        for (let k = 0; k < 3; k++) { await this.wait(0.12); this.fx.spark(p.x + (Math.random() - 0.5) * 20, p.y + (Math.random() - 0.5) * 16, 6, '255,230,160', 70); this.fx.dust(p.x, p.y + 6, 2, '140,120,90', 12, 4); }
        if (ev.built) { b.rise = 0; this.fx.dust(p.x, p.y, 14, '140,130,110', 40, 8); this.tween(0.6, (k) => { b.rise = k; }); this.r.float(p.x, p.y - 34, `${b.def.name} fertig`, '#ffd36a', true); }
        this.showCash(ev.cash);
      } else if (ev.type === 'fob') {
        const b = g.get(ev.b); if (!b || !g.seen(b)) continue;
        const p = center(b.c, b.r);
        if (b.owner === 0 || g.visible[g.i(b.c, b.r)]) this.ensureVisible(p.x, p.y);
        b.rise = 0; this.fx.dust(p.x, p.y, 18, '140,130,110', 46, 9); this.fx.ring(p.x, p.y, 20, '200,255,200', 0.8);
        await this.tween(0.7, (k) => { b.rise = k; });
        this.r.float(p.x, p.y - 40, 'Vorposten errichtet', g.players[b.owner].color, true);
      } else if (ev.type === 'revive') {
        const t = g.get(ev.t); if (!t || !g.seen(t)) { this.showCash(ev.cash); continue; }
        const p = center(t.c, t.r);
        await this.tween(0.6, (k) => { if (Math.random() < 0.5) this.fx.add({ kind: 'glow', x: p.x + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 14, vy: -30, life: 0.7, size: 3, grow: 2, col: '140,255,170', a: 0.9 }); });
        this.fx.ring(p.x, p.y, 14, '140,255,170', 0.6); this.r.float(p.x, p.y - 30, 'Wiederbelebt!', '#9cf58e', true);
        this.showCash(ev.cash);
      } else if (ev.type === 'healed') {
        const t = g.get(ev.t); if (t && g.seen(t)) { const p = center(t.c, t.r); this.r.float(p.x, p.y - 22, `+${ev.amount}`, '#9cf58e'); this.fx.add({ kind: 'glow', x: p.x, y: p.y, life: 0.6, size: 18, grow: 20, col: '140,255,160', a: 0.5 }); }
        this.showCash(ev.cash);
      } else if (ev.type === 'repair') {
        const t = g.byId.get(ev.t); if (t && g.seen(t)) { const p = this.r.posOf(t); for (let k = 0; k < 3; k++) { await this.wait(0.1); this.fx.spark(p.x + (Math.random() - 0.5) * 20, p.y + (Math.random() - 0.5) * 16, 6, '160,220,255', 70); } this.r.float(p.x, p.y - 26, 'Repariert', '#9fd0ff'); }
      } else if (ev.type === 'hack') {
        const tw = g.towers[ev.tower], p = center(tw.c, tw.r), u = g.get(ev.u);
        if (!(u && (u.owner === 0 || g.seen(u)))) { this.showCash(ev.cash); continue; }
        this.ensureVisible(p.x, p.y);
        await this.tween(0.8, (k) => { if (Math.random() < 0.6) this.fx.add({ kind: 'glow', x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 30, vy: -20, life: 0.6, size: 2.5, grow: 1, col: '120,220,255', a: 0.9 }); });
        this.fx.ring(p.x, p.y, 18, '120,220,255', 0.7);
        this.r.float(p.x, p.y - 40, ev.owner === 0 || u.owner === 0 ? `Turm ${'ABCD'[ev.tower]}: Ziffer ${ev.digit}` : `Turm ${'ABCD'[ev.tower]} → ${g.players[u.owner].name}`, u.owner === 0 ? '#9fe8ff' : g.players[u.owner].color, true);
        this.showCash(ev.cash); this.refresh();
      } else if (ev.type === 'code') await this.animCode(ev);
      else if (ev.type === 'pallet') {
        const u = g.get(ev.u), b = g.get(ev.b);
        if (u && b && (u.owner === 0 || g.seen(u))) {
          const a = this.r.posOf(u), q = center(b.c, b.r);
          for (const k of ev.items) { this.fx.dust(a.x, a.y, 6, '140,120,90', 18, 5); this.r.float(a.x, a.y - 26, `+${PALLETS[k].amount} ${PALLETS[k].unit}`, '#ffd36a'); await this.wait(0.25); }
          this.fx.ring(q.x, q.y, 14, '255,220,140', 0.5);
        }
        this.showCash(ev.cash);
      } else if (ev.type === 'fobhack') {
        const b = g.get(ev.b); if (b && g.seen(b)) { const p = center(b.c, b.r); this.fx.ring(p.x, p.y, 24, '255,90,60', 0.8); if (ev.done) { this.fx.flash(p.x, p.y, 60, '255,200,150', 0.3); this.r.float(p.x, p.y - 44, `Vorposten → ${g.players[b.owner].name}`, g.players[b.owner].color, true); this.r['_fob' + b.id + '-' + ev.from] = null; } }
        this.showCash(ev.cash);
      } else if (ev.type === 'drill') {
        const b = g.get(ev.b); if (b) { const p = center(b.c, b.r); this.fx.shake = 4; this.fx.dust(p.x, p.y, 16, '110,90,70', 34, 8); this.r.float(p.x, p.y - 40, 'Bohrturm läuft!', '#ffb060', true); }
      } else if (ev.type === 'bleed') {
        const u = g.byId.get(ev.u); if (u && (u.owner === 0 || g.visible[g.i(u.c, u.r)])) { const p = center(u.c, u.r); this.fx.corpse(p.x, p.y, (u.facing || 0) + Math.PI / 2, g.players[u.owner].color, 2); u.gone = true; }
      } else if (ev.type === 'unload') this.showCash(ev.cash);
      else if (ev.type === 'tick') await this.animTick(ev);
      else if (ev.type === 'zonepay') {
        if (ev.owner !== 0) continue;
        for (const h of ev.at) { const p = center(h.c, h.r); this.r.float(p.x, p.y - 18, `+$${h.hz ? PAY.hz : PAY.cz}`, h.hz ? '#ffc070' : '#9cf58e'); }
        this.pulse('#credits'); this.refresh();
      } else if (ev.type === 'coalition') { this.refresh(); }
      else if (ev.type === 'weather') { this.refresh(); this.flash(ev.w === 'regen' ? 'Regenfront: Sicht −1' : 'Der Regen hört auf'); }
      else if (ev.type === 'hzmove') {
        const p = center(ev.to.c, ev.to.r);
        if (ev.from.c !== ev.to.c || ev.from.r !== ev.to.r) { this.fx.ring(p.x, p.y, 30, '255,160,80', 0.7); }
      } else if (ev.type === 'heal') {
        const u = g.get(ev.u); if (u && g.seen(u)) { const p = this.r.posOf(u); this.r.float(p.x, p.y - 22, `+${ev.amount}`, '#9cf58e'); }
      } else if (ev.type === 'paradrop') {
        const apc = g.get(ev.apc); const vis = (apc && apc.owner === 0) || ev.drops.some((d) => g.visible[g.i(d.c, d.r)]);
        if (vis && apc) {
          const a = this.r.posOf(apc); const us = ev.drops.map((d) => g.byId.get(d.t)).filter(Boolean);
          if (apc.owner !== 0) this.ensureVisible(a.x, a.y);
          for (const u of us) { u.vis = { ...a }; u.chuteAnim = 1; }
          await this.tween(1.3, (k) => { for (const [i, u] of us.entries()) { const d = ev.drops[i], q = center(d.c, d.r); const kk = Math.min(1, k * 1.15); u.vis = { x: a.x + (q.x - a.x) * kk, y: a.y + (q.y - a.y) * kk }; u.chuteAnim = 1 - kk * 0.65; } });
          for (const u of us) { u.vis = null; u.chuteAnim = null; }
          if (apc.owner === 0) this.r.float(a.x, a.y - 40, `${us.length}× Fallschirm`, '#cfe8ff', true);
        }
        this.showCash(ev.cash);
      } else if (ev.type === 'landed') {
        const u = g.get(ev.u); if (u && u.owner === 0) { const p = center(u.c, u.r); this.fx.dust(p.x, p.y, 5, '150,140,110', 14, 4); }
        this.showCash(ev.cash);
      } else if (ev.type === 'crate') {
        const b = g.get(ev.b), u = g.get(ev.u);
        if (b && (b.owner === 0 || g.seen(b))) { const p = center(b.c, b.r), a = u ? this.r.posOf(u) : p; b.rise = 0; await this.tween(0.6, (k) => { b.rise = k; }); this.fx.dust(p.x, p.y, 10, '140,130,100', 22, 6); this.r.float(p.x, p.y - 30, 'Versorgungskiste', '#9cf58e', true); }
        this.showCash(ev.cash);
      } else if (ev.type === 'crateempty') {
        const b = g.byId.get(ev.b); if (b) b.gone = true;
      } else if (ev.type === 'takeover') {
        const b = g.get(ev.b); if (b && (b.owner === 0 || ev.from === 0 || g.seen(b))) { const p = center(b.c, b.r); this.fx.ring(p.x, p.y, 20, '200,140,255', 0.7); this.r.float(p.x, p.y - 34, `${b.def.name} übernommen`, g.players[b.owner].color, true); }
        this.showCash(ev.cash);
      } else if (ev.type === 'mine') {
        const p = center(ev.c, ev.r);
        this.fx.flash(p.x, p.y, 70, '255,200,140', 0.3); this.fx.shake = 5; this.fx.dust(p.x, p.y, 20, '110,95,70', 40, 9); this.fx.smoke(p.x, p.y, 6, 9, 1.4); this.fx.spark(p.x, p.y, 14, '255,210,140', 140);
        this.r.float(p.x, p.y - 34, ev.kind === 'inf' ? 'Claymore!' : 'Panzermine!', '#ff9a6a', true);
        const u = g.byId.get(ev.u); if (u) this.hitFlash(u);
        this.showCash(ev.cash); await this.wait(0.4);
      } else if (ev.type === 'fire') {
        const p = center(ev.c, ev.r), u = g.get(ev.u);
        if (u && (u.owner === 0 || g.seen(u) || g.visible[g.i(ev.c, ev.r)])) {
          const a = this.r.posOf(u);
          await this.tween(0.45, (k) => { if (Math.random() < 0.7) this.fx.add({ kind: 'glow', x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k - Math.sin(k * 3.14) * 40, life: 0.25, size: 2, grow: 1, col: '255,170,80', a: 0.9 }); });
          for (let k = 0; k < 18; k++) this.fx.add({ kind: 'glow', x: p.x + (Math.random() - 0.5) * 36, y: p.y + (Math.random() - 0.5) * 26, vy: -30, life: 0.9 + Math.random() * 0.6, size: 4, grow: 6, col: '255,140,50', a: 0.8 });
          this.fx.smoke(p.x, p.y, 4, 8, 1.6);
          for (const h of ev.hits) { const t = g.byId.get(h.id); if (t) this.hitFlash(t); }
        }
        this.showCash(ev.cash); g.cleanup();
      } else if (ev.type === 'smoke') {
        const p = center(ev.c, ev.r); if (g.visible[g.i(ev.c, ev.r)] || ev.u && g.get(ev.u)?.owner === 0) { for (let k = 0; k < 4; k++) { this.fx.smoke(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 20, 3, 14, 2.2); await this.wait(0.05); } this.r.float(p.x, p.y - 30, 'Rauch', '#dcdcd0'); }
      } else if (ev.type === 'mark') {
        const t = g.get(ev.t), u = g.get(ev.u); if (t && u && u.owner === 0) { const p = this.r.posOf(t); this.fx.ring(p.x, p.y, 16, '255,90,60', 0.6); this.r.float(p.x, p.y - 30, 'Markiert +20 %', '#ff8a6a', true); }
      } else if (ev.type === 'minelaid') {
        const u = g.get(ev.u); if (u && u.owner === 0) { const p = center(ev.c, ev.r); this.fx.dust(p.x, p.y, 4, '120,100,80', 10, 3); this.r.float(p.x, p.y - 20, 'Mine gelegt', '#ffd36a'); }
      } else if (ev.type === 'rearm') {
        const u = g.get(ev.u); if (u && u.owner === 0) { const p = this.r.posOf(u); this.r.float(p.x, p.y - 26, 'Aufmunitioniert', '#a0e0ff'); }
      }
    }
    g.cleanup();
  }

  // Turmcode: die Hot Zone springt
  async animCode(ev) {
    const g = this.g, a = center(ev.from.c, ev.from.r), b = center(ev.to.c, ev.to.r), col = g.players[ev.owner].color;
    this.r.centerOn((a.x + b.x) / 2, (a.y + b.y) / 2);
    await this.wait(0.3);
    this.fx.flash(b.x, b.y, 120, '255,180,100', 0.4); this.fx.ring(b.x, b.y, 40, '255,170,90', 0.9); this.fx.shake = 6;
    for (let k = 0; k < 24; k++) { const f = k / 24; this.fx.add({ kind: 'glow', x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f - Math.sin(f * 3.14) * 60, life: 0.8, size: 4, grow: 3, col: '255,170,90', a: 0.9 }); }
    this.showCash(ev.cash);
    await this.banner('Turmcode eingegeben', `${g.players[ev.owner].name} zieht die Hot Zone zu Turm ${'ABCD'[ev.tower]}`, 1.1, g.players[ev.owner].faction);
    this.refresh();
  }
  // Wertung am Rundenende
  async animTick(ev) {
    const g = this.g, L = ev.leader;
    this.refresh();
    const heads = ev.heads.map((h, i) => `<span style="color:${g.players[i].color}">${g.players[i].name} ${h.w}</span>`).join(' · ');
    if (L >= 0) {
      const el = document.querySelector(`#score [data-p="${L}"]`); if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
      await this.banner(`${g.players[L].name} +1`, `Wertung · Köpfe in der Zone: ${heads}`, 0.9 / this.aiSpeed, g.players[L].faction);
    } else await this.banner('Keine Wertung', ev.heads.some((h) => h.w > 0) ? `Gleichstand in der Zone: ${heads}` : 'Niemand hält die Control Zone', 0.8 / this.aiSpeed);
  }

  pulse(sel) { const el = $(sel); if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  async banner(text, sub = '', dur = 1.1, crest = null) {
    const el = $('#banner');
    el.innerHTML = `${crest ? `<div class="b-crest">${crestImg(crest, 64)}</div>` : ''}<div class="b-main">${text}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
    el.classList.add('show');
    await this.wait(dur);
    el.classList.remove('show');
    await this.wait(0.2);
  }

  // ---------- Aktionen ----------
  async doMove(u, c, r, reach) {
    const g = this.g;
    const path = g.moveUnit(u, c, r, reach);
    const visible = u.owner === 0 || path.some((h) => g.visible[g.i(h.c, h.r)]);
    if (visible) {
      if (u.owner !== 0) { const p = center(path[0].c, path[0].r); this.ensureVisible(p.x, p.y); }
      await this.animMove(u, path);
    }
    if (u.owner === 0) { g.updateVision(); this.r.fogDirty = true; }
    if (u.mineEv && u.mineEv.type === 'mine') { const ev = u.mineEv; u.mineEv = null; if (visible) await this.playEvents([ev]); else g.cleanup(); this.checkEnd(); if (u.dead) return; }
    if (u.ambushed) {
      const o = g.get(u.ambushed);
      if (o && (u.owner === 0 || o.owner === 0)) { const p = this.r.posOf(o); this.r.float(p.x, p.y - 20, 'Hinterhalt!', '#ffcf6a', true); this.hitFlash(o); await this.wait(0.4); }
    }
    const evs = g.reflexFire(u);
    for (const ev of evs) {
      const a = g.byId.get(ev.att);
      if (a && (g.seen(a) || a.owner === 0 || u.owner === 0)) { const p = this.r.posOf(a); this.r.float(p.x, p.y - 26, 'Reaktionsfeuer', '#ffe08a'); }
      await this.animAttack(ev);
    }
    if (evs.length) { g.cleanup(); this.checkEnd(); }
  }
  async animBoard(apc, t) {
    const g = this.g, a = center(t.c, t.r), b = center(apc.c, apc.r);
    t.vis = { ...a };
    await this.tween(0.45, (k) => { t.vis = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; t.facing = Math.atan2(b.y - a.y, b.x - a.x); });
    g.board(apc, t); t.vis = null;
    this.fx.dust(b.x, b.y, 4, '120,110,90', 14, 4);
  }
  async animUnload(apc, c, r) {
    const g = this.g, ev = g.unload(apc, c, r); if (!ev) return null;
    const t = g.get(ev.t), a = center(apc.c, apc.r), b = center(c, r);
    if (apc.owner === 0 || g.seen(apc)) {
      t.vis = { ...a };
      await this.tween(0.45, (k) => { t.vis = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; t.facing = Math.atan2(b.y - a.y, b.x - a.x); });
      t.vis = null; this.fx.dust(b.x, b.y, 4, '120,110,90', 14, 4);
    }
    this.showCash(ev.cash);
    if (apc.owner === 0) { g.updateVision(); this.r.fogDirty = true; }
    return ev;
  }
  async animLand(u, down) {
    const g = this.g, p = center(u.c, u.r), fx = this.fx;
    if (down) {
      await this.tween(0.8, (k) => { u.z = 26 - 26 * (k * k * (3 - 2 * k)); if (Math.random() < 0.8) fx.dust(p.x + (Math.random() - 0.5) * 34, p.y + (Math.random() - 0.5) * 24, 1, '150,150,120', 20 + k * 20, 7); });
      g.land(u); u.z = undefined; fx.dust(p.x, p.y, 14, '150,150,120', 36, 8);
    } else {
      g.takeoff(u); u.z = 0;
      await this.tween(0.8, (k) => { u.z = 26 * (k * k * (3 - 2 * k)); if (Math.random() < 0.8 * (1 - k)) fx.dust(p.x + (Math.random() - 0.5) * 34, p.y + (Math.random() - 0.5) * 24, 1, '150,150,120', 30, 7); });
      u.z = undefined;
    }
    if (u.owner === 0) { g.updateVision(); this.r.fogDirty = true; }
  }
  async doAttack(u, t) {
    const ev = this.g.attack(u, t);
    await this.animAttack(ev);
    this.g.cleanup();
    if (u.owner === 0 || t.owner === 0) { this.g.updateVision(); this.r.fogDirty = true; }
    this.checkEnd();
  }
  async doAct(ev) { if (!ev) return; await this.playEvents([ev]); this.g.updateVision(); this.r.fogDirty = true; this.refresh(); }

  // ---------- Auswahl ----------
  clearHL() { Object.assign(this.r.hl, { move: null, attack: [], build: [], drop: [], target: [], path: null, sel: null, forecast: null }); this.hideForecast(); }
  deselect() { this.infoSel = null; this.sel = null; this.mode = 'idle'; this.reach = null; this.afterMove.clear(); this.clearHL(); this.showPanel(null); }

  select(e) {
    const g = this.g;
    this.clearHL();
    this.sel = e; this.r.hl.sel = e;
    this.mode = 'idle';
    if (e.isUnit && e.owner === 0 && g.current === 0 && !this.busy && !e.downed) {
      if (!e.moved && !e.acted) {
        this.reach = g.reachable(e);
        this.r.hl.move = this.reach;
        this.mode = 'unit';
        this.computeAfterMove(e);
      } else if (!e.acted) this.mode = 'moved';
      this.r.hl.attack = g.canFire(e) ? g.targetsFrom(e, e.c, e.r) : [];
      if (this.mode === 'unit') for (const [id] of this.afterMove) { const t = g.get(id); if (t && !this.r.hl.attack.includes(t)) this.r.hl.attack.push(t); }
    } else if (e.isBuilding && e.owner === 0 && e.def.weapon && g.canFire(e) && !this.busy && g.current === 0) {
      this.mode = 'turret';
      this.r.hl.attack = g.targetsFrom(e, e.c, e.r);
    }
    this.showPanel(e);
  }
  computeAfterMove(u) {
    const g = this.g; this.afterMove.clear();
    const w = g.weapon(u); if (!w || w.noMoveFire || (w.ammo && u.ammo <= 0)) return;
    for (const n of this.reach.values()) {
      if (!n.end) continue;
      for (const t of g.targetsFrom(u, n.c, n.r)) {
        const prev = this.afterMove.get(t.id);
        const score = -n.cost + TERRAIN[g.terr(n.c, n.r)].def * 5;
        if (!prev || score > prev.score) this.afterMove.set(t.id, { c: n.c, r: n.r, score });
      }
    }
  }

  async handleTap(sx, sy) {
    const g = this.g;
    if (this.busy) return;
    const w = this.r.s2w(sx, sy);
    const { col: c, row: r } = pixelToHex(w.x, w.y);
    if (!g.in(c, r)) { this.deselect(); return; }
    const i = g.i(c, r);
    const vis = g.visible[i];
    const ug = g.unitAt(c, r, false), ua = g.unitAt(c, r, true), b = g.buildingAt(c, r);
    const enemyAt = [ua, ug, b].filter((e) => e && e.owner !== 0 && (e.isBuilding ? g.seen(e) : vis && !g.stealthed(e, 0)));
    const ownAt = [ug, ua, b].filter((e) => e && e.owner === 0);

    if (this.mode === 'build') {
      if (this.r.hl.build.some(([bc, br]) => bc === c && br === r)) {
        this.busy = true; const u = this.sel;
        const ev = g.placeStructure(u, this.buildType, c, r);
        this.clearHL(); await this.doAct(ev); this.busy = false;
        this.deselect(); this.refresh(); return;
      }
      this.mode = 'moved'; this.select(this.sel); return;
    }
    if (['fob', 'hammer', 'repair', 'revive', 'heal', 'hackfob', 'board', 'unload', 'c4', 'molotow', 'smoke', 'mark', 'mine', 'crate', 'takeover'].includes(this.mode)) {
      const hit = this.r.hl.target.some(([tc, tr]) => tc === c && tr === r);
      const m = this.mode, u = this.sel; this.clearHL(); this.mode = 'idle';
      if (!hit) { this.select(u); return; }
      this.busy = true;
      if (m === 'fob') await this.doAct(g.deployFob(u, c, r));
      else if (m === 'hammer') { const t = g.hammerTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.hammer(u, t)); }
      else if (m === 'repair') { const t = g.repairTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.repair(u, t)); }
      else if (m === 'revive') { const t = g.reviveTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.revive(u, t)); }
      else if (m === 'heal') { const t = g.healTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.heal(u, t)); }
      else if (m === 'c4') { const t = g.c4Targets(u).find((x) => x.c === c && x.r === r); if (t) { const ev = g.c4(u, t); await this.animAttack(ev); g.cleanup(); this.checkEnd(); } }
      else if (m === 'molotow') await this.doAct(g.molotow(u, c, r));
      else if (m === 'smoke') await this.doAct(g.smokeAt(u, c, r));
      else if (m === 'mark') { const t = g.markTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.mark(u, t)); if (!u.acted) { this.busy = false; this.select(u); this.refresh(); return; } }
      else if (m === 'mine') await this.doAct(g.placeMine(u, this.mineKind, c, r));
      else if (m === 'crate') { await this.doAct(g.dropCrate(u, c, r)); }
      else if (m === 'takeover') { const t = g.takeoverTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.takeover(u, t)); }
      else if (m === 'hackfob') { const t = g.hackFobTargets(u).find((x) => x.c === c && x.r === r); if (t) await this.doAct(g.hackFob(u, t)); }
      else if (m === 'board') { const t = g.units.find((x) => !x.dead && !x.carried && x.c === c && x.r === r && g.canBoard(u, x)); if (t) await this.animBoard(u, t); }
      else if (m === 'unload') {
        await this.animUnload(u, c, r);
        if ((u.passengers || []).length && g.unloadHexes(u).length) { this.busy = false; this.select(u); this.refresh(); return; }
        const t = g.units.find((x) => !x.dead && x.c === c && x.r === r && !x.carried && x.def.mt !== 'air');
        if (t && g.canFire(t) && g.targetsFrom(t, t.c, t.r).length) { this.busy = false; this.select(t); this.mode = 'moved'; this.refresh(); return; }
      }
      this.busy = false; this.deselect(); this.refresh(); return;
    }

    const sel = this.sel;
    if (sel && (this.mode === 'unit' || this.mode === 'moved' || this.mode === 'turret' || this.mode === 'confirm') && enemyAt.length) {
      const t = enemyAt.find((e) => this.r.hl.attack.includes(e));
      if (t) {
        if (this.mode === 'confirm' && this.confirmTarget === t) { await this.executeAttack(); return; }
        this.prepareAttack(t); return;
      }
    }
    if (this.mode === 'confirm') { this.mode = this.prevMode; this.select(this.sel); if (!enemyAt.length && !ownAt.length) return; }
    // Infanterie gewählt, eigenes Fahrzeug angetippt: einsteigen (vorher daneben laufen, wenn nötig)
    if (sel && g.isFootInf(sel) && !sel.acted && (this.mode === 'unit' || this.mode === 'moved')) {
      const apc = ownAt.find((a) => a !== sel && a.def.transport && (a.passengers || []).length < a.def.transport && !(a.cargoP || []).length);
      if (apc) {
        if (g.canBoard(apc, sel)) { this.busy = true; await this.animBoard(apc, sel); this.busy = false; this.deselect(); this.refresh(); return; }
        if (this.mode === 'unit' && this.reach && (UNITS[apc.type].mt !== 'air' || apc.landed)) {
          let best = null; for (const n of this.reach.values()) if (n.end && distance(n.c, n.r, apc.c, apc.r) === 1 && !g.unitAt(n.c, n.r, false) && (!best || n.cost < best.cost)) best = n;
          if (best) { const u = sel; await this.moveSelected(best.c, best.r); if (!u.dead && g.canBoard(apc, u)) { this.busy = true; await this.animBoard(apc, u); this.busy = false; this.deselect(); this.refresh(); } return; }
        }
        if (UNITS[apc.type].mt === 'air' && !apc.landed) { this.flash('Der Hubschrauber muss erst landen'); return; }
      }
    }
    if (sel && this.mode === 'unit' && !ownAt.includes(sel)) {
      const n = this.reach.get(i);
      if (n && n.end && !(enemyAt.length)) { await this.moveSelected(c, r); return; }
      // Ziel außer Reichweite: Marschziel setzen (läuft auch in den nächsten Runden weiter)
      if (!n && !enemyAt.length && !ownAt.length && sel.isUnit && !sel.moved && g.cost(sel.def.mt === 'air' ? 'air' : sel.def.mt, c, r) !== Infinity && distance(sel.c, sel.r, c, r) > 1) {
        const u = sel; u.rally = { c, r }; u.auto = null;
        this.deselect(); this.flash(`${u.def.name}: Marschziel gesetzt`);
        await this.rallyStep([u]);
        if (!u.dead && !u.acted && this.hasAction(u)) { this.select(u); this.mode = 'moved'; }
        return;
      }
    }
    if (ownAt.length) {
      const idx = ownAt.indexOf(sel);
      const next = idx >= 0 ? ownAt[(idx + 1) % ownAt.length] : ownAt[0];
      if (next === sel && ownAt.length === 1) { this.deselect(); return; }
      this.select(next); return;
    }
    if (enemyAt.length) { this.select(enemyAt[0]); return; }
    if (b && b.type === 'hq') { this.select(b); return; }
    this.deselect();
    this.showTerrainInfo(c, r);
  }

  // Hat die Einheit nach dem Ziehen noch etwas Sinnvolles zu tun?
  hasAction(u) {
    const g = this.g;
    if (u.acted) return false;
    if (g.canFire(u) && g.targetsFrom(u, u.c, u.r).length) return true;
    if (u.def.builder && (g.canDeployFob(u) && g.fobHexes(u).length || BUILD_LIST.some((t) => g.canBuild(u, t)) || g.hammerTargets(u).length || g.repairTargets(u).length)) return true;
    if (u.def.medic && (g.reviveTargets(u).length || g.healTargets(u).length)) return true;
    if (g.canHack(u) || g.canEnterCode(u) || g.canHackFob(u)) return true;
    if ((u.passengers || []).length && g.unloadHexes(u).length) return true;
    if (g.canDropPallets(u) || g.canLoadPallet(u) || g.canDropCrate(u)) return true;
    if (g.isFootInf(u) && g.units.some((a) => g.canBoard(a, u))) return true;
    if (u.def.transport && g.units.some((t) => g.canBoard(u, t))) return true;
    if (g.canMark(u) || g.takeoverTargets(u).length || g.canParadrop(u) || g.canLand(u)) return true;
    if (u.gearUses && !u.attacked && ['c4', 'molotow', 'rauch'].some((k) => g.gearLeft(u, k) > 0 && (k !== 'c4' || g.c4Targets(u).length))) return true;
    if (u.def.transport && g.units.some((t) => g.canBoard(u, t))) return true;
    if (g.canLand(u)) return true;
    return false;
  }
  async moveSelected(c, r) {
    const g = this.g, u = this.sel; u.rally = null; if (u.auto) { u.auto = null; this.flash('Auftrag beendet (manuell bewegt)'); }
    this.busy = true; this.clearHL(); this.r.hl.sel = u;
    await this.doMove(u, c, r, this.reach);
    this.busy = false;
    this.refresh();
    if (u.dead || u.downed) { this.deselect(); return; }
    if (!this.hasAction(u)) { u.acted = true; this.deselect(); this.refresh(); return; }
    this.mode = 'moved';
    this.select(u);
  }
  prepareAttack(t) {
    const g = this.g, u = this.sel;
    this.prevMode = this.mode === 'confirm' ? this.prevMode : this.mode;
    this.confirmTarget = t;
    let from = { c: u.c, r: u.r };
    if (this.mode === 'unit' && !g.targetsFrom(u, u.c, u.r).includes(t)) {
      const m = this.afterMove.get(t.id); if (!m) return;
      from = m;
      this.r.hl.path = g.pathFrom(this.reach, m.c, m.r);
    } else this.r.hl.path = null;
    this.attackFrom = from;
    this.mode = 'confirm';
    const f = this.forecastFrom(u, t, from);
    this.showForecast(t, f);
  }
  forecastFrom(u, t, from) {
    const g = this.g;
    const oc = u.c, or = u.r;
    u.c = from.c; u.r = from.r;
    const f = g.forecast(u, t);
    u.c = oc; u.r = or;
    return f;
  }
  async executeAttack() {
    const g = this.g, u = this.sel, t = this.confirmTarget, from = this.attackFrom;
    if (u.isUnit && (from.c !== u.c || from.r !== u.r)) u.rally = null;
    this.busy = true; this.hideForecast(); this.clearHL();
    if (u.isUnit && (from.c !== u.c || from.r !== u.r)) await this.doMove(u, from.c, from.r, this.reach);
    if (!u.dead && !t.dead) await this.doAttack(u, t);
    this.busy = false;
    this.deselect(); this.refresh();
  }

  // ---------- Rundenablauf: rotierende Zugfolge, Wertung am Rundenende ----------
  async aiPhase(f) {
    const g = this.g, p = g.players[f];
    const sp = this.speed; this.speed = sp * this.aiSpeed;
    try {
      await this.banner(p.name, 'ist am Zug', 0.8 / this.aiSpeed, p.faction);
      g.current = f;
      await this.playEvents(g.beginTurn(f));
      await aiTurn(g, this.actAnimated, f);
      await this.playEvents(g.endTurnEvents(f));
    } finally { this.speed = sp; }
    g.updateVision(); this.r.fogDirty = true; this.refresh();
  }
  async endTurn() {
    const g = this.g;
    if (this.busy || g.current !== 0 || g.state !== 'play') return;
    this.busy = true; this.deselect();
    $('#endturn').disabled = true;
    await this.autoPhase();
    if (this.checkEnd()) return;
    await this.playEvents(g.endTurnEvents(0));
    let order = g.orderFor(g.round), idx = order.indexOf(0);
    for (const f of order.slice(idx + 1)) { await this.aiPhase(f); if (this.checkEnd()) return; }
    // Weltphase
    const sp = this.speed; this.speed = sp * this.aiSpeed;
    await this.playEvents(g.worldPhase());
    this.speed = sp;
    g.updateVision(); this.r.fogDirty = true; this.refresh();
    if (this.checkEnd()) return;
    order = g.orderFor(g.round); idx = order.indexOf(0);
    for (const f of order.slice(0, idx)) { await this.aiPhase(f); if (this.checkEnd()) return; }
    g.current = 0;
    await this.playEvents(g.beginTurn(0));
    g.updateVision(); this.r.fogDirty = true;
    this.refresh();
    const pos = g.orderFor(g.round).indexOf(0) + 1;
    await this.banner(`Runde ${g.round}`, `Euer Zug (${pos}. von 3)${g.weather === 'regen' ? ' · Regen: Sicht −1' : ''}`, 0.9, g.players[0].faction);
    if (this.rallyUnits().some((u) => u.rally)) { this.busy = false; await this.rallyStep(); }
    this.busy = false;
    $('#endturn').disabled = false;
    this.refresh();
    this.save();
  }

  // Automatik am Rundenende: Aufträge der Fahrzeuge, untätige Pioniere hämmern, Sanitäter versorgen
  async autoPhase() {
    const g = this.g, sp = this.speed; this.speed = sp * Math.max(2, this.aiSpeed);
    const act = this.actAnimated;
    try {
      for (const u of g.ownUnits(0)) {
        if (u.dead || u.carried || u.downed || u.acted || u.moved || u.fresh || !u.auto || g.state !== 'play') continue;
        await autoTurn(g, act, u);
        if (!u.dead) u.acted = true;
      }
      if (g.settings?.auto !== 'aus') {
        for (const u of g.ownUnits(0)) {
          if (u.dead || u.carried || u.downed || u.acted || u.attacked || g.state !== 'play') continue;
          if (u.def.medic) {
            const rv = g.reviveTargets(u)[0]; if (rv) { await this.doAct(g.revive(u, rv)); continue; }
            const hl = g.healTargets(u).sort((a, b) => a.hp - b.hp)[0]; if (hl && hl.hp < 75) { await this.doAct(g.heal(u, hl)); continue; }
          }
          if (u.def.builder) { const h = g.hammerTargets(u)[0]; if (h) { await this.doAct(g.hammer(u, h)); continue; } }
        }
      }
    } catch (e) { console.warn('Automatik-Fehler', e); }
    this.speed = sp;
    this.refresh();
  }

  save() { try { localStorage.setItem('hundemarke-save', this.g.serialize()); } catch (e) { /* Speicher voll oder gesperrt */ } }

  checkEnd() {
    const g = this.g, s = g.checkEnd();
    if (s === 'play') return false;
    this.busy = true;
    const el = $('#endscreen'), p = g.players[0];
    const win = g.players.find((x) => x.score >= g.target);
    el.querySelector('h1').textContent = s === 'won' ? 'Die Zone gehört euch' : `${win.name} hält die Zone`;
    const res = this.onEnd ? this.onEnd(s) : null;
    el.querySelector('.stats').innerHTML = `<div class="es-score">${g.players.map((x) => `<span style="color:${x.color}">${crestImg(x.faction, 26)} ${x.name} ${x.score}</span>`).join('')}</div>
      Runde ${g.round} · Abschüsse: ${p.stats.kills} · Verluste: ${p.stats.lost} · Wiederbelebt: ${p.stats.revives}<br>Verdient: ${money(p.stats.earned)} · Ausgegeben: ${money(p.stats.spent)}${res ? `<br><b>${res}</b>` : ''}`;
    el.classList.add('show');
    try { localStorage.removeItem('hundemarke-save'); } catch (e) {}
    return true;
  }

  showGameMenu() {
    const g = this.g, el = $('#saves');
    const crests = (m) => m.factions.map((f, i) => `<span style="opacity:${m.out && m.out[i] ? 0.3 : 1}">${crestImg(f, 22)}</span>`).join('');
    let html = `<div class="box"><button class="close">×</button><h2>Spielmenü</h2>
      <div class="si" style="margin-bottom:10px">${g.players.map((p) => `<span style="opacity:${p.out ? 0.35 : 1};margin-right:10px">${crestImg(p.faction, 22)} ${p.name}${p.out ? ' (ausgeschieden)' : ''}</span>`).join('')}</div>
      <div class="m-label">Speichern</div>`;
    for (let k = 1; k <= SLOTS; k++) {
      const m = slotMeta(k);
      html += `<div class="slot"><span class="sn">${k}</span><div>${m ? `<div class="crs">${crests(m)}</div><div class="si">Runde ${m.round} · Karte ${m.size} · ${m.date}</div>` : '<div class="si">Leer</div>'}</div>
        <div class="sb"><button class="primary" data-save="${k}" ${this.busy || g.current !== 0 ? 'disabled' : ''}>${m ? 'Überschreiben' : 'Speichern'}</button>${m ? `<button data-load="${k}">Laden</button>` : ''}</div></div>`;
    }
    html += `<div class="row"><button data-a="menu">Hauptmenü</button><button class="primary" data-a="back">Weiterspielen</button></div></div>`;
    el.innerHTML = html; el.classList.add('show');
    const close = () => el.classList.remove('show');
    el.querySelector('.close').onclick = close; el.querySelector('[data-a="back"]').onclick = close;
    el.querySelector('[data-a="menu"]').onclick = () => { this.save(); location.reload(); };
    el.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => {
      if (writeSlot(+b.dataset.save, g)) { this.flash(`Gespeichert in Platz ${b.dataset.save}`); this.showGameMenu(); }
      else this.flash('Speichern fehlgeschlagen (Speicher voll?)');
    });
    el.querySelectorAll('[data-load]').forEach((b) => b.onclick = () => { try { sessionStorage.setItem('hundemarke-load-slot', b.dataset.load); } catch {} location.reload(); });
  }

  waiting(u) { return (u.waitUntil || 0) >= this.g.round; }
  skipUnit(u) { return u.dead || u.carried || u.downed || this.waiting(u) || !!u.auto || u.fresh; }
  idleUnits() { return this.g.ownUnits(0).filter((u) => !this.skipUnit(u) && !u.moved && !u.acted); }
  requestEndTurn() {
    const g = this.g;
    if (this.busy || g.current !== 0 || g.state !== 'play') return;
    const idle = this.idleUnits();
    if (!idle.length) { this.endTurn(); return; }
    let box = document.getElementById('confirmbox');
    if (!box) { box = document.createElement('div'); box.id = 'confirmbox'; document.getElementById('app').appendChild(box); }
    box.innerHTML = `<div class="cb-card"><div class="cb-title">Noch ${idle.length} ${idle.length === 1 ? 'Einheit' : 'Einheiten'} nicht bewegt</div>
      <div class="cb-text">Trotzdem die Runde beenden?</div>
      <div class="cb-btns"><button data-a="show">Zur Einheit</button><button class="primary" data-a="end">Runde beenden</button></div></div>`;
    box.classList.add('show');
    const close = () => box.classList.remove('show');
    box.querySelector('[data-a="show"]').onclick = () => { close(); const u = idle[0]; this.select(u); const p = center(u.c, u.r); this.r.centerOn(p.x, p.y); };
    box.querySelector('[data-a="end"]').onclick = () => { close(); this.endTurn(); };
    box.onclick = (e) => { if (e.target === box) close(); };
  }
  nextUnit() {
    const g = this.g;
    const list = g.ownUnits(0).filter((u) => !u.acted && !this.skipUnit(u) && (!u.moved || g.canFire(u)));
    if (!list.length) { this.flash('Alle Einheiten haben gehandelt'); return; }
    const idx = list.indexOf(this.sel);
    const u = list[(idx + 1) % list.length];
    this.select(u);
    const p = center(u.c, u.r); this.r.centerOn(p.x, p.y);
  }
  bindInput() {
    const cv = this.r.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, t: performance.now(), button: e.button });
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { this.hover(e.offsetX, e.offsetY); return; }
      const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      p.x = e.offsetX; p.y = e.offsetY;
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.r.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch.d); this.pinch.d = d;
        p.moved = true;
        return;
      }
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) p.moved = true;
      if (p.moved) { this.r.camTarget = null; this.r.cam.x -= dx / this.r.cam.z; this.r.cam.y -= dy / this.r.cam.z; this.r.clampCam(); }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!p.moved && performance.now() - p.t < 600 && this.pointers.size === 0) {
        if (p.button === 2) { this.deselect(); return; }
        this.handleTap(e.offsetX, e.offsetY);
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.pinch = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.r.camTarget = null; this.r.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') { this.toggleTacmap(); return; }
      if (e.key === 'Escape' && this.tmOpen) { this.toggleTacmap(false); return; }
      if (e.key === 'Escape') this.deselect();
      else if (e.key === 'e' || e.key === 'E') this.requestEndTurn();
      else if (e.key === 'n' || e.key === 'N' || e.key === 'Tab') { e.preventDefault(); this.nextUnit(); }
      else if (e.key === ' ' && this.mode === 'confirm') { e.preventDefault(); this.executeAttack(); }
      const k = 40 / this.r.cam.z;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.r.cam.x -= k;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.r.cam.x += k;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.r.cam.y -= k;
      if (['ArrowDown', 's', 'S'].includes(e.key)) this.r.cam.y += k;
      this.r.clampCam();
    });
    window.addEventListener('resize', () => this.r.resize());
  }
  hover(sx, sy) {
    const g = this.g;
    const w = this.r.s2w(sx, sy);
    const { col: c, row: r } = pixelToHex(w.x, w.y);
    if (!g.in(c, r)) { this.r.hl.hover = null; return; }
    this.r.hl.hover = { c, r };
    if (this.mode === 'unit' && this.sel && !this.busy) {
      const n = this.reach.get(g.i(c, r));
      this.r.hl.path = n && n.end ? g.pathFrom(this.reach, c, r) : null;
    }
  }

  // ---------- DOM ----------
  bindDom() {
    $('#endturn').onclick = () => this.requestEndTurn();
    $('#nextunit').onclick = () => this.nextUnit();
    $('#gamemenu').onclick = () => this.showGameMenu();
    $('#mycrest').innerHTML = crestImg(this.g.players[0].faction, 22);
    $('#helpbtn').onclick = () => $('#help').classList.toggle('show');
    $('#speedbtn').onclick = () => { this.aiSpeed = this.aiSpeed === 1 ? 2.5 : 1; $('#speedbtn').classList.toggle('on', this.aiSpeed > 1); $('#speedbtn').textContent = this.aiSpeed > 1 ? '⏩ 2,5×' : '⏩ 1×'; };
    $('#help').onclick = (e) => { if (e.target.id === 'help' || e.target.classList.contains('close')) $('#help').classList.remove('show'); };
    $('#zoomin').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1.2);
    $('#zoomout').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1 / 1.2);
    $('#fc-ok').onclick = () => this.executeAttack();
    $('#fc-no').onclick = () => { this.mode = this.prevMode; this.select(this.sel); };
    $('#hqbtn').onclick = () => { const hq = this.g.hqOf(0); if (hq) { this.select(hq); const p = center(hq.c, hq.r); this.r.centerOn(p.x, p.y); } };
    $('#zonebtn').onclick = () => { const p = center(this.g.hz.c, this.g.hz.r); this.r.centerOn(p.x, p.y); };
    $('#mapbtn').onclick = () => this.toggleTacmap();
    $('#xpbtn').onclick = () => { const p = $('#xppanel'); if (p.classList.contains('hidden')) this.showXpPanel(); else p.classList.add('hidden'); };
    $('#tacmap .tm-close').onclick = () => this.toggleTacmap(false);
    $('#tacmap canvas').addEventListener('pointerdown', (e) => {
      const tm = this.tm; if (!tm) return;
      const rect = e.target.getBoundingClientRect();
      const x = (e.clientX - rect.left - tm.ox) / tm.k, y = (e.clientY - rect.top - tm.oy) / tm.k;
      this.toggleTacmap(false); this.r.centerOn(x, y, false);
    });
    const mm = $('#minimap');
    const mmGo = (e) => {
      const rect = mm.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * this.g.map.size.w, y = (e.clientY - rect.top) / rect.height * this.g.map.size.h;
      this.r.centerOn(x, y, false);
    };
    mm.addEventListener('pointerdown', (e) => { mmGo(e); mm.setPointerCapture(e.pointerId); mm.onpointermove = mmGo; });
    mm.addEventListener('pointerup', () => { mm.onpointermove = null; });
  }

  // ---------- Erfahrung: Anzeige im Einsatz ----------
  liveLevels() { const g = this.g; return Object.fromEntries(TRACK_KEYS.map((t) => { const x = (g.baseXp?.[t] || 0) + (g.xp[t] || 0); return [t, { x, L: levelOf(x), gain: g.xp[t] || 0 }]; })); }
  drainXp() {
    const q = this.g.xpQueue.splice(0), box = $('#xptoasts'); if (!box) return;
    // gleiche Spur zusammenfassen
    const sum = {}; for (const e of q) { sum[e.track] = sum[e.track] || { n: 0, up: 0 }; sum[e.track].n += e.n; sum[e.track].up = Math.max(sum[e.track].up, e.up); }
    for (const [t, v] of Object.entries(sum)) {
      const el = document.createElement('div'); el.className = 'xpt' + (v.up ? ' up' : '');
      el.innerHTML = v.up ? `<b>${TRACKS[t].icon} ${TRACKS[t].name}: Stufe ${v.up}!</b><span>+${v.n} XP · neue Teile nach dem Einsatz in der Waffenkammer</span>` : `${TRACKS[t].icon} +${v.n} XP <i>${TRACKS[t].name}</i>`;
      box.appendChild(el); setTimeout(() => el.classList.add('out'), v.up ? 4200 : 1900); setTimeout(() => el.remove(), v.up ? 4800 : 2500);
      while (box.children.length > 5) box.firstChild.remove();
    }
    this.refreshXp(true);
  }
  refreshXp(pulse) {
    const lv = this.liveLevels(), el = $('#xplvl'); if (!el) return;
    el.textContent = `★ ${TRACK_KEYS.reduce((a, t) => a + lv[t].L, 0)}`;
    if (pulse) { const b = $('#xpbtn'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
    if (!$('#xppanel').classList.contains('hidden')) this.showXpPanel();
  }
  showXpPanel() {
    const lv = this.liveLevels(), p = $('#xppanel');
    const how = { assault: 'Kämpfen, Abschüsse, Hacken, Code, Zone halten', medic: 'Wiederbeleben, Verbinden, Rauch', recon: 'Markieren, Assists, Späher-Abschüsse', support: 'Bauen, Hämmern, Reparieren, FOB, Artillerie', driver: 'Fahren, Transport, Paletten, Pendelfahrten', pilot: 'Fliegen, Absetzen, Fallschirm, Lieferungen' };
    p.innerHTML = `<div class="xp-head"><b>Erfahrung</b><button class="xp-x">×</button></div>
      ${TRACK_KEYS.map((t) => { const v = lv[t], a = xpForLevel(v.L), b = xpForLevel(v.L + 1), pc = Math.round((v.x - a) / (b - a) * 100); return `<div class="xp-row"><div class="xp-top"><span>${TRACKS[t].icon} <b>${TRACKS[t].name}</b> · Stufe ${v.L}</span><em>${v.gain ? `+${v.gain} heute` : ''}</em></div><div class="xp-bar"><u style="width:${pc}%"></u></div><div class="xp-how">${how[t]} · noch ${b - v.x} XP bis Stufe ${v.L + 1}</div></div>`; }).join('')}
      <div class="xp-note">XP sammelt jede eigene Einheit in ihrer Spur. Nach dem Einsatz landen sie auf dem Konto (Sieg ×1,25); neue Waffen, Ausrüstung und Fahrzeuge schaltet ihr dann im Hauptmenü unter <b>Waffenkammer</b> frei.</div>`;
    p.classList.remove('hidden');
    p.querySelector('.xp-x').onclick = () => p.classList.add('hidden');
  }

  // ---------- Taktikkarte im Wardogs-Stil ----------
  toggleTacmap(on = !this.tmOpen) {
    this.tmOpen = on; $('#tacmap').classList.toggle('hidden', !on);
    if (on) { this.tmGrey = null; this.drawTacmap(); }
  }
  drawTacmap() {
    const g = this.g, cv = $('#tacmap canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const ms = g.map.size, k = Math.min(W / ms.w, H / ms.h), ox = (W - ms.w * k) / 2, oy = (H - ms.h * k) / 2;
    this.tm = { k, ox, oy };
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#0d0f0d'; ctx.fillRect(0, 0, W, H);
    if (!this.tmGrey) { // Graustufen-Grundkarte einmal erzeugen
      const c2 = document.createElement('canvas'); c2.width = Math.round(ms.w * k * dpr); c2.height = Math.round(ms.h * k * dpr);
      const x2 = c2.getContext('2d'); x2.filter = 'grayscale(1) contrast(1.15) brightness(0.8)'; x2.drawImage(g.map.base, 0, 0, c2.width, c2.height);
      this.tmGrey = c2;
    }
    ctx.drawImage(this.tmGrey, ox, oy, ms.w * k, ms.h * k);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k);
    // Nebel: unerforschtes abdunkeln
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) if (!g.explored[g.i(c, r)]) { const p = center(c, r); ctx.fillRect(p.x - 34, p.y - 30, 68, 60); }
    // Kamera-Rahmen
    const cam = this.r.cam; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2 / k; ctx.strokeRect(cam.x, cam.y, this.r.vw / cam.z, this.r.vh / cam.z);
    drawSymbolLayer(ctx, g, Math.max(1, 1.5 / k), this.r.t, { labels: true, posOf: (u) => this.r.posOf(u) });
    ctx.restore();
  }

  refresh() {
    const g = this.g, p = g.players[0];
    this.refreshXp(false);
    $('#round').textContent = g.round;
    const tz = $('#daytime'); if (tz) { tz.textContent = g.weather === 'regen' ? `Regen (${g.weatherT || 1})` : 'Klar'; tz.parentElement.classList.toggle('night', g.weather === 'regen'); }
    $('#credits').textContent = money(p.credits);
    g.updateHeads();
    const lead = g.leader();
    const ct = g.coalition ?? -1;
    $('#score').innerHTML = g.players.map((x) => `<div class="sc ${lead === x.id ? 'lead' : ''} ${ct === x.id ? 'hunted' : ''}" data-p="${x.id}" style="--c:${x.color}" title="${ct === x.id ? 'Führt klar — die anderen verbünden sich gegen ' + x.name : ''}">${ct === x.id ? '<em class="hunt">⚔</em>' : ''}${crestImg(x.faction, 18)}<b>${x.score}</b><i style="width:${Math.min(100, x.score / g.target * 100)}%"></i><span title="Köpfe in der Zone (Hot Zone zählt doppelt)">◉${x.heads.w}</span></div>`).join('') + `<div class="sc-t">Ziel ${g.target}</div>`;
    const code = g.codeFor(0);
    $('#code').innerHTML = `<span class="lbl">Turmcode</span><b>${code.map((d, i) => `<em class="${d === null ? 'unk' : ''}">${'ABCD'[i]}${d === null ? '?' : d}</em>`).join('')}</b><span class="cu">${CODE_USES - g.codeUses}×</span>`;
    const ctl = $('#control'); if (ctl) { ctl.textContent = lead >= 0 ? `KONTROLLE: ${g.players[lead].name.toUpperCase()}` : 'KONTROLLE: —'; ctl.style.color = lead >= 0 ? g.players[lead].color : '#cfd6c8'; }
    const left = this.idleUnits().length;
    $('#nextunit').textContent = left ? `Nächste Einheit (${left})` : 'Nächste Einheit';
    if (this.sel && !this.sel.dead) this.showPanel(this.sel, true);
  }

  flash(text) { this.g.say(text, 'info'); }
  updateLog() {
    const el = $('#log');
    const now = performance.now();
    const mob = window.innerWidth < 760, life = mob ? 4500 : 6000;
    const items = this.g.log.filter((m) => now - m.t < life).slice(mob ? -2 : -4);
    const html = items.map((m) => `<div class="msg ${m.kind}" style="opacity:${Math.min(1, (life - (now - m.t)) / 1000) * 0.92}">${m.text}</div>`).join('');
    if (html !== this._logHtml) { el.innerHTML = html; this._logHtml = html; }
  }

  showForecast(t, f) {
    const el = $('#forecast');
    el.querySelector('.fc-title').textContent = `Angriff auf ${t.def.name}`;
    el.querySelector('.fc-dmg').textContent = f.finish ? 'Erledigen' : f.flare ? '0 % · Täuschkörper' : `${Math.round(f.dmg)} %${f.downs ? ' · verwundet' : f.kills ? ' · zerstört' : ''}${f.miss ? ` · ${Math.round(f.miss * 100)} % Fehlschlag` : ''}`;
    el.querySelector('.fc-ctr').textContent = f.kills || f.downs || f.finish ? '—' : `${Math.round(f.counter)} %`;
    el.classList.add('show');
  }
  hideForecast() { $('#forecast').classList.remove('show'); }

  showTerrainInfo(c, r) {
    const g = this.g;
    const tw = g.towerAt(c, r);
    const zone = g.inHZ(c, r) ? '<div class="p-zone hz">Hot Zone — jeder Kopf zählt doppelt, Aktionen bringen doppeltes Geld</div>' : g.inCZ(c, r) ? '<div class="p-zone cz">Control Zone — Köpfe hier entscheiden die Wertung</div>' : '';
    const nxt = g.hzNextHas(c, r) && !g.inHZ(c, r) ? '<div class="p-zone hz2">Die Hot Zone zieht nächste Runde hierher</div>' : '';
    if (tw) {
      const own = tw.owner >= 0 ? g.players[tw.owner] : null, known = g.known[0].has(tw.i) || g.codeKnown(0);
      $('#panel').innerHTML = `<div class="p-head"><div><div class="p-name">Funkturm ${'ABCD'[tw.i]}</div><div class="p-sub" style="color:${own ? own.color : '#cfd6c8'}">${own ? 'Konsole gehalten von ' + own.name : 'Konsole unbesetzt'}</div></div><button class="x" data-a="close">×</button></div>
        <div class="p-grid"><span>Codeziffer</span><b>${known ? tw.digit : 'unbekannt'}</b><span>Abklingzeit</span><b>${tw.cd > 0 ? tw.cd + ' Runden' : 'bereit'}</b><span>Code-Eingaben übrig</span><b>${CODE_USES - g.codeUses} von ${CODE_USES}</b></div>
        <p class="p-poi"><b>Hacken:</b> Infanterie auf dem Turm, kein Feind daneben — verrät die Ziffer und übernimmt die Konsole.</p>
        <p class="p-poi"><b>Code eingeben:</b> Wer drei der vier Ziffern kennt, kennt den Code. Auf einem eigenen Turm eingegeben, springt die Hot Zone für ${3} Runden hierher.</p>${zone}${this.rallyBtn()}`;
      $('#panel').classList.add('show');
      $('#panel').querySelector('[data-a="close"]')?.addEventListener('click', () => this.showPanel(null));
      this.hookRally(c, r); return;
    }
    const t = TERRAIN[g.terr(c, r)];
    const mc = (mt) => { const v = MOVE_COST[mt][g.terr(c, r)]; return v === Infinity ? '—' : String(v).replace('.', ','); };
    $('#panel').innerHTML = `<div class="p-head"><div><div class="p-name">${t.name}</div><div class="p-sub">Feld ${c}·${r}${g.safeOwner(c, r) >= 0 ? ` · Sichere Zone ${g.players[g.safeOwner(c, r)].name}` : ''}</div></div></div>
      <div class="p-grid"><span>Deckung</span><b>${Math.round(t.def * 100)} %</b>${t.sight ? '<span>Sicht</span><b>+1 für Bodeneinheiten</b>' : ''}
      <span>Kosten Fuß/Rad/Kette</span><b>${mc('foot')}/${mc('wheel')}/${mc('track')}</b></div>${zone}${nxt}${this.rallyBtn()}`;
    $('#panel').classList.add('show');
    this.hookRally(c, r);
  }

  rallyUnits() { return this.g.ownUnits(0).filter((u) => !u.dead && !u.carried && !u.downed); }
  rallyBtn() {
    const g = this.g;
    if (g.current !== 0 || g.state !== 'play' || !this.rallyUnits().length) return '';
    return '<button class="primary wide" data-a="rally">⚑ Alle Einheiten hierher</button><div class="pi-why" style="color:#cfd6c8">Sie marschieren auch in den nächsten Runden weiter, bis sie da sind oder ihr sie selbst bewegt.</div>';
  }
  hookRally(c, r) {
    const b = $('#panel').querySelector('[data-a="rally"]'); if (!b) return;
    b.onclick = async () => { if (this.busy) return; await this.rallyTo(c, r); };
  }
  async rallyTo(c, r) {
    const us = this.rallyUnits();
    for (const u of us) u.rally = { c, r };
    this.showPanel(null);
    this.flash(`${us.length} Einheiten auf dem Marsch`);
    await this.rallyStep();
  }
  async rallyStep(only = null) {
    const g = this.g;
    const list = (only || this.rallyUnits()).filter((u) => u.rally);
    if (!list.length) return;
    this.busy = true;
    // nächste zuerst, damit die Spitze den Weg freimacht
    list.sort((a, b) => distance(a.c, a.r, a.rally.c, a.rally.r) - distance(b.c, b.r, b.rally.c, b.rally.r));
    for (const u of list) {
      if (u.dead || !u.rally) continue;
      const { c, r } = u.rally;
      if (distance(u.c, u.r, c, r) <= 1 || (u.c === c && u.r === r)) { u.rally = null; continue; }
      if (u.moved || u.acted) continue;
      const reach = g.reachable(u), field = g.distanceField(u);
      const st = g.stepToward(u, field, c, r, reach);
      if (!st || (st.c === u.c && st.r === u.r)) continue;
      await this.doMove(u, st.c, st.r, reach);
      if (!u.dead && distance(u.c, u.r, c, r) <= 1) u.rally = null;
      if (g.state !== 'play') break;
    }
    this.busy = false;
    this.refresh();
  }
  xpBar(e) {
    if (!e.isUnit || !this.g.canGainXp(e)) return '';
    const r = e.rank || 0, xp = e.xp || 0;
    if (r >= RANKS.length - 1) return '<div class="xpbar max"><i style="width:100%"></i></div>';
    const a = RANKS[r].xp, b = RANKS[r + 1].xp;
    return `<div class="xpbar" title="Erfahrung"><i style="width:${Math.min(100, (xp - a) / (b - a) * 100)}%"></i></div>`;
  }

  showPanel(e, keep = false) {
    const el = $('#panel');
    if (!e || e.dead) { el.classList.remove('show'); el.innerHTML = ''; return; }
    const g = this.g, own = e.owner === 0, col = g.players[e.owner].color, myTurn = own && g.current === 0 && !this.busy;
    if (e.isBuilding && e.type === 'hq') return this.showHq(e);
    el.classList.remove('shop');
    const pct = e.isBuilding ? e.hp / e.maxHp * 100 : e.hp;
    const bar = `<div class="hpbar"><i style="width:${pct}%;background:${pct > 60 ? '#6fdc6a' : pct > 30 ? '#f2d35b' : '#ff6a50'}"></i></div>`;
    const waitBtn = e.isUnit && myTurn && !e.downed ? (this.waiting(e) ? '<button class="ib" data-a="unwait" title="Warten beenden">▶</button>' : !e.acted ? '<button class="ib" data-a="wait" title="Warten: Einheit pausiert 2 Runden">⏸</button>' : '') : '';
    let html = `<div class="p-head"><canvas class="p-icon"></canvas><div><div class="p-name">${e.def.name}</div><div class="p-sub" style="color:${col}">${g.players[e.owner].name}${e.isUnit ? ` · ${Math.ceil(e.hp)}` : ''}${e.isUnit && e.rank ? ` · <span class="rank r${e.rank}">${'★'.repeat(e.rank)}</span>` : ''}</div>${bar}${this.xpBar(e)}</div>${waitBtn}<button class="ib" data-a="expand" title="Details">${this.expanded ? '▾' : 'ⓘ'}</button><button class="ib x" data-a="close" title="Schließen">×</button></div>`;
    if (e.isUnit) {
      const w = g.weapon(e);
      // kompakte Statuszeile
      const chips = [];
      if (g.inHZ(e.c, e.r)) chips.push('<span class="chip hz">HZ ×2</span>'); else if (g.inCZ(e.c, e.r)) chips.push('<span class="chip cz">CZ</span>');
      if (own) chips.push(`<span class="chip">${e.acted ? 'fertig' : e.fresh ? 'ab nächster Runde' : e.moved ? 'bewegt' : `Bew. ${g.moveOf(e)}`}</span>`);
      const ew = g.effWeapon(e, e.c, e.r) || w;
      if (ew) chips.push(`<span class="chip" title="Stärke · Reichweite">⌖ ${ew.power} · R${ew.range[0] === ew.range[1] ? ew.range[0] : ew.range.join('–')}${ew !== w && ew.range[1] > w.range[1] ? '↑' : ''}</span>`);
      if (e.def.mt !== 'air' && !e.carried) { const cv = Math.round(g.coverAt(e) * 100); chips.push(`<span class="chip ${cv < 0 ? 'warn' : cv >= 35 ? 'cz' : ''}" title="Deckung am Standort (negativ = mehr Schaden)">${g.onTower(e) ? 'Turm · Sicht +3' : TERRAIN[g.terr(e.c, e.r)].name} ${cv > 0 ? '+' : ''}${cv} %</span>`); }
      if (e.def.ammo) chips.push(`<span class="chip">▮ ${e.ammo}/${e.def.ammo}</span>`);
      if (e.def.transport) chips.push(`<span class="chip">👥 ${(e.passengers || []).length}/${e.def.transport}</span>`);
      if (e.def.pallets) chips.push(`<span class="chip">▦ ${(e.cargoP || []).length}/${e.def.pallets}</span>`);
      if (e.gearUses) for (const [k, n] of Object.entries(e.gearUses)) if (n > 0) chips.push(`<span class="chip">${k === 'chute' ? '🪂' : GEAR[k]?.name.split(/[- ]/)[0]} ×${n}</span>`);
      if (e.def.builder) chips.push(`<span class="chip">▦ ${e.supplies || 0}</span>`);
      if (e.chute) chips.push('<span class="chip warn">am Fallschirm · +50 % Schaden</span>');
      if (e.auto) chips.push(`<span class="chip cz">🔁 ${e.auto === 'supply' ? 'Versorgung' : 'Pendeldienst'}</span>`);
      if (e.rally) chips.push(`<span class="chip">⚑ Marsch nach ${e.rally.c}·${e.rally.r}</span>`);
      if (e.marked) chips.push('<span class="chip warn">markiert</span>');
      if (e.suppressed) chips.push('<span class="chip warn">niedergehalten</span>');
      if (e.downed) chips.push(`<span class="chip warn">verwundet · ${e.downed} R.</span>`);
      if (e.landed) chips.push('<span class="chip">gelandet</span>'); else if (UNITS[e.type].mt === 'air') chips.push('<span class="chip">in der Luft</span>');
      html += `<div class="p-chips">${chips.join('')}</div>`;
      if (myTurn && !e.downed) html += this.unitActions(e);
      if (own && e.downed) html += '<div class="p-hint">Ein Sanitäter daneben kann ihn retten</div>';
      const zone = g.inHZ(e.c, e.r) ? 'Hot Zone ×2' : g.inCZ(e.c, e.r) ? 'Control Zone' : '';
      html += `<div class="p-detail"><div class="p-grid">
        <span>Bewegung</span><b>${g.moveOf(e)} (${MT_NAME[e.def.mt] || 'Ketten'})</b>
        <span>Panzerung</span><b>${ARMOR_NAME[e.def.armor]}</b>
        ${w ? `<span>Waffe</span><b>Stärke ${w.power} · Reichweite ${w.range[0] === w.range[1] ? w.range[0] : w.range.join('–')}${w.air ? ' · Luft' : ''}${w.ground ? '' : ' (nur Luft)'}${w.ammoSel ? ` · ${AMMO[e.ammoType || 'fmj'].name}` : ''}</b>` : ''}
        ${e.def.transport ? `<span>Insassen</span><b>${(e.passengers || []).map((id) => g.get(id)?.def.name).filter(Boolean).join(', ') || 'leer'}</b>` : ''}
        ${e.def.pallets ? `<span>Paletten</span><b>${(e.cargoP || []).map((k) => PALLETS[k].name).join(', ') || 'keine'}</b>` : ''}
        ${e.def.spawnPoint ? `<span>Antenne</span><b>${e.antenna ? 'intakt — Einsatzpunkt aktiv' : 'zerstört — Pionier oder HQ repariert'}</b>` : ''}
        ${e.def.flares ? `<span>Täuschkörper</span><b>${e.flareReady ? 'bereit' : 'verbraucht'}</b>` : ''}
        ${e.def.mt !== 'air' ? `<span>Gelände</span><b>${TERRAIN[g.terr(e.c, e.r)].name} (${Math.round(g.coverAt(e) * 100)} % Deckung) ${zone}</b>` : ''}
      </div><div class="p-desc">${e.def.desc}</div>${this.profileHtml('unit', e.type, e.def)}</div>`;
    } else html += this.buildingHtml(e, myTurn);
    el.innerHTML = html;
    el.classList.add('show');
    el.classList.toggle('expanded', !!this.expanded);
    const ic = el.querySelector('.p-icon');
    if (ic) { const src = icon(e.isUnit ? 'unit' : 'bld', e.type, col), d = Math.min(3, window.devicePixelRatio || 1); ic.width = 60 * d; ic.height = 45 * d; const ix = ic.getContext('2d'); ix.imageSmoothingQuality = 'high'; ix.drawImage(src, 0, 0, ic.width, ic.height); }
    this.paintIcons(el);
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = (ev) => this.panelAction(b.dataset.a, b.dataset.t, e, ev));
    if (!keep) requestAnimationFrame(() => this.keepClear(e));
  }
  // Kamera so verschieben, dass die gewählte Einheit nicht unter dem Panel liegt
  keepClear(e) {
    const el = $('#panel'); if (!el.classList.contains('show') || !e) return;
    const pr = el.getBoundingClientRect(), cr = $('#game').getBoundingClientRect();
    const p = this.r.posOf(e), s = this.r.w2s(p.x, p.y), x = s.x + cr.left, y = s.y + cr.top, m = 50;
    if (x < pr.left - m || x > pr.right + m || y < pr.top - m || y > pr.bottom + m) return;
    const freeW = cr.width - (pr.right - cr.left), wideFree = pr.width < cr.width * 0.7;
    let tx, ty;
    if (wideFree) { tx = (pr.right - cr.left) + freeW / 2; ty = s.y; }
    else { tx = s.x; ty = (pr.top - cr.top) / 2 + 30; }
    const z = this.r.cam.z;
    this.r.centerOn(p.x - (tx - this.r.vw / 2) / z, p.y - (ty - this.r.vh / 2) / z);
  }
  paintIcons(el) {
    el.querySelectorAll('canvas[data-icon]').forEach((c) => { const [k, t] = c.dataset.icon.split(':'); const src = icon(k, t, this.g.players[0].color), d = Math.min(3, window.devicePixelRatio || 1); c.width = 96 * d; c.height = 72 * d; const ix = c.getContext('2d'); ix.imageSmoothingQuality = 'high'; ix.drawImage(src, 0, 0, c.width, c.height); });
  }
  unitActions(e) {
    const g = this.g, btns = [], notes = [];
    const B = (a, label, cls = '', t = '', title = '') => btns.push(`<button data-a="${a}"${t ? ` data-t="${t}"` : ''} class="${cls}"${title ? ` title="${title}"` : ''}>${label}</button>`);
    const tg = g.canFire(e) ? g.targetsFrom(e, e.c, e.r).length : 0;
    if (tg && e.moved) notes.push(`${tg} Ziel${tg > 1 ? 'e' : ''} in Reichweite — rot markiert antippen`);
    const w = g.weapon(e);
    let ammo = '';
    if (w && w.ammoSel && !e.attacked && !e.acted) ammo = `<div class="ammo">${AMMO_ORDER.map((k) => `<button data-a="ammo" data-t="${k}" class="${(e.ammoType || 'fmj') === k ? 'on' : ''}" title="${AMMO[k].text}">${AMMO[k].name}</button>`).join('')}</div>`;
    if (e.def.builder && !e.acted) {
      if (g.fobsOf(0).length < 2 && !g.fobCovering(0, e.c, e.r) && g.canDeployFob(e) && g.fobHexes(e).length) B('fob', `⛺ FOB ${money(BUILDINGS.fob.cash)}`, 'purple');
      B('buildmenu', `⚒ Bauen ${'I'.repeat(e.def.builder)}`, this.buildOpen ? 'on' : '');
      if (g.canRefill(e)) B('refill', '▦ Auffüllen');
      if (g.hammerTargets(e).length) B('hammer', '⚒ Hämmern', 'primary');
      if (g.repairTargets(e).length) B('repair', '🔧 Reparieren');
    }
    if (e.def.medic && !e.acted) {
      if (g.reviveTargets(e).length) B('revive', '✚ Wiederbeleben', 'primary');
      if (g.healTargets(e).length) B('heal', `✚ Verbinden +${e.def.heal}`);
    }
    if (e.gearUses && !e.acted && !e.attacked) {
      const n = (k) => g.gearLeft(e, k);
      if (n('c4') && g.c4Targets(e).length) B('c4', `💥 C4`, 'danger');
      if (n('molotow')) B('molotow', '🔥 Molotow');
      if (n('rauch')) B('smoke', '☁ Rauch');
      for (const k of ['claymore', 'atmine']) if (n(k) && g.mineHexes(e).length) B('mine', `▲ ${k === 'claymore' ? 'Claymore' : 'Panzermine'}`, '', k);
    }
    if (g.canMark(e)) B('mark', '◎ Markieren', '', '', '+20 % Schaden auf das Ziel, Assist-Prämie beim Abschuss');
    if (g.canHack(e)) B('hack', '⌨ Hacken', 'purple');
    else if (g.towerAt(e.c, e.r) && !e.acted && g.foeAdjacent(e)) notes.push('Konsole blockiert: Feind daneben');
    if (g.canEnterCode(e)) B('code', '⚡ Code eingeben', 'primary');
    else if (g.towerAt(e.c, e.r) && g.towerAt(e.c, e.r).owner === 0 && !e.acted && !g.codeKnown(0)) notes.push(`Code: ${g.knownCount(0)}/3 Ziffern`);
    if (g.canHackFob(e)) { const f = g.hackFobTargets(e)[0]; B('hackfob', `⌨ FOB hacken${f.hack && f.hack.owner === 0 ? ' ✓' : ''}`, 'purple'); }
    if (g.takeoverTargets(e).length) B('takeover', '⌨ Bau übernehmen', 'purple', '', 'Feindliches Bauwerk daneben übernehmen (kein Verteidiger daneben)');
    const heli = UNITS[e.type].mt === 'air';
    if (e.def.transport) {
      const nP = (e.passengers || []).length;
      const near = g.units.some((t) => t !== e && g.isFootInf(t) && t.owner === 0 && !t.carried && !t.downed && distance(t.c, t.r, e.c, e.r) <= 1);
      if (!e.acted && g.units.some((t) => g.canBoard(e, t))) B('board', '👥 Aufnehmen');
      else if (heli && !e.landed && near && nP < e.def.transport) notes.push('Zum Aufnehmen erst landen');
      if (nP && !e.acted) {
        if (g.unloadHexes(e).length) B('unload', `⇣ Aussteigen (${nP})`, 'primary');
        if (heli && !e.landed) {
          if (g.canParadrop(e)) B('paradrop', `🪂 Absprung (${g.chuteRiders(e).length})`, 'primary', '', 'Fallschirm: Landepunkt zufällig daneben, bis zur nächsten Runde wehrlos und +50 % Schaden');
          notes.push(g.chuteRiders(e).length ? 'Landen zum sicheren Aussteigen oder Fallschirm' : 'Landen zum Aussteigen (kein Fallschirm an Bord)');
        }
      }
    }
    if (g.isFootInf(e) && !e.acted) { const apc = g.units.find((a) => g.canBoard(a, e)); if (apc) B('embark', '👥 Einsteigen'); }
    if (g.canLoadPallet(e)) for (const [k, d] of Object.entries(PALLETS)) btns.push(`<button data-a="pallet" data-t="${k}" ${g.players[0].credits < d.cost ? 'disabled' : ''} title="${d.desc} · ${money(d.cost)}">${d.icon} ${d.name.replace('palette', '')}</button>`);
    if (g.canDropPallets(e)) B('droppal', '▼ Abladen', 'primary');
    else if ((e.cargoP || []).some((k) => k !== 'kiste') && !e.acted) notes.push('Paletten abladen nur im eigenen FOB-Bereich');
    if (g.canDropCrate(e)) B('crate', '✚ Kiste abwerfen', 'primary');
    if (e.def.pallets && !e.def.spawnPoint) B('auto', e.auto === 'supply' ? '🔁 Versorgung an' : '🔁 FOB versorgen', e.auto === 'supply' ? 'on' : '', 'supply', 'Versorgungsauftrag: fährt am Rundenende selbstständig HQ → Paletten laden (je nach Bedarf, mind. $1.500 Reserve) → FOB abladen → zurück');
    if (e.def.transport && !e.def.spawnPoint && e.def.cat !== 'inf') B('auto', e.auto === 'ferry' ? '🔁 Pendeldienst an' : '🔁 Pendeldienst', e.auto === 'ferry' ? 'on' : '', 'ferry', 'Pendeldienst: holt am Rundenende Trupps aus der sicheren Zone am HQ ab und bringt sie in die Zone');
    if (e.rally) B('unrally', `⚑ Marschziel löschen`);
    if (g.canVSmoke(e)) B('vsmoke', '☁ Nebel', '', '', 'Fahrzeugnebel: Nebelwand auf dem eigenen Feld und daneben — kostet keine Aktion, 1 Ladung');
    if (g.canLand(e)) B('land', '⬇ Landen');
    if (e.landed) { if (g.canTakeoff(e)) B('takeoff', '⬆ Starten', 'primary'); else notes.push('Gelandet — startet nächste Runde'); }
    let html = ammo + (btns.length ? `<div class="p-actions">${btns.join('')}</div>` : '');
    if (notes.length) html += `<div class="p-hint">${notes.slice(0, 2).join(' · ')}</div>`;
    if (this.buildOpen && e.def.builder && !e.acted) html += this.buildListHtml(e);
    return html;
  }
  buildListHtml(e) {
    const g = this.g, tier = e.def.builder || 0;
    const list = BUILD_LIST.filter((t) => this.showAllBuild || (BUILDINGS[t].tier || 1) <= tier);
    const hidden = BUILD_LIST.length - list.length;
    const cards = list.map((t) => {
      const d = BUILDINGS[t], why = g.canAct(e) ? g.buildBlock(e, t) : 'Hat gehandelt', ok = !why;
      return `<button class="card ${ok ? '' : 'locked'}" data-a="pickbuild" data-t="${t}" title="${d.name}: ${why || d.desc}"><canvas data-icon="bld:${t}"></canvas><span class="c-name">${d.name}</span><span class="c-cost">${'I'.repeat(d.tier)} ▦${d.bau} ⚒${d.turns}${d.field ? ' ✦' : ''}</span></button>`;
    }).join('');
    return `<div class="p-title">▦ Material · ⚒ Hammerschläge · ✦ Feldbau (auch ohne FOB, aus dem Rucksack)</div><div class="cards">${cards}</div>
      ${hidden || this.showAllBuild ? `<button class="wide slim" data-a="buildall">${this.showAllBuild ? 'Nur baubare zeigen' : `+ ${hidden} Bauten mit größerem Hammer zeigen`}</button>` : ''}
      <div id="pinfo"><div class="pi-empty">Antippen, dann grünes Feld wählen</div></div>`;
  }
  buildingHtml(e, myTurn) {
    const g = this.g;
    let html = `<div class="p-grid"><span>Zustand</span><b>${Math.ceil(e.hp)} / ${e.maxHp}</b>
      ${e.turnsLeft > 0 ? `<span>Baustelle</span><b>noch ${e.turnsLeft} Hammerschläge</b>` : ''}`;
    if (e.type === 'fob') {
      html += `<span>Lager</span><b>▦ ${e.stock.bau} Material · ⛽ ${e.stock.sprit} Treibstoff</b>
        <span>Bauten</span><b>${g.buildings.filter((b) => !b.dead && b.fob === e.id).map((b) => b.def.name).join(', ') || 'keine'}</b>
        ${e.hack ? `<span>Hack</span><b style="color:#ff8a6a">${g.players[e.hack.owner].name} hackt die Konsole!</b>` : ''}`;
    }
    const f = g.fobOfB(e);
    if (e.def.weapon) { const w = WEAPONS[e.def.weapon]; html += `<span>Waffe</span><b>Stärke ${w.power} · Reichweite ${w.range.join('–')}${w.cost ? ` · ${w.cost} Material je Schuss (Lager: ${f ? f.stock.bau : '—'})` : ''}</b>`; }
    if (e.type === 'bohrturm') html += `<span>Status</span><b>${e.drillOn ? 'läuft — zieht die Hot Zone' : 'steht'} · Treibstoff im Lager: ${f ? f.stock.sprit : 0} (Start ab 6)</b>`;
    if (e.fob && !f && e.type !== 'fob') html += '<span>Versorgung</span><b style="color:#ff8a6a">Vorposten verloren — kein Nachschub</b>';
    html += `</div><div class="p-desc">${e.def.desc}</div>`;
    if (myTurn && e.type === 'bohrturm' && e.turnsLeft <= 0 && !e.drillOn) html += `<div class="p-actions">${g.canStartDrill(e) ? '<button data-a="drill" class="primary">⛽ Bohrturm starten</button>' : '<button disabled>Braucht 6 Treibstoff im Lager — Treibstoffpaletten liefern</button>'}</div>`;
    return html;
  }

  // ---------- Hauptquartier: Waffenkammer und Fahrzeugdepot ----------
  showHq(e) {
    const g = this.g, p = g.players[0], el = $('#panel'), myTurn = e.owner === 0 && g.current === 0 && !this.busy;
    let html = `<div class="p-head"><canvas class="p-icon"></canvas><div><div class="p-name">${e.owner === 0 ? 'Hauptquartier' : 'HQ ' + g.players[e.owner].name}</div><div class="p-sub" style="color:${g.players[e.owner].color}">${e.owner === 0 ? 'Kasse ' + money(p.credits) : 'Sichere Zone — unangreifbar'}</div></div><button class="x" data-a="close">×</button></div>`;
    if (e.owner !== 0) { html += `<div class="p-desc">${e.def.desc}</div>`; el.innerHTML = html; el.classList.add('show'); this.hqIcon(el, e); el.querySelectorAll('[data-a]').forEach((b) => b.onclick = (ev) => this.panelAction(b.dataset.a, b.dataset.t, e, ev)); return; }
    const spz = g.spzOf(0);
    html += `<div class="tabs">${Object.entries(TAB).map(([k, n]) => `<button data-a="tab" data-t="${k}" class="${this.shopTab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (this.shopTab === 'inf') {
      const ready = g.spzReady(0);
      html += `<div class="deploy"><span>Einsatzort</span><button data-a="deploy" data-t="hq" class="${this.deployAt === 'hq' ? 'on' : ''}">HQ</button><button data-a="deploy" data-t="spz" class="${this.deployAt === 'spz' ? 'on' : ''}" ${ready ? '' : 'disabled'}>SPz${spz ? ready ? ` (${p.deploys} frei)` : ' (Antenne tot)' : g.spzUnlocked ? ` (Ersatz in ${p.spzCd})` : ` (ab ${g.spzAt} Punkten)`}</button></div>`;
    }
    if (this.deployAt === 'spz' && !g.spzReady(0)) this.deployAt = 'hq';
    const items = [];
    if (this.shopTab === 'inf') {
      const roles = ['rekrut', ...Object.keys(TEMPLATES)];
      for (const role of roles) {
        const lo = g.defaultLoadout(0, role), d = UNITS[role] || UNITS.panzerjaeger;
        const ok = myTurn && !!lo && g.canBuy(0, role === 'flak' ? 'panzerjaeger' : role, this.deployAt, lo);
        const name = role === 'rekrut' ? 'Rekrut' : TEMPLATES[role].name, cost = lo ? g.unitCost(0, roleOf(lo), lo) : 0;
        items.push(`<button class="card ${ok ? '' : 'locked'}" data-a="tpl" data-t="${role}" title="${lo ? GUNS[lo.gun].name : ''}"><canvas data-icon="unit:${lo ? roleOf(lo) : 'schuetze'}"></canvas><span class="c-name">${name}</span><span class="c-cost">${role === 'rekrut' ? 'gratis' : money(cost)}</span>${lo ? `<span class="c-sub">${GUNS[lo.gun].name}</span>` : '<span class="c-lock">gesperrt</span>'}</button>`);
      }
    }
    for (const [t, d] of Object.entries(UNITS)) {
      if (this.shopTab === 'inf') break;
      if (d.noBuy || d.cat !== this.shopTab || (d.faction && d.faction !== p.faction)) continue;
      const at = d.cat === 'inf' ? this.deployAt : 'hq';
      const ok = myTurn && g.canBuy(0, t, at);
      const cost = d.free ? 0 : g.unitCost(0, t);
      const why = ok ? '' : !g.canUse(0, t) ? lockTxt(d) : d.free ? (p.rekrutRound === g.round ? 'Diese Runde schon' : 'Nur unter 5 Einheiten') : p.credits < cost ? 'Zu wenig Geld' : !myTurn ? '' : 'Kein Platz';
      items.push(`<button class="card ${ok ? '' : 'locked'}" data-a="info" data-t="unit:${t}" title="${why || d.desc}"><canvas data-icon="unit:${t}"></canvas><span class="c-name">${d.name}</span><span class="c-cost">${d.free ? 'gratis' : money(cost)}</span>${why ? `<span class="c-lock">${why}</span>` : ''}</button>`);
    }
    html += `<div class="cards">${items.join('')}</div><div id="pinfo"><div class="pi-empty">${this.shopTab === 'inf' ? 'Vorlage antippen — dann Waffe, bis zu 2 Ausrüstungsteile und Weste anpassen. Die Rolle ergibt sich aus der Ausrüstung.' : 'Antippen für Details — gekaufte Einheiten sind ab nächster Runde einsatzbereit'}</div></div>`;
    const last = p.lastOrder.filter((o) => !UNITS[o.type].free && (UNITS[o.type].cat !== 'inf' || g.loadoutOk(0, o.lo)) && (UNITS[o.type].cat === 'inf' || g.canUse(0, o.type)));
    if (myTurn && last.length) { const sum = last.reduce((a, o) => a + g.unitCost(0, o.type, o.lo), 0); html += `<button class="wide" data-a="rebuy" ${p.credits < sum ? 'disabled' : ''}>↻ Letzte Bestellung wiederholen (${last.length}× · ${money(sum)})</button>`; }
    html += '<div class="pi-why" style="color:#cfd6c8">Paletten lädt ihr direkt am Lastwagen oder Transporthubschrauber, solange er in der sicheren Zone steht.</div>';
    el.innerHTML = html; el.classList.add('show', 'shop'); el.classList.remove('expanded');
    this.hqIcon(el, e); this.paintIcons(el);
    if (this.infoSel) { if (this.infoSel.kind === 'lo' && this.shopTab === 'inf') this.showLoadout(e); else if (this.infoSel.kind !== 'lo') this.showInfo(this.infoSel.kind, this.infoSel.type, e); }
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = (ev) => this.panelAction(b.dataset.a, b.dataset.t, e, ev));
  }
  // Loadout-Baukasten: Waffe + bis zu 2 Ausrüstungsteile + Weste
  showLoadout(b) {
    const g = this.g, p = g.players[0], box = $('#pinfo'); if (!box) return;
    const lo = this.lo; if (!lo) return;
    if (lo.free) {
      const ok = g.current === 0 && !this.busy && g.canBuy(0, 'rekrut', this.deployAt);
      box.innerHTML = `<div class="pi-head"><b>Rekrut</b><span>gratis · KH-2002 · Verbandpäckchen</span></div><div class="pi-desc">${UNITS.rekrut.desc}</div><button class="primary wide" data-a="buylo" ${ok ? '' : 'disabled'}>Rekrut anfordern</button>`;
    } else {
      const opt = (id, it, sel) => { const can = g.canUse(0, id); return `<option value="${id}" ${sel ? 'selected' : ''} ${can ? '' : 'disabled'}>${it.name}${it.price ? ` · ${money(it.price)}` : ''}${can ? '' : ` · ${lockTxt(it)}`}</option>`; };
      const gunSel = Object.entries(GUN_CLS).map(([cls, n]) => `<optgroup label="${n}">${Object.entries(GUNS).filter(([, x]) => x.cls === cls).map(([id, x]) => opt(id, x, lo.gun === id)).join('')}</optgroup>`).join('');
      const gearSel = (i) => `<option value="">— nichts —</option>` + Object.entries(GEAR).filter(([id]) => !(lo.gear || []).includes(id) || lo.gear[i] === id).map(([id, x]) => opt(id, x, lo.gear[i] === id)).join('');
      const vestSel = Object.entries(VESTS).map(([id, x]) => opt(id, x, (lo.vest || 'keine') === id)).join('');
      const d = infDef(lo), w = WEAPONS[d.weapon], cost = g.unitCost(0, d.role, lo), okLo = g.loadoutOk(0, lo);
      const ok = g.current === 0 && !this.busy && okLo && g.canBuy(0, d.role, this.deployAt, lo);
      const gearTxt = (lo.gear || []).map((k) => `<div class="pi-row"><b>${GEAR[k].name}</b> ${GEAR[k].desc}</div>`).join('');
      box.innerHTML = `<div class="pi-head"><b>${d.name}</b><span>${money(cost)}${g.rookie ? ' (Rekrutenrabatt)' : ''} · Rolle ${UNITS[d.role].name}</span></div>
        <div class="lo-grid"><label>Waffe<select data-lo="gun">${gunSel}</select></label>
        <label>Ausrüstung 1<select data-lo="g0">${gearSel(0)}</select></label><label>Ausrüstung 2<select data-lo="g1">${gearSel(1)}</select></label>
        <label>Weste<select data-lo="vest">${vestSel}</select></label>
        <label class="lo-chk"><span><input type="checkbox" data-lo="chute" ${lo.chute ? 'checked' : ''}> 🪂 Fallschirm +${money(CHUTE_PRICE)}</span><em>Einweg, für Absprünge aus dem Hubschrauber</em></label></div>
        <div class="pi-tags"><span>Stärke ${w.power}</span><span>Reichweite ${w.range[0] === w.range[1] ? w.range[0] : w.range.join('–')}</span><span>Bewegung ${d.move}</span><span>Sicht ${d.sight}</span>${d.tough && d.tough < 1 ? `<span>Erleidet ${Math.round(d.tough * 100)} %</span>` : ''}${d.builder ? `<span>${HAMMER_NAME[d.builder]}</span>` : ''}${d.silent ? '<span>Lautlos</span>' : ''}${d.ghillie ? '<span>Ghillie-Tarnung</span>' : ''}</div>
        ${gearTxt}<button class="primary wide" data-a="buylo" ${ok ? '' : 'disabled'}>${okLo ? (p.credits < cost ? 'Zu wenig Geld' : `Kaufen · ${money(cost)}${this.deployAt === 'spz' ? ' · am SPz' : ''}`) : 'Gesperrte Teile im Loadout'}</button>`;
      const chk = box.querySelector('input[data-lo=chute]'); if (chk) chk.onchange = () => { this.lo = { ...lo, chute: chk.checked }; this.showLoadout(b); };
      box.querySelectorAll('select[data-lo]').forEach((s) => s.onchange = () => {
        const k = s.dataset.lo, v = s.value, n = { ...lo, gear: [...(lo.gear || [])] };
        if (k === 'gun') n.gun = v; else if (k === 'vest') n.vest = v; else { const i = +k[1]; n.gear[i] = v; n.gear = n.gear.filter(Boolean); }
        this.lo = n; this.showLoadout(b);
      });
    }
    box.querySelectorAll('[data-a]').forEach((btn) => btn.onclick = () => this.panelAction(btn.dataset.a, btn.dataset.t, b));
  }
  hqIcon(el, e) { const ic = el.querySelector('.p-icon'); if (!ic) return; const src = icon('bld', 'hq', this.g.players[e.owner].color), d = Math.min(3, window.devicePixelRatio || 1); ic.width = 60 * d; ic.height = 45 * d; ic.getContext('2d').drawImage(src, 0, 0, ic.width, ic.height); }

  showInfo(kind, type, b) {
    const g = this.g, p = g.players[0], box = $('#pinfo'); if (!box) return;
    if (kind === 'bld') {
      const d = BUILDINGS[type];
      box.innerHTML = `<div class="pi-head"><b>${d.name}</b><span>▦ ${d.bau} Material · ⚒ ${d.turns}</span></div>${this.profileHtml('bld', type)}<div class="pi-hint">▶ Grünes Feld neben dem Pionier antippen</div>`;
    } else {
      const d = UNITS[type], at = d.cat === 'inf' ? this.deployAt : 'hq', ok = g.current === 0 && !this.busy && g.canBuy(0, type, at), cost = d.free ? 0 : g.unitCost(0, type);
      box.innerHTML = `<div class="pi-head"><b>${d.name}</b><span>${d.free ? 'gratis' : money(cost)} · ${TRACKS[d.track]?.icon || ''} ${TRACKS[d.track]?.name || ''}</span></div>${this.profileHtml('unit', type)}
        <button class="primary wide" data-a="buy" data-t="${type}" ${ok ? '' : 'disabled'}>${d.free ? 'Rekrut anfordern' : `Kaufen · ${money(cost)}`}${at === 'spz' ? ' · am SPz' : ''}</button>`;
    }
    box.querySelectorAll('[data-a]').forEach((btn) => btn.onclick = () => this.panelAction(btn.dataset.a, btn.dataset.t, b));
    document.querySelectorAll('#panel .card').forEach((c) => c.classList.toggle('sel', c.dataset.t === `${kind}:${type}` || (kind === 'bld' && c.dataset.t === type)));
  }

  profileHtml(kind, type, def) {
    const CLS = { inf: 'Infanterie', light: 'leichte Fahrzeuge', heavy: 'Panzer', bld: 'Bauwerke', air: 'Hubschrauber' };
    if (kind === 'bld') {
      const d = BUILDINGS[type], extra = [];
      if (d.weapon) { const w = WEAPONS[d.weapon]; extra.push(`Reichweite ${w.range.join('–')}`); }
      if (d.pass) extra.push(d.pass === 'foot' ? 'zu Fuß passierbar' : d.pass === 'ownInf' ? 'eigene Infanterie passiert' : 'eigene Einheiten passieren');
      extra.push(`Hammer ${'I'.repeat(d.tier || 1)}`); if (d.field) extra.push('Feldbau');
      return `<div class="pi-desc">${d.desc}</div><div class="pi-tags">${extra.map((x) => `<span>${x}</span>`).join('')}<span>Stabilität ${d.hp}</span></div>`;
    }
    const d = def || UNITS[type], w = WEAPONS[d.weapon];
    const strong = [], weak = [];
    if (w) for (const [k, v] of Object.entries(ARMOR_MOD[w.type])) { const can = k === 'air' ? w.air : w.ground; if (!can || v <= 0.3) weak.push(CLS[k]); else if (v >= 0.9) strong.push(CLS[k]); }
    const tags = [`Bewegung ${d.move}`, `Sicht ${d.sight}`, `Panzerung: ${CLS[d.armor] || d.armor}`];
    if (w) tags.push(`Waffe ${w.power} · Reichweite ${w.range[0] === w.range[1] ? w.range[0] : w.range.join('–')}`);
    if (d.ammo) tags.push(`Munition ${d.ammo}`);
    if (d.transport) tags.push(`${d.transport} Plätze`);
    if (d.pallets) tags.push(`${d.pallets} Paletten`);
    if (d.faction) tags.unshift(`Exklusiv: ${FACTIONS[d.faction].name}`);
    if (w && w.ammoSel) tags.push('Munitionswahl FMJ/HP/AP');
    if (w && w.splash) tags.push(`Wirkungskreis ${Math.round(w.splash * 100)} %`);
    if (d.stealth) tags.push('Getarnt, solange still');
    if (d.tough) tags.push(`Erleidet ${Math.round(d.tough * 100)} % Schaden`);
    return `<div class="pi-desc">${d.desc}</div><div class="pi-tags">${tags.map((x) => `<span>${x}</span>`).join('')}</div>
      ${w ? `<div class="pi-row good"><b>Stark gegen</b> ${strong.join(', ') || '—'}</div><div class="pi-row bad"><b>Schwach gegen</b> ${weak.join(', ') || '—'}</div>` : '<div class="pi-row"><b>Unbewaffnet</b></div>'}
      ${w && w.noMoveFire ? '<div class="pi-row">Kann nicht ziehen und feuern in derselben Runde, kein Gegenschlag gegen ihn.</div>' : ''}`;
  }

  targetMode(mode, e, hexes, msg) {
    if (!hexes.length) { this.flash('Kein gültiges Ziel'); return; }
    this.clearHL(); this.r.hl.sel = e; this.mode = mode; this.r.hl.target = hexes; this.flash(msg);
  }
  async panelAction(a, t, e) {
    const g = this.g;
    if (this.busy && a !== 'close') return;
    if (a === 'close') { this.buildOpen = false; this.infoSel = null; this.deselect(); return; }
    if (a === 'expand') { this.expanded = !this.expanded; this.showPanel(e); return; }
    if (a === 'tab') { this.shopTab = t; this.infoSel = null; this.showPanel(e); return; }
    if (a === 'deploy') { this.deployAt = t; this.showPanel(e); return; }
    if (a === 'info') { const [kind, type] = t.split(':'); this.infoSel = { kind, type }; this.showInfo(kind, type, e); return; }
    if (a === 'tpl') { const ch = !!(this.lo && this.lo.chute); this.lo = g.defaultLoadout(0, t) || { gun: 'kh2002', gear: [], vest: 'keine' }; if (ch && !this.lo.free) this.lo = { ...this.lo, chute: true }; this.infoSel = { kind: 'lo' }; document.querySelectorAll('#panel .card').forEach((c) => c.classList.toggle('sel', c.dataset.t === t)); this.showLoadout(e); return; }
    if (a === 'buylo') {
      const lo = this.lo, role = lo.free ? 'rekrut' : infDef(lo).role;
      const ev = g.buy(0, role, this.deployAt, lo.free ? null : lo);
      if (ev) { this.flash(`${lo.free ? 'Rekrut' : infDef(lo).name} gekauft — ab nächster Runde einsatzbereit`); await this.playEvents([ev]); this.refresh(); this.showPanel(e); }
      else this.flash('Kauf nicht möglich');
      return;
    }
    if (a === 'buy') {
      const at = UNITS[t].cat === 'inf' ? this.deployAt : 'hq';
      const ev = g.buy(0, t, at);
      if (ev) { this.flash(`${UNITS[t].name} gekauft — ab nächster Runde einsatzbereit`); await this.playEvents([ev]); this.refresh(); this.showPanel(e); }
      else this.flash('Kauf nicht möglich');
      return;
    }
    if (a === 'rebuy') {
      const list = g.players[0].lastOrder.filter((o) => !UNITS[o.type].free);
      const evs = []; for (const o of list) { const ev = g.buy(0, o.type, UNITS[o.type].cat === 'inf' ? this.deployAt : 'hq', o.lo); if (ev) evs.push(ev); }
      this.flash(`${evs.length} Einheiten nachgekauft`); await this.playEvents(evs); this.refresh(); this.showPanel(e); return;
    }
    if (a === 'wait') { e.acted = true; e.moved = true; e.waitUntil = g.round + 2; this.deselect(); this.refresh(); return; }
    if (a === 'unwait') { e.waitUntil = 0; this.select(e); this.refresh(); return; }
    if (a === 'ammo') { e.ammoType = t; this.select(e); if (this.mode === 'confirm') this.prepareAttack(this.confirmTarget); return; }
    if (a === 'board') { this.targetMode('board', e, g.units.filter((x) => g.canBoard(e, x)).map((x) => [x.c, x.r]), 'Trupp neben dem Fahrzeug antippen'); return; }
    if (a === 'unload') { this.targetMode('unload', e, g.unloadHexes(e), 'Freies Feld zum Aussteigen antippen'); return; }
    if (a === 'embark') { const apc = g.units.find((x) => g.canBoard(x, e)); if (apc) { this.busy = true; await this.animBoard(apc, e); this.busy = false; this.deselect(); this.refresh(); } return; }
    if (a === 'land') { if (g.canLand(e)) { this.busy = true; await this.animLand(e, true); this.busy = false; this.select(e); this.refresh(); } return; }
    if (a === 'takeoff') { if (g.canTakeoff(e)) { this.busy = true; await this.animLand(e, false); this.busy = false; this.select(e); this.refresh(); } return; }
    if (a === 'fob') { this.targetMode('fob', e, g.fobHexes(e), `FOB: freies Nachbarfeld antippen (${money(BUILDINGS.fob.cash)})`); return; }
    if (a === 'buildmenu') { this.buildOpen = !this.buildOpen; this.showPanel(e, true); return; }
    if (a === 'buildall') { this.showAllBuild = !this.showAllBuild; this.showPanel(e, true); return; }
    if (a === 'pickbuild') {
      if (!g.canBuild(e, t)) { this.showInfo('bld', t, e); return; }
      this.buildType = t; this.buildOpen = false; this.clearHL(); this.r.hl.sel = e; this.mode = 'build'; this.r.hl.build = g.buildHexes(e, t);
      this.showPanel(e, true); this.flash(`${BUILDINGS[t].name}: grünes Feld antippen (Abbrechen: Einheit erneut antippen)`); return;
    }
    if (a === 'hammer') { const ts = g.hammerTargets(e); if (ts.length === 1) { this.busy = true; await this.doAct(g.hammer(e, ts[0])); this.busy = false; this.deselect(); return; } this.targetMode('hammer', e, ts.map((x) => [x.c, x.r]), 'Baustelle antippen'); return; }
    if (a === 'repair') { this.targetMode('repair', e, g.repairTargets(e).map((x) => [x.c, x.r]), 'Fahrzeug oder Bauwerk antippen'); return; }
    if (a === 'revive') { const ts = g.reviveTargets(e); if (ts.length === 1) { this.busy = true; await this.doAct(g.revive(e, ts[0])); this.busy = false; this.deselect(); return; } this.targetMode('revive', e, ts.map((x) => [x.c, x.r]), 'Verwundeten antippen'); return; }
    if (a === 'heal') { this.targetMode('heal', e, g.healTargets(e).map((x) => [x.c, x.r]), 'Trupp zum Verbinden antippen'); return; }
    if (a === 'auto') { e.auto = e.auto === t ? null : t; if (e.auto) e.rally = null; this.flash(e.auto ? (t === 'supply' ? 'Versorgungsauftrag erteilt — läuft ab Rundenende automatisch' : 'Pendeldienst aktiv — läuft ab Rundenende automatisch') : 'Auftrag beendet'); this.showPanel(e, true); return; }
    if (a === 'unrally') { e.rally = null; this.showPanel(e, true); return; }
    if (a === 'vsmoke') { this.busy = true; await this.doAct(g.vehicleSmoke(e)); this.busy = false; this.select(e); return; }
    if (a === 'paradrop') { this.busy = true; await this.doAct(g.paradrop(e)); this.busy = false; this.select(e); return; }
    if (a === 'crate') { const hx = g.crateHexes(e); if (hx.length === 1) { this.busy = true; await this.doAct(g.dropCrate(e, hx[0][0], hx[0][1])); this.busy = false; this.select(e); return; } this.targetMode('crate', e, hx, 'Feld für die Versorgungskiste antippen'); return; }
    if (a === 'takeover') { const ts = g.takeoverTargets(e); if (ts.length === 1) { this.busy = true; await this.doAct(g.takeover(e, ts[0])); this.busy = false; this.deselect(); return; } this.targetMode('takeover', e, ts.map((x) => [x.c, x.r]), 'Feindliches Bauwerk antippen'); return; }
    if (a === 'refill') { const n = g.refill(e); this.flash(`Rucksack +${n} Material`); this.showPanel(e); return; }
    if (a === 'c4') { this.targetMode('c4', e, g.c4Targets(e).map((x) => [x.c, x.r]), 'C4: Fahrzeug oder Bauwerk daneben antippen'); return; }
    if (a === 'molotow') { this.targetMode('molotow', e, g.throwHexes(e), 'Molotow: Feld in Reichweite 2 antippen (40 gegen Infanterie)'); return; }
    if (a === 'smoke') { this.targetMode('smoke', e, g.throwHexes(e), 'Rauch: Feld in Reichweite 2 antippen'); return; }
    if (a === 'mark') { this.targetMode('mark', e, g.markTargets(e).map((x) => [x.c, x.r]), 'Feind in Sicht antippen'); return; }
    if (a === 'mine') { this.mineKind = t; this.targetMode('mine', e, g.mineHexes(e), `${GEAR[t].name}: Nachbarfeld antippen`); return; }
    if (a === 'hack') { this.busy = true; await this.doAct(g.hack(e)); this.busy = false; this.deselect(); return; }
    if (a === 'code') { this.busy = true; await this.doAct(g.enterCode(e)); this.busy = false; this.deselect(); return; }
    if (a === 'hackfob') { const ts = g.hackFobTargets(e); if (ts.length === 1) { this.busy = true; await this.doAct(g.hackFob(e, ts[0])); this.busy = false; this.deselect(); return; } this.targetMode('hackfob', e, ts.map((x) => [x.c, x.r]), 'Feindlichen Vorposten antippen'); return; }
    if (a === 'pallet') { if (g.loadPallet(e, t)) { this.flash(`${PALLETS[t].name} geladen`); this.refresh(); this.showPanel(e); } return; }
    if (a === 'droppal') { this.busy = true; await this.doAct(g.dropPallets(e)); this.busy = false; this.deselect(); return; }
    if (a === 'drill') { this.busy = true; await this.doAct(g.startDrill(e)); this.busy = false; this.showPanel(e); return; }
  }

  drawMinimap() {
    const g = this.g, cv = $('#minimap'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, sx = W / g.map.size.w, sy = H / g.map.size.h;
    ctx.drawImage(g.map.base, 0, 0, W, H);
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      const i = g.i(c, r), p = center(c, r);
      if (!g.visible[i]) { ctx.fillStyle = 'rgba(6,8,6,0.4)'; ctx.fillRect((p.x - R) * sx, (p.y - R) * sy, R * 2 * sx + 1, R * 2 * sy + 1); }
    }
    const czp = center(g.cz.c, g.cz.r);
    ctx.strokeStyle = 'rgba(150,255,170,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(czp.x * sx, czp.y * sy, (g.cz.rad + 0.5) * 66 * sx, 0, 6.28); ctx.stroke();
    const hzp = center(g.hz.c, g.hz.r);
    ctx.fillStyle = 'rgba(255,140,60,0.55)'; ctx.beginPath(); ctx.arc(hzp.x * sx, hzp.y * sy, (g.hz.rad + 0.5) * 66 * sx, 0, 6.28); ctx.fill();
    for (const p of g.players) { const s = center(g.map.starts[p.id].c, g.map.starts[p.id].r); ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x * sx, s.y * sy, 2.5 * 66 * sx, 0, 6.28); ctx.stroke(); }
    for (const b of g.buildings) if (g.seen(b) && b.type !== 'hq') { const p = center(b.c, b.r); ctx.fillStyle = g.players[b.owner].color; ctx.fillRect(p.x * sx - 2.5, p.y * sy - 2.5, 5, 5); }
    for (const u of g.units) if (!u.carried && g.seen(u)) { const p = center(u.c, u.r); ctx.fillStyle = u.downed ? '#fff' : g.players[u.owner].color; ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 2, 0, 6.28); ctx.fill(); }
    for (const tw of g.towers) { const p = center(tw.c, tw.r); ctx.save(); ctx.translate(p.x * sx, p.y * sy); ctx.rotate(0.785); ctx.fillStyle = tw.owner >= 0 ? g.players[tw.owner].color : '#e8e4d4'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.fillRect(-3, -3, 6, 6); ctx.strokeRect(-3, -3, 6, 6); ctx.restore(); }
    const cam = this.r.cam;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(cam.x * sx, cam.y * sy, this.r.vw / cam.z * sx, this.r.vh / cam.z * sy);
  }
}
