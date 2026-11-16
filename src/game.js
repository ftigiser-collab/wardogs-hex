// Spielregeln und Zustand — Hundemarke (rundenbasiert, drei Fraktionen, King of the Hill)
import { UNITS, BUILDINGS, WEAPONS, ARMOR_MOD, AMMO, TERRAIN, MOVE_COST, FACTIONS, RANKS, PAY, PALLETS, FOB_STOCK, CODE_USES, CODE_LOCK, TOWER_CD,
  SPZ_RESPAWN, SPZ_DEPLOYS, DOWNED_TURNS, START_CASH } from './data.js';
import { neighbors, distance, ring, center } from './hex.js';
import { mulberry32 } from './util.js';

const ang = (c1, r1, c2, r2) => { const a = center(c1, r1), b = center(c2, r2); return Math.atan2(b.y - a.y, b.x - a.x); };
let NEXT = 1;
const LANDED = {};

export class Game {
  constructor(map, opts = {}) {
    this.map = map; this.W = map.W; this.H = map.H;
    this.rnd = mulberry32(map.seed * 7 + 3);
    this.units = []; this.buildings = [];
    this.byId = new Map();
    this.round = 1; this.current = 0;
    this.diff = opts.diff;
    const facs = opts.factions || ['ironstar', 'volkhova', 'simurgh'];
    this.players = facs.map((f, i) => this.mkPlayer(i, f));
    for (const p of this.players) if (p.id > 0) { p.incomeMult = opts.diff?.aiBonus ?? 1; p.credits = opts.diff?.aiCash ?? START_CASH; }
    if (opts.playerCash != null) this.players[0].credits = opts.playerCash;
    this.target = opts.target || 25;
    this.spzAt = Math.max(3, Math.ceil(this.target * 0.2));
    this.spzUnlocked = false;
    this.visible = new Uint8Array(this.W * this.H);
    this.explored = new Uint8Array(this.W * this.H).fill(1);  // Karte ist bekannt, Einheiten nicht
    this.discovered = new Set();
    this.log = [];
    this.state = 'play';
    // Zonen
    const cz = map.cz;
    this.cz = { c: cz.c, r: cz.r, rad: cz.rad };
    this.hz = { c: cz.c, r: cz.r, rad: 1, dir: Math.floor(this.rnd() * 6), lock: 0, lockTower: -1 };
    this.hz.next = this.hzStep();
    // Funktürme mit je einer Codeziffer (Code bleibt die ganze Partie gleich)
    this.towers = (map.towers || []).map((t, i) => ({ i, c: t.c, r: t.r, digit: Math.floor(this.rnd() * 10), owner: -1, cd: 0 }));
    this.known = this.players.map(() => new Set());
    this.codeUses = 0;
  }
  mkPlayer(id, faction) {
    const F = FACTIONS[faction];
    return { id, faction, name: F.name, color: F.color, perk: F.perk || {}, credits: START_CASH, incomeMult: 1, score: 0,
      spzId: 0, spzCd: 0, deploys: SPZ_DEPLOYS, rekrutRound: 0, order: [], lastOrder: [], heads: { cz: 0, hz: 0, w: 0 },
      stats: { kills: 0, lost: 0, earned: 0, spent: 0, revives: 0, ticks: 0, lostTypes: {} } };
  }

  // ---------- Reihenfolge: rotiert jede Runde, damit niemand dauerhaft zuletzt zieht ----------
  orderFor(round = this.round) { const n = this.players.length, k = (round - 1) % n; return [...Array(n).keys()].map((i) => (i + k) % n); }

  // ---------- Fraktionsboni ----------
  unitCost(owner, type) {
    const d = UNITS[type], pk = this.players[owner].perk;
    let c = d.cost;
    if (d.mt === 'air' && pk.airCost) c *= pk.airCost;
    if ((d.armored || type === 'grad') && pk.armorCost) c *= pk.armorCost;
    return Math.round(c / 50) * 50;
  }
  moveOf(u) {
    const pk = this.players[u.owner].perk;
    let m = u.def.move + (RANKS[u.rank || 0].move || 0) + (u.def.mt === 'foot' && pk.infMove ? pk.infMove : 0);
    if (u.suppressed > 0) m -= 1;
    return Math.max(1, m);
  }
  active(b) { return b && !b.dead && b.turnsLeft <= 0; }

  // ---------- Aufbau ----------
  setup() {
    this.players.forEach((pl, o) => {
      const s = this.map.starts[o]; if (!s) return;
      this.addBuilding(o, 'hq', s.c, s.r, true);
      const free = this.safeHexes(o).filter(([c, r]) => this.groundFree(c, r) && this.cost('foot', c, r) < Infinity);
      free.sort((a, b) => distance(a[0], a[1], this.cz.c, this.cz.r) - distance(b[0], b[1], this.cz.c, this.cz.r));
      ['schuetze', 'schuetze', 'pionier', 'jeep'].forEach((t, i) => { const h = free[i]; if (h) this.addUnit(o, t, h[0], h[1]); });
    });
    this.updateVision();
  }

  say(text, kind = 'info', owner = 0) { if (owner === 0) { this.log.push({ text, kind, round: this.round, t: performance.now() }); if (this.log.length > 40) this.log.shift(); } }
  foesOf(o) { return this.players.filter((p) => p.id !== o).map((p) => p.id); }

  // ---------- Hilfen ----------
  i(c, r) { return r * this.W + c; }
  in(c, r) { return c >= 0 && r >= 0 && c < this.W && r < this.H; }
  terr(c, r) { return this.map.ter[this.i(c, r)]; }
  get(id) { const e = this.byId.get(id); return e && !e.dead ? e : null; }
  cost(mt, c, r) { return MOVE_COST[mt][this.terr(c, r)]; }
  unitAt(c, r, air) { return this.units.find((u) => !u.dead && !u.carried && u.c === c && u.r === r && (u.def.mt === 'air') === !!air) || null; }
  buildingAt(c, r) { return this.buildings.find((b) => !b.dead && b.c === c && b.r === r) || null; }
  solidAt(c, r) { const b = this.buildingAt(c, r); return b && !b.def.passable ? b : null; }
  groundFree(c, r) { return !this.unitAt(c, r, false) && !this.solidAt(c, r); }
  ownUnits(o) { return this.units.filter((u) => !u.dead && u.owner === o); }
  hqOf(o) { return this.buildings.find((b) => !b.dead && b.owner === o && b.type === 'hq') || null; }
  // Sichere Zone um das HQ
  safeOwner(c, r) { for (const p of this.players) { const s = this.map.starts[p.id]; if (s && distance(c, r, s.c, s.r) <= 2) return p.id; } return -1; }
  inSafe(c, r, o) { const s = this.map.starts[o]; return !!s && distance(c, r, s.c, s.r) <= 2; }
  safeHexes(o) { const s = this.map.starts[o]; return ring(s.c, s.r, 2, this.W, this.H).filter(([c, r]) => !(c === s.c && r === s.r)); }
  towerAt(c, r) { return this.towers.find((t) => t.c === c && t.r === r) || null; }
  poiAt(c, r) { return this.towerAt(c, r); }

  addUnit(owner, type, c, r) {
    const def = UNITS[type];
    const u = { id: NEXT++, isUnit: true, owner, type, def, c, r, hp: 100, moved: false, acted: false, ammo: def.ammo || 0, carried: false,
      facing: ang(c, r, this.cz.c, this.cz.r), ammoType: 'fmj', passengers: def.transport ? [] : undefined, cargoP: def.pallets ? [] : undefined };
    if (def.spawnPoint) u.antenna = true;
    if (def.flares) u.flareReady = true;
    this.units.push(u); this.byId.set(u.id, u);
    return u;
  }
  addBuilding(owner, type, c, r, instant = false) {
    const def = BUILDINGS[type];
    const b = { id: NEXT++, isBuilding: true, owner, type, def, c, r, hp: def.hp, maxHp: def.hp, turnsLeft: instant ? 0 : (def.turns || 0), acted: false, facing: ang(c, r, this.cz.c, this.cz.r), rise: instant ? 1 : 0 };
    if (type === 'fob') b.stock = { ...FOB_STOCK };
    this.buildings.push(b); this.byId.set(b.id, b);
    return b;
  }

  // ---------- Geld ----------
  pay(owner, amount, why, c, r, list) {
    if (owner == null || owner < 0 || !amount) return 0;
    const p = this.players[owner], amt = Math.round(amount * (p.incomeMult || 1));
    p.credits += amt; p.stats.earned += amt;
    const ev = { type: 'cash', owner, amount: amt, why, c, r };
    if (list) list.push(ev);
    return amt;
  }
  hzMult(c, r) { return this.inHZ(c, r) ? 2 : 1; }

  // ---------- Tarnung ----------
  stealthed(u, viewer = 0) {
    if (!u || !u.isUnit || u.owner === viewer || u.downed) return false;
    const st = u.def.stealth;
    const facStealth = u.def.cat === 'inf' && this.players[u.owner].perk.infStealth && TERRAIN[this.terr(u.c, u.r)].cover && !u.attacked;
    if (!st && !facStealth) return false;
    if (st === 'still' && (u.moved || u.attacked) && !facStealth) return false;
    return !this.units.some((p) => !p.dead && p.owner === viewer && !p.carried && distance(p.c, p.r, u.c, u.r) <= 1);
  }

  // ---------- Bewegung ----------
  blocked(u, c, r) {
    const air = u.def.mt === 'air';
    const so = this.safeOwner(c, r); if (so >= 0 && so !== u.owner) return true;
    if (!air) { const b = this.solidAt(c, r); if (b) return true; }
    const o = this.unitAt(c, r, air);
    if (o && o.owner !== u.owner && !this.stealthed(o, u.owner) && (u.owner !== 0 || this.visible[this.i(c, r)])) return true;
    return false;
  }
  reachable(u, budget = this.moveOf(u)) {
    const res = new Map(), key = (c, r) => r * this.W + c;
    res.set(key(u.c, u.r), { c: u.c, r: u.r, cost: 0, prev: null });
    if (u.landed || u.downed) return res;
    const open = [[u.c, u.r, 0]];
    while (open.length) {
      open.sort((a, b) => a[2] - b[2]);
      const [c, r, g] = open.shift();
      if (g > (res.get(key(c, r))?.cost ?? Infinity)) continue;
      for (const [nc, nr] of neighbors(c, r, this.W, this.H)) {
        const k = key(nc, nr), step = this.cost(u.def.mt, nc, nr);
        if (step === Infinity || this.blocked(u, nc, nr)) continue;
        const ng = g + step; if (ng > budget + 1e-6) continue;
        const cur = res.get(k);
        if (!cur || ng < cur.cost) { res.set(k, { c: nc, r: nr, cost: ng, prev: key(c, r) }); open.push([nc, nr, ng]); }
      }
    }
    for (const v of res.values()) {
      const occ = this.unitAt(v.c, v.r, u.def.mt === 'air');
      v.end = !occ || occ === u || (occ.owner !== u.owner && (this.stealthed(occ, u.owner) || (u.owner === 0 && !this.visible[this.i(v.c, v.r)])));
    }
    return res;
  }
  pathFrom(reach, c, r) {
    const path = []; let k = r * this.W + c;
    while (k !== null && k !== undefined) { const n = reach.get(k); if (!n) break; path.push({ c: n.c, r: n.r }); k = n.prev; }
    return path.reverse();
  }
  distanceField(u, avoid) {
    const W = this.W, d = new Float32Array(W * this.H).fill(Infinity), prev = new Int32Array(W * this.H).fill(-1);
    d[this.i(u.c, u.r)] = 0;
    const open = [[u.c, u.r, 0]];
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][2] < open[bi][2]) bi = k;
      const [c, r, g] = open.splice(bi, 1)[0];
      if (g > d[this.i(c, r)]) continue;
      for (const [nc, nr] of neighbors(c, r, W, this.H)) {
        let step = this.cost(u.def.mt, nc, nr);
        if (step === Infinity) continue;
        const so = this.safeOwner(nc, nr); if (so >= 0 && so !== u.owner) continue;
        if (u.def.mt !== 'air' && this.solidAt(nc, nr)) continue;
        const o = this.unitAt(nc, nr, u.def.mt === 'air'); if (o && o.owner !== u.owner) step += 6;
        if (avoid) step += avoid(nc, nr);
        const ng = g + step, k = this.i(nc, nr);
        if (ng < d[k]) { d[k] = ng; prev[k] = this.i(c, r); open.push([nc, nr, ng]); }
      }
    }
    return { d, prev };
  }
  stepToward(u, field, tc, tr, reach = this.reachable(u)) {
    let k = this.i(tc, tr);
    if (field.d[k] === Infinity) return null;
    const chain = []; while (k !== -1) { chain.push(k); k = field.prev[k]; }
    for (const kk of chain) { const n = reach.get(kk); if (n && n.end) return { c: n.c, r: n.r }; }
    return null;
  }
  moveUnit(u, c, r, reach) {
    let path = this.pathFrom(reach || this.reachable(u), c, r);
    u.ambushed = false;
    const air = u.def.mt === 'air';
    for (let k = 1; k < path.length; k++) { const o = this.unitAt(path[k].c, path[k].r, air); if (o && o.owner !== u.owner) { path = path.slice(0, k); u.ambushed = o.id; break; } }
    while (path.length > 1) { const e = path[path.length - 1]; const occ = this.unitAt(e.c, e.r, air); if (!occ || occ === u) break; path.pop(); }
    c = path[path.length - 1].c; r = path[path.length - 1].r;
    if (u.ambushed) { u.acted = true; this.say(`Hinterhalt! ${u.def.name} stößt auf einen verborgenen Gegner`, 'warn', u.owner); }
    if (path.length > 1) { const a = path[path.length - 2]; u.facing = ang(a.c, a.r, c, r); }
    u.c = c; u.r = r; u.moved = true; u.waitUntil = 0;
    if (u.passengers) this.syncPassengers(u);
    return path;
  }

  // ---------- Transport ----------
  isFootInf(t) { return t && t.isUnit && t.def.mt === 'foot'; }
  canBoard(apc, t) {
    return apc && apc.def.transport && !apc.dead && !apc.landedBlock && t && !t.dead && t !== apc && this.isFootInf(t) && !t.downed && t.owner === apc.owner && !t.carried && !t.acted
      && !(apc.cargoP || []).length && (apc.passengers || []).length < apc.def.transport && distance(apc.c, apc.r, t.c, t.r) <= 1 && t.owner === this.current
      && (apc.def.mt !== 'air' || true);
  }
  board(apc, t) {
    apc.passengers = [...(apc.passengers || []), t.id];
    t.carried = true; t.c = apc.c; t.r = apc.r; t.moved = true; t.acted = true; t.inApc = apc.id; t.rideFromCz = this.inCZ(t.c, t.r);
    return { type: 'board', apc: apc.id, t: t.id };
  }
  unloadHexes(apc) {
    if (!(apc.passengers || []).length || apc.acted) return [];
    const t = this.get(apc.passengers[0]); if (!t) return [];
    const cands = apc.def.mt === 'air' ? [[apc.c, apc.r], ...neighbors(apc.c, apc.r, this.W, this.H)] : neighbors(apc.c, apc.r, this.W, this.H);
    return cands.filter(([c, r]) => this.groundFree(c, r) && this.cost(t.def.mt, c, r) !== Infinity && (this.safeOwner(c, r) < 0 || this.safeOwner(c, r) === apc.owner));
  }
  unload(apc, c, r) {
    const id = (apc.passengers || []).shift(); const t = this.get(id); if (!t) return null;
    t.carried = false; t.c = c; t.r = r; t.moved = true; t.acted = false; t.inApc = null;
    const ev = { type: 'unload', apc: apc.id, t: t.id, cash: [] };
    // Transportprämie: wer Trupps von außerhalb in die Zone bringt
    if (!t.rideFromCz && this.inCZ(c, r)) {
      const base = this.inHZ(c, r) ? PAY.transportHz : PAY.transport;
      this.pay(apc.owner, base * (this.players[apc.owner].perk.transportPay || 1), 'Transport', c, r, ev.cash);
      apc.ferried = (apc.ferried || 0) + 1;
    }
    t.rideFromCz = true;
    return ev;
  }
  syncPassengers(apc) { for (const id of apc.passengers || []) { const t = this.get(id); if (t) { t.c = apc.c; t.r = apc.r; } } }

  // ---------- Hubschrauber landen / starten ----------
  isThopter(u) { return u.isUnit && UNITS[u.type].mt === 'air'; }
  landedDef(type) { LANDED[type] = LANDED[type] || { ...UNITS[type], mt: 'track', landedForm: true }; return LANDED[type]; }
  canLand(u) {
    return this.isThopter(u) && !u.landed && !u.didLand && u.owner === this.current && !this.unitAt(u.c, u.r, false) && !this.solidAt(u.c, u.r) && this.cost('track', u.c, u.r) !== Infinity;
  }
  land(u) { u.landed = true; u.didLand = true; u.def = this.landedDef(u.type); u.moved = true; u.acted = true; return { type: 'land', u: u.id }; }
  canTakeoff(u) { return !!u.landed && !u.acted && u.owner === this.current; }
  takeoff(u) { u.landed = false; u.def = UNITS[u.type]; u.didLand = true; return { type: 'takeoff', u: u.id }; }

  // ---------- Kampf ----------
  weapon(e) { return WEAPONS[e.def.weapon] || null; }
  isAir(e) { return e.isUnit && e.def.mt === 'air'; }
  canHit(w, t) { return !!w && (this.isAir(t) ? w.air : w.ground); }
  inRange(w, c1, r1, c2, r2) { const d = distance(c1, r1, c2, r2); return d >= w.range[0] && d <= w.range[1]; }
  fobOfB(b) { return b && b.fob ? this.get(b.fob) : null; }
  canFire(u) {
    const w = this.weapon(u); if (!w || u.acted || u.carried || u.landed || u.downed) return false;
    if (w.noMoveFire && u.moved) return false;
    if (w.ammo && u.ammo <= 0) return false;
    if (u.isUnit && this.inSafe(u.c, u.r, u.owner)) return false;
    if (u.isBuilding) { if (u.turnsLeft > 0) return false; if (w.cost) { const f = this.fobOfB(u); if (!f || f.stock.bau < w.cost) return false; } }
    return true;
  }
  targetable(t, byOwner) {
    if (t.dead || t.owner === byOwner) return false;
    if (t.isBuilding && t.def.invuln) return false;
    if (t.isUnit && (t.carried || this.inSafe(t.c, t.r, t.owner))) return false;
    return true;
  }
  targetsFrom(e, c, r, onlyVisible = e.owner === 0) {
    const w = this.weapon(e); if (!w) return [];
    const out = [];
    for (const t of this.units) {
      if (!this.targetable(t, e.owner) || !this.canHit(w, t)) continue;
      if (onlyVisible && !this.visible[this.i(t.c, t.r)]) continue;
      if (this.stealthed(t, e.owner)) continue;
      if (this.inRange(w, c, r, t.c, t.r)) out.push(t);
    }
    if (w.ground) for (const b of this.buildings) {
      if (!this.targetable(b, e.owner)) continue;
      if (onlyVisible && !this.seen(b)) continue;
      if (this.inRange(w, c, r, b.c, b.r)) out.push(b);
    }
    return out;
  }
  coverAt(t) {
    if (t.isBuilding || this.isAir(t)) return 0;
    let d = TERRAIN[this.terr(t.c, t.r)].def;
    const b = this.buildingAt(t.c, t.r); if (b && b.def.passable && b.owner === t.owner && b.turnsLeft <= 0) d += b.def.cover || 0;
    return Math.min(0.6, d);
  }
  calcDamage(att, t, attHp = att.hp, ammoType = att.ammoType) {
    const w = this.weapon(att); if (!w || !this.canHit(w, t)) return 0;
    if (t.isUnit && t.downed) return 100;
    const armor = t.isBuilding ? 'bld' : t.def.armor;
    let mod = ARMOR_MOD[w.type][armor] ?? 0;
    if (w.ammoSel && att.isUnit) mod *= AMMO[ammoType || 'fmj'].mod[armor] ?? 1;
    const hpF = att.isBuilding ? 1 : 0.35 + 0.65 * (attHp / 100);
    let dmg = w.power * mod * hpF * (1 - this.coverAt(t));
    if (t.isUnit && t.def.tough) dmg *= t.def.tough;
    if (t.isUnit && t.def.cat === 'veh' && this.players[t.owner].perk.vehTough) dmg *= this.players[t.owner].perk.vehTough;
    if (att.isUnit && att.rank) dmg *= RANKS[att.rank].dmg;
    if (t.isUnit && t.rank) dmg *= RANKS[t.rank].taken;
    if (t.isBuilding) dmg = dmg * t.maxHp / 100;
    return dmg;
  }
  hpPct(e) { return e.isBuilding ? (e.hp / e.maxHp) * 100 : e.hp; }
  pct(v, e) { return e.isBuilding ? (v / e.maxHp) * 100 : v; }
  forecast(att, t, fromC = att.c, fromR = att.r) {
    const w = this.weapon(att);
    let dmg = this.calcDamage(att, t);
    const flare = w && w.flareable && t.isUnit && t.flareReady;
    if (flare) dmg = 0;
    const tHpAfter = t.isUnit && t.downed ? 0 : Math.max(0, t.hp - dmg);
    let counter = 0;
    if (tHpAfter > 0 && this.canCounter(t, att, fromC, fromR)) counter = this.calcDamage(t, att, this.pct(tHpAfter, t) * (t.isBuilding ? 1 : 1)) * 0.85;
    const downs = t.isUnit && !t.downed && tHpAfter <= 0 && this.canDown(t);
    return { dmg: this.pct(dmg, t), counter: this.pct(counter, att), kills: tHpAfter <= 0 && !downs, downs, finish: t.isUnit && !!t.downed, flare, miss: w?.miss || 0 };
  }
  canCounter(t, att, ac = att.c, ar = att.r) {
    if (t.isUnit && (t.downed || t.carried)) return false;
    const w = this.weapon(t); if (!w || w.noCounter || !this.canHit(w, att)) return false;
    if (t.isBuilding && t.turnsLeft > 0) return false;
    if (w.ammo && t.ammo <= 0) return false;
    return this.inRange(w, t.c, t.r, ac, ar);
  }
  canDown(t) { return t.isUnit && t.def.cat === 'inf' && !t.carried; }
  // Trefferwirkung auf eine Einheit/ein Gebäude anwenden: verwundet statt tot bei Infanterie
  applyHit(t, dmg, by, ev, list) {
    if (t.dead) return;
    if (t.isUnit && t.downed) { this.kill(t, by, list); (ev.finished || (ev.finished = [])).push(t.id); return 'killed'; }
    t.hp -= dmg;
    if (t.isUnit && t.def.spawnPoint && t.hp < 50 && t.antenna) { t.antenna = false; ev.antenna = t.id; this.say(t.owner === 0 ? 'Die Antenne eures SPz ist zerstört — Einsatzpunkt tot, bis ein Pionier repariert' : `Antenne des ${this.players[t.owner].name}-SPz zerstört`, t.owner === 0 ? 'bad' : 'good', 0); }
    if (t.hp <= 0.5) {
      if (this.canDown(t)) { this.down(t, by, list); return 'downed'; }
      this.kill(t, by, list); return 'killed';
    }
    return 'hit';
  }
  down(t, by, list) {
    t.hp = 0; t.downed = DOWNED_TURNS; t.moved = true; t.acted = true; t.reflex = false;
    if (by && by.owner !== t.owner) this.pay(by.owner, 400 * this.bounty(t.owner), 'Ausgeschaltet', t.c, t.r, list);
    this.say(t.owner === 0 ? `${t.def.name} verwundet! Ein Sanitäter kann ihn retten` : `Feindlicher ${t.def.name} verwundet`, t.owner === 0 ? 'bad' : 'info', 0);
  }
  attack(att, t) {
    const w = this.weapon(att);
    const rnd = 0.92 + this.rnd() * 0.16;
    let dmg = this.calcDamage(att, t) * rnd;
    att.acted = true; att.moved = true; att.attacked = true;
    if (w.ammo && att.isUnit) att.ammo--;
    if (w.cost && att.isBuilding) { const f = this.fobOfB(att); if (f) f.stock.bau -= w.cost; }
    att.facing = ang(att.c, att.r, t.c, t.r);
    const ev = { type: 'attack', att: att.id, target: t.id, dmg: 0, proj: w.proj, counter: 0, killed: false, counterKilled: false, cash: [] };
    if (w.flareable && t.isUnit && t.flareReady) { t.flareReady = false; ev.flared = true; dmg = 0; }
    if (w.miss && this.rnd() < w.miss) { ev.miss = true; dmg = 0; }
    const wasDowned = t.isUnit && t.downed;
    ev.dmg = this.pct(wasDowned ? 100 : dmg, t);
    if (dmg > 0 || wasDowned) {
      const res = this.applyHit(t, dmg, att, ev, ev.cash);
      if (res === 'killed') ev.killed = true;
      if (res === 'downed') ev.downed = true;
      if (w.suppress && t.isUnit && !t.dead && !t.downed) { t.suppressed = 1; ev.suppressed = true; }
    }
    // Wirkungskreis: Nachbarfelder (nur Gegner des Schützen)
    if (w.splash) {
      ev.splash = [];
      for (const [c, r] of neighbors(t.c, t.r, this.W, this.H)) {
        for (const o of [...this.units, ...this.buildings]) {
          if (o.dead || o.owner === att.owner || o.c !== c || o.r !== r || (o.isUnit && (o.carried || this.isAir(o))) || !this.targetable(o, att.owner)) continue;
          const d = this.calcDamage(att, o) * w.splash * (0.9 + this.rnd() * 0.2);
          const res = this.applyHit(o, o.isUnit && o.downed ? 100 : d, att, ev, ev.cash);
          ev.splash.push({ id: o.id, dmg: Math.round(this.pct(d, o)), killed: res === 'killed', downed: res === 'downed' });
        }
      }
      if (w.rubble) for (const [c, r] of [[t.c, t.r], ...neighbors(t.c, t.r, this.W, this.H)]) {
        if (this.terr(c, r) === 'ort' && this.rnd() < (c === t.c && r === t.r ? 0.45 : 0.12)) { this.map.ter[this.i(c, r)] = 'truemmer'; (ev.rubble || (ev.rubble = [])).push([c, r]); }
      }
    } else if (w.type === 'cannon' && this.terr(t.c, t.r) === 'ort' && this.rnd() < 0.15) { this.map.ter[this.i(t.c, t.r)] = 'truemmer'; ev.rubble = [[t.c, t.r]]; }
    if (!t.dead && !ev.downed && !wasDowned && this.canCounter(t, att)) {
      const cw = this.weapon(t);
      const cd = this.calcDamage(t, att, this.hpPct(t)) * 0.85 * (0.92 + this.rnd() * 0.16);
      ev.counterProj = cw.proj;
      if (cw.ammo) t.ammo--;
      let cdd = cd;
      if (cw.flareable && att.isUnit && att.flareReady) { att.flareReady = false; cdd = 0; ev.counterFlared = true; }
      ev.counter = this.pct(cdd, att);
      if (cdd > 0) { const res = this.applyHit(att, cdd, t, ev, ev.cash); if (res === 'killed') ev.counterKilled = true; if (res === 'downed') ev.counterDowned = true; }
    }
    if (!att.dead && !att.downed) this.gainXp(att, this.xpFor(ev.dmg, t, ev.killed || ev.downed), ev);
    if (t.isUnit && !t.dead && !t.downed && ev.counter) this.gainXp(t, this.xpFor(ev.counter, att, ev.counterKilled) + 4, ev);
    if (t.isUnit && !t.dead && !t.downed && !ev.counter) this.gainXp(t, 3, ev);
    return ev;
  }

  // ---------- Erfahrung ----------
  canGainXp(u) { return u && u.isUnit && !u.dead && !u.def.free; }
  gainXp(u, amount, ev) {
    if (!this.canGainXp(u) || amount <= 0) return;
    u.xp = (u.xp || 0) + amount;
    let r = u.rank || 0;
    while (r < RANKS.length - 1 && u.xp >= RANKS[r + 1].xp) r++;
    if (r > (u.rank || 0)) {
      u.rank = r; u.hp = Math.min(100, u.hp + 15);
      (ev.promos || (ev.promos = [])).push({ u: u.id, rank: r });
      if (u.owner === 0) this.say(`${u.def.name} befördert: ${RANKS[r].name}!`, 'good');
    }
  }
  xpFor(dmgPct, target, killed) {
    const big = target.isBuilding ? 1.2 : target.def.cat === 'veh' || target.def.mt === 'air' ? 1.15 : 1;
    return dmgPct * 0.5 * big + (killed ? 22 * big : 0);
  }

  // Reaktionsfeuer
  reflexFire(mover) {
    const ev = [];
    if (mover.dead || mover.carried) return ev;
    if (this.inSafe(mover.c, mover.r, mover.owner)) return ev;
    const shooters = [...this.units, ...this.buildings].filter((e) => !e.dead && e.reflex && e.owner !== mover.owner && !(e.isUnit && (e.carried || e.downed)));
    for (const s of shooters) {
      if (mover.dead || mover.downed) break;
      const w = this.weapon(s);
      if (!w || !this.canHit(w, mover) || !this.inRange(w, s.c, s.r, mover.c, mover.r) || this.stealthed(mover, s.owner)) continue;
      if (s.isBuilding && (s.turnsLeft > 0 || (w.cost && !(this.fobOfB(s)?.stock.bau >= w.cost)))) continue;
      if (w.ammo && s.ammo <= 0) continue;
      if (s.isUnit && this.inSafe(s.c, s.r, s.owner)) continue;
      let dmg = this.calcDamage(s, mover) * 0.7 * (0.92 + this.rnd() * 0.16);
      const e = { type: 'attack', att: s.id, target: mover.id, dmg: 0, proj: w.proj, counter: 0, killed: false, reflex: true, cash: [] };
      if (w.flareable && mover.flareReady) { mover.flareReady = false; dmg = 0; e.flared = true; }
      s.reflex = false;
      if (w.ammo) s.ammo--;
      if (w.cost && s.isBuilding) { const f = this.fobOfB(s); if (f) f.stock.bau -= w.cost; }
      e.dmg = this.pct(dmg, mover);
      if (dmg > 0) { const res = this.applyHit(mover, dmg, s, e, e.cash); if (res === 'killed') e.killed = true; if (res === 'downed') e.downed = true; if (w.suppress && !mover.dead && !mover.downed) mover.suppressed = 1; }
      this.gainXp(s, this.xpFor(e.dmg, mover, e.killed || e.downed), e);
      ev.push(e);
    }
    return ev;
  }

  // Kopfgeld: Wer den Punkteführer trifft, verdient 50 % mehr — hält drei Fraktionen im Gleichgewicht
  bounty(o) { const top = Math.max(...this.players.map((p) => p.score)); return top >= 2 && this.players[o].score === top && this.players.filter((p) => p.score === top).length === 1 ? 1.5 : 1; }
  kill(e, by, list) {
    if (e.dead) return;
    e.dead = true; e.hp = 0; e.downed = 0;
    const p = this.players[e.owner];
    if (by && by.owner !== e.owner) {
      this.players[by.owner].stats.kills++;
      const amt = e.isBuilding ? PAY.killBld : e.def.mt === 'air' ? PAY.killAir : e.def.cat === 'veh' ? PAY.killVeh : PAY.killInf;
      const bt = this.bounty(e.owner);
      if (!(e.isUnit && e.def.free)) this.pay(by.owner, amt * bt, bt > 1 ? 'Kopfgeld' : e.isBuilding ? 'Zerstört' : 'Abschuss bestätigt', e.c, e.r, list);
      else this.pay(by.owner, 300, 'Abschuss', e.c, e.r, list);
    }
    p.stats.lost++;
    p.stats.lostTypes[e.type] = (p.stats.lostTypes[e.type] || 0) + 1;
    if (e.isUnit) {
      for (const id of e.passengers || []) { const pp = this.get(id); if (pp && !pp.dead) this.kill(pp, by, list); }
      e.passengers = [];
      if (e.def.spawnPoint) { p.spzCd = SPZ_RESPAWN; p.spzId = 0; this.say(e.owner === 0 ? `Euer SPz ist zerstört — Ersatz in ${SPZ_RESPAWN} Runden am HQ` : `${p.name}-SPz zerstört`, e.owner === 0 ? 'bad' : 'good', 0); }
      else if (e.owner === 0) this.say(`${e.def.name} verloren`, 'bad');
    } else {
      if (e.type === 'fob') for (const b of this.buildings) if (b.fob === e.id) b.fob = 0;
      this.say(`${e.def.name} zerstört`, e.owner === 0 ? 'bad' : 'info', 0);
    }
  }

  // ---------- Zonen ----------
  inCZ(c, r) { return distance(c, r, this.cz.c, this.cz.r) <= this.cz.rad; }
  inHZ(c, r) { return distance(c, r, this.hz.c, this.hz.r) <= this.hz.rad; }
  hzNextHas(c, r) { return this.hz.next && distance(c, r, this.hz.next.c, this.hz.next.r) <= this.hz.rad; }
  hzOk(c, r) { return this.in(c, r) && distance(c, r, this.cz.c, this.cz.r) <= this.cz.rad - this.hz.rad && this.terr(c, r) !== 'wasser'; }
  // Köpfe in der Zone: Bodeneinheiten (auch Insassen von Bodenfahrzeugen), Hot Zone zählt doppelt
  bodyPos(u) {
    if (u.dead || u.downed) return null;
    if (u.carried) { const v = this.get(u.inApc); if (!v || v.def.mt === 'air') return null; return v; }
    if (u.def.mt === 'air') return null;
    return u;
  }
  headsOf(o) {
    let cz = 0, hz = 0; const at = [];
    for (const u of this.units) {
      if (u.owner !== o) continue;
      const p = this.bodyPos(u); if (!p || !this.inCZ(p.c, p.r)) continue;
      if (this.inHZ(p.c, p.r)) hz++; else cz++;
      at.push(u);
    }
    return { cz, hz, w: cz + hz * 2, at };
  }
  updateHeads() { for (const p of this.players) { const h = this.headsOf(p.id); p.heads = { cz: h.cz, hz: h.hz, w: h.w }; } return this.players.map((p) => p.heads.w); }
  leader() {
    const w = this.updateHeads(), m = Math.max(...w);
    if (m <= 0 || w.filter((x) => x === m).length > 1) return -1;
    return w.indexOf(m);
  }
  activeDrills() { return this.buildings.filter((b) => !b.dead && b.type === 'bohrturm' && b.turnsLeft <= 0 && b.drillOn && this.fobOfB(b) && this.fobOfB(b).stock.sprit > 0); }
  hzStep(from = this.hz) {
    // Gesperrt durch Turmcode: bleibt stehen
    if (this.hz.lock > 0) return { c: from.c, r: from.r, dir: from.dir };
    const drills = this.activeDrills ? this.activeDrills() : [];
    if (drills.length) {
      // Mehrere Bohrtürme: der mit dem meisten Treibstoff zieht; bei Gleichstand wechselt es je Runde
      drills.sort((a, b) => this.fobOfB(b).stock.sprit - this.fobOfB(a).stock.sprit || (a.id - b.id) * ((this.round & 1) ? 1 : -1));
      const d = drills[0];
      let best = null, bd = 1e9;
      for (const [c, r] of [[from.c, from.r], ...neighbors(from.c, from.r, this.W, this.H)]) {
        if (!this.hzOk(c, r)) continue;
        const dd = distance(c, r, d.c, d.r) + distance(c, r, from.c, from.r) * 0.01;
        if (dd < bd) { bd = dd; best = [c, r]; }
      }
      if (best) return { c: best[0], r: best[1], dir: from.dir, drill: d.id };
    }
    let dir = from.dir ?? 0;
    if (this.rnd() < 0.4) dir = (dir + (this.rnd() < 0.5 ? 1 : 5)) % 6;
    const t = from.r & 1 ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
    const order = [dir, (dir + 1) % 6, (dir + 5) % 6, (dir + 2) % 6, (dir + 4) % 6, (dir + 3) % 6];
    for (const d of order) { const nc = from.c + t[d][0], nr = from.r + t[d][1]; if (this.hzOk(nc, nr)) return { c: nc, r: nr, dir: d }; }
    return { c: from.c, r: from.r, dir };
  }
  recomputeHzNext() { this.hz.next = this.hzStep(); }

  // ---------- Funktürme ----------
  knownCount(o) { return this.known[o].size; }
  codeKnown(o) { return this.known[o].size >= Math.max(1, this.towers.length - 1); }
  codeFor(o) { const k = this.codeKnown(o); return this.towers.map((t) => (k || this.known[o].has(t.i) ? t.digit : null)); }
  foeAdjacent(u) { return this.units.some((x) => !x.dead && !x.carried && !x.downed && x.owner !== u.owner && x.def.mt !== 'air' && distance(x.c, x.r, u.c, u.r) <= 1); }
  canHack(u) {
    const t = this.towerAt(u.c, u.r);
    return !!t && this.isFootInf(u) && !u.downed && !u.carried && !u.acted && u.owner === this.current && (t.owner !== u.owner || !this.known[u.owner].has(t.i)) && !this.foeAdjacent(u);
  }
  hack(u) {
    const t = this.towerAt(u.c, u.r), from = t.owner;
    t.owner = u.owner; this.known[u.owner].add(t.i);
    u.acted = true; u.moved = true;
    const ev = { type: 'hack', u: u.id, tower: t.i, digit: t.digit, from, cash: [] };
    this.pay(u.owner, 300 * this.hzMult(u.c, u.r), 'Konsole gehackt', u.c, u.r, ev.cash);
    if (u.owner === 0) this.say(`Konsole gehackt: Ziffer ${t.digit} an Turm ${'ABCD'[t.i]}${this.codeKnown(0) ? ' — der Code ist vollständig!' : ''}`, 'good');
    else if (from === 0) this.say(`${this.players[u.owner].name} hat euren Turm ${'ABCD'[t.i]} übernommen`, 'bad');
    return ev;
  }
  canEnterCode(u) {
    const t = this.towerAt(u.c, u.r);
    return !!t && this.isFootInf(u) && !u.downed && !u.acted && u.owner === this.current && t.owner === u.owner && t.cd <= 0 && this.codeKnown(u.owner) && this.codeUses < CODE_USES && !this.foeAdjacent(u)
      && this.hzOk(t.c, t.r) && !(this.hz.lock > 0 && this.hz.lockTower === t.i);
  }
  enterCode(u) {
    const t = this.towerAt(u.c, u.r), from = { c: this.hz.c, r: this.hz.r };
    this.hz.c = t.c; this.hz.r = t.r; this.hz.lock = CODE_LOCK; this.hz.lockTower = t.i;
    this.hz.next = { c: t.c, r: t.r, dir: this.hz.dir };
    t.cd = TOWER_CD; this.codeUses++;
    u.acted = true; u.moved = true;
    const ev = { type: 'code', u: u.id, tower: t.i, from, to: { c: t.c, r: t.r }, owner: u.owner, cash: [] };
    this.pay(u.owner, 500, 'Code eingegeben', u.c, u.r, ev.cash);
    this.say(u.owner === 0 ? `Code eingegeben! Die Hot Zone springt zu Turm ${'ABCD'[t.i]} und bleibt ${CODE_LOCK} Runden` : `${this.players[u.owner].name} hat den Turmcode eingegeben — die Hot Zone springt zu Turm ${'ABCD'[t.i]}!`, u.owner === 0 ? 'good' : 'warn', 0);
    return ev;
  }

  // ---------- Vorposten (FOB) und Bauen ----------
  fobsOf(o) { return this.buildings.filter((b) => !b.dead && b.owner === o && b.type === 'fob'); }
  fobCovering(o, c, r) { return this.fobsOf(o).filter((b) => distance(b.c, b.r, c, r) <= b.def.radius).sort((a, b) => distance(a.c, a.r, c, r) - distance(b.c, b.r, c, r))[0] || null; }
  canAct(u) { return !u.acted && u.owner === this.current && !u.carried && !u.downed; }
  fobHexes(u) {
    const out = [];
    for (const [c, r] of neighbors(u.c, u.r, this.W, this.H)) {
      if (!TERRAIN[this.terr(c, r)].build || !this.groundFree(c, r) || this.buildingAt(c, r) || this.towerAt(c, r)) continue;
      if (this.players.some((p) => distance(c, r, this.map.starts[p.id].c, this.map.starts[p.id].r) <= 4)) continue;
      if (this.buildings.some((b) => !b.dead && b.type === 'fob' && distance(b.c, b.r, c, r) <= 4)) continue;
      out.push([c, r]);
    }
    return out;
  }
  canDeployFob(u) { return !!u.def.builder && this.canAct(u) && this.players[u.owner].credits >= BUILDINGS.fob.cash && this.fobsOf(u.owner).length < 2; }
  deployFob(u, c, r) {
    const p = this.players[u.owner];
    p.credits -= BUILDINGS.fob.cash; p.stats.spent += BUILDINGS.fob.cash;
    const b = this.addBuilding(u.owner, 'fob', c, r, true);
    u.acted = true; u.moved = true;
    this.say(u.owner === 0 ? 'Vorposten errichtet — Pioniere können jetzt im Umkreis von 2 Feldern bauen' : `${p.name} errichtet einen Vorposten`, u.owner === 0 ? 'good' : 'warn', 0);
    return { type: 'fob', u: u.id, b: b.id };
  }
  buildHexes(u, type) {
    const def = BUILDINGS[type], out = [];
    for (const [c, r] of [[u.c, u.r], ...neighbors(u.c, u.r, this.W, this.H)]) {
      const f = this.fobCovering(u.owner, c, r); if (!f) continue;
      if (!TERRAIN[this.terr(c, r)].build || this.buildingAt(c, r) || this.towerAt(c, r) || this.safeOwner(c, r) >= 0) continue;
      const occ = this.unitAt(c, r, false);
      if (def.passable ? (occ && occ.owner !== u.owner) : occ) continue;
      out.push([c, r]);
    }
    return out;
  }
  buildFob(u) { return this.fobCovering(u.owner, u.c, u.r) || neighbors(u.c, u.r, this.W, this.H).map(([c, r]) => this.fobCovering(u.owner, c, r)).find(Boolean) || null; }
  canBuild(u, type) {
    if (!u.def.builder || !this.canAct(u)) return false;
    const f = this.buildFob(u); if (!f) return false;
    if (type === 'bohrturm' && this.buildings.some((b) => !b.dead && b.owner === u.owner && b.type === 'bohrturm')) return false;
    return f.stock.bau >= BUILDINGS[type].bau && this.buildHexes(u, type).length > 0;
  }
  placeStructure(u, type, c, r) {
    const def = BUILDINGS[type], f = this.fobCovering(u.owner, c, r);
    if (!f || f.stock.bau < def.bau) return null;
    f.stock.bau -= def.bau;
    const b = this.addBuilding(u.owner, type, c, r);
    b.fob = f.id; b.turnsLeft = Math.max(0, def.turns - 1);
    u.acted = true; u.moved = true; u.facing = ang(u.c, u.r, c, r);
    const ev = { type: 'place', u: u.id, b: b.id, cash: [] };
    this.pay(u.owner, PAY.hammer * this.hzMult(c, r), 'Gehämmert', c, r, ev.cash);
    if (b.turnsLeft <= 0) { ev.built = true; this.pay(u.owner, PAY.built, 'Gebaut', c, r, ev.cash); }
    return ev;
  }
  hammerTargets(u) { return this.buildings.filter((b) => !b.dead && b.owner === u.owner && b.turnsLeft > 0 && distance(b.c, b.r, u.c, u.r) <= 1); }
  hammer(u, b) {
    b.turnsLeft--; u.acted = true; u.moved = true; u.facing = ang(u.c, u.r, b.c, b.r);
    const ev = { type: 'hammer', u: u.id, b: b.id, cash: [] };
    this.pay(u.owner, PAY.hammer * this.hzMult(b.c, b.r), 'Gehämmert', b.c, b.r, ev.cash);
    if (b.turnsLeft <= 0) { ev.built = true; this.pay(u.owner, PAY.built, 'Gebaut', b.c, b.r, ev.cash); if (u.owner === 0) this.say(`${b.def.name} fertig`, 'good'); }
    return ev;
  }
  repairTargets(u) {
    const out = [];
    for (const t of this.units) if (!t.dead && !t.carried && t.owner === u.owner && (t.def.cat === 'veh' || t.def.mt === 'air') && (t.hp < 100 || t.antenna === false) && distance(t.c, t.r, u.c, u.r) <= 1) out.push(t);
    for (const b of this.buildings) if (!b.dead && b.owner === u.owner && !b.def.invuln && b.turnsLeft <= 0 && b.hp < b.maxHp && distance(b.c, b.r, u.c, u.r) <= 1) out.push(b);
    return out;
  }
  repair(u, t) {
    if (t.isUnit) { t.hp = Math.min(100, t.hp + 35); if (t.def.spawnPoint && t.hp >= 50) t.antenna = true; }
    else t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.4);
    u.acted = true; u.moved = true; u.facing = ang(u.c, u.r, t.c, t.r);
    return { type: 'repair', u: u.id, t: t.id };
  }
  canStartDrill(b) { const f = this.fobOfB(b); return b && b.type === 'bohrturm' && b.turnsLeft <= 0 && !b.drillOn && b.owner === this.current && f && f.stock.sprit >= 6; }
  startDrill(b) {
    b.drillOn = true; this.recomputeHzNext();
    this.say(b.owner === 0 ? 'Bohrturm läuft — die Hot Zone wird zum Vorposten gezogen' : `${this.players[b.owner].name} hat einen Bohrturm gestartet! Die Hot Zone wandert zu ihnen`, b.owner === 0 ? 'good' : 'warn', 0);
    return { type: 'drill', b: b.id };
  }
  hackFobTargets(u) { return this.buildings.filter((b) => !b.dead && b.type === 'fob' && b.owner !== u.owner && distance(b.c, b.r, u.c, u.r) <= 1); }
  canHackFob(u) { return this.isFootInf(u) && this.canAct(u) && this.hackFobTargets(u).length > 0; }
  hackFob(u, b) {
    u.acted = true; u.moved = true;
    if (b.hack && b.hack.owner === u.owner && b.hack.round < this.round) {
      const from = b.owner, flipped = [b];
      b.owner = u.owner; b.hack = null;
      for (const s of this.buildings) if (!s.dead && s.fob === b.id) { s.owner = u.owner; flipped.push(s); }
      const ev = { type: 'fobhack', u: u.id, b: b.id, from, done: true, flipped: flipped.map((x) => x.id), cash: [] };
      this.pay(u.owner, PAY.hackFob, 'Vorposten übernommen', b.c, b.r, ev.cash);
      this.say(u.owner === 0 ? 'Vorposten übernommen! Lager und Stellungen gehören jetzt euch' : from === 0 ? `${this.players[u.owner].name} hat euren Vorposten übernommen!` : `${this.players[u.owner].name} übernimmt einen Vorposten`, u.owner === 0 ? 'good' : from === 0 ? 'bad' : 'warn', 0);
      return ev;
    }
    b.hack = { owner: u.owner, by: u.id, round: this.round };
    this.say(u.owner === 0 ? 'Hack läuft — bleibt neben der Konsole, nächste Runde ist der Vorposten euer' : b.owner === 0 ? 'Achtung: Euer Vorposten wird gehackt! Vertreibt den Feind von der Konsole' : `${this.players[u.owner].name} hackt einen Vorposten`, u.owner === 0 ? 'good' : b.owner === 0 ? 'bad' : 'info', 0);
    return { type: 'fobhack', u: u.id, b: b.id, done: false };
  }

  // ---------- Sanitäter ----------
  reviveTargets(u) { return this.units.filter((t) => !t.dead && t.downed && t.owner === u.owner && distance(t.c, t.r, u.c, u.r) <= 1); }
  healTargets(u) { return this.units.filter((t) => !t.dead && !t.downed && !t.carried && t !== u && t.owner === u.owner && t.def.cat === 'inf' && t.hp < 90 && distance(t.c, t.r, u.c, u.r) <= 1); }
  revive(u, t) {
    t.downed = 0; t.hp = 40; t.moved = true; t.acted = true;
    u.acted = true; u.moved = true; u.facing = ang(u.c, u.r, t.c, t.r);
    this.players[u.owner].stats.revives++;
    const ev = { type: 'revive', u: u.id, t: t.id, cash: [] };
    this.pay(u.owner, PAY.revive * this.hzMult(u.c, u.r), 'Wiederbelebt', t.c, t.r, ev.cash);
    this.gainXp(u, 12, ev);
    return ev;
  }
  heal(u, t) {
    const h = Math.min(100 - t.hp, 30); t.hp += h;
    u.acted = true; u.moved = true; u.facing = ang(u.c, u.r, t.c, t.r);
    const ev = { type: 'healed', u: u.id, t: t.id, amount: h, cash: [] };
    this.pay(u.owner, PAY.heal * this.hzMult(u.c, u.r), 'Verbunden', t.c, t.r, ev.cash);
    return ev;
  }

  // ---------- Logistik: Paletten ----------
  canLoadPallet(u) { return !!u.def.pallets && u.owner === this.current && (u.cargoP || []).length < u.def.pallets && !(u.passengers || []).length && this.inSafe(u.c, u.r, u.owner) && !u.dead; }
  loadPallet(u, kind) {
    const p = this.players[u.owner], d = PALLETS[kind];
    if (!this.canLoadPallet(u) || p.credits < d.cost) return false;
    p.credits -= d.cost; p.stats.spent += d.cost; u.cargoP.push(kind);
    return true;
  }
  canDropPallets(u) { return (u.cargoP || []).length > 0 && !u.acted && u.owner === this.current && !!this.fobCovering(u.owner, u.c, u.r); }
  dropPallets(u) {
    const f = this.fobCovering(u.owner, u.c, u.r);
    const near = distance(f.c, f.r, this.cz.c, this.cz.r) <= this.cz.rad + 3;
    const ev = { type: 'pallet', u: u.id, b: f.id, items: [...u.cargoP], cash: [] };
    for (const k of u.cargoP) { f.stock[k] += PALLETS[k].amount; if (near) this.pay(u.owner, PAY.pallet, 'Lieferprämie', f.c, f.r, ev.cash); }
    u.cargoP = []; u.acted = true; u.moved = true;
    if (u.owner === 0) this.say(near ? 'Paletten abgeladen — Lager aufgefüllt, Lieferprämie kassiert' : 'Paletten abgeladen (Prämie gibt es nur für Vorposten nahe der Control Zone)', 'good');
    return ev;
  }

  // ---------- Kaufen ----------
  spzOf(o) { const p = this.players[o]; const s = this.get(p.spzId); return s && !s.dead ? s : null; }
  spzReady(o) { const s = this.spzOf(o); return !!s && !s.carried && s.antenna && s.hp >= 50 && this.players[o].deploys > 0; }
  spawnHexes(o, type, at) {
    const air = UNITS[type].mt === 'air';
    let cands;
    if (at === 'spz') { const s = this.spzOf(o); cands = s ? neighbors(s.c, s.r, this.W, this.H) : []; }
    else cands = this.safeHexes(o).sort((a, b) => distance(a[0], a[1], this.cz.c, this.cz.r) - distance(b[0], b[1], this.cz.c, this.cz.r));
    return cands.filter(([c, r]) => (air ? !this.unitAt(c, r, true) : this.groundFree(c, r) && this.cost(UNITS[type].mt, c, r) !== Infinity) && (this.safeOwner(c, r) < 0 || this.safeOwner(c, r) === o));
  }
  canBuy(o, type, at = 'hq') {
    const d = UNITS[type], p = this.players[o];
    if (!d || d.noBuy || (d.faction && d.faction !== p.faction) || this.current !== o) return false;
    if (at === 'spz' && (d.cat !== 'inf' || !this.spzReady(o))) return false;
    if (d.free) { if (p.rekrutRound === this.round || this.ownUnits(o).filter((u) => !u.downed).length >= 5) return false; }
    else if (p.credits < this.unitCost(o, type)) return false;
    return this.spawnHexes(o, type, at).length > 0;
  }
  buy(o, type, at = 'hq') {
    if (!this.canBuy(o, type, at)) return null;
    const p = this.players[o], d = UNITS[type], h = this.spawnHexes(o, type, at)[0];
    const cost = d.free ? 0 : this.unitCost(o, type);
    p.credits -= cost; p.stats.spent += cost;
    if (d.free) p.rekrutRound = this.round;
    if (at === 'spz') p.deploys--;
    const u = this.addUnit(o, type, h[0], h[1]);
    u.moved = true; u.acted = true; u.fresh = true;
    p.order.push(type);
    const src = at === 'spz' ? this.spzOf(o) : this.hqOf(o);
    return { type: 'spawn', u: u.id, from: src ? src.id : 0, at };
  }

  // ---------- Rundenbeginn einer Fraktion ----------
  beginTurn(owner) {
    const ev = [];
    this.current = owner;
    const p = this.players[owner];
    if (p.order.length) { p.lastOrder = [...p.order]; p.order = []; }
    p.deploys = SPZ_DEPLOYS;
    // Hack-Versuche, deren Hacker nicht mehr an der Konsole steht, brechen ab
    for (const b of this.buildings) if (!b.dead && b.hack && b.hack.owner === owner) { const h = this.get(b.hack.by); if (!h || h.downed || distance(h.c, h.r, b.c, b.r) > 1) b.hack = null; }
    for (const u of this.units) {
      if (u.dead || u.owner !== owner) continue;
      if (u.downed) {
        u.downed--;
        if (u.downed <= 0) { u.downed = 1; this.kill(u, null); ev.push({ type: 'bleed', u: u.id }); if (owner === 0) this.say(`${u.def.name} ist verblutet`, 'bad'); continue; }
        u.moved = true; u.acted = true; continue;
      }
      u.moved = false; u.acted = false; u.attacked = false; u.reflex = false; u.ambushed = false; u.fresh = false; u.didLand = false;
      if (u.def.flares) u.flareReady = true;
      if (u.rank && RANKS[u.rank].regen && u.hp < 100) u.hp = Math.min(100, u.hp + RANKS[u.rank].regen);
      if (u.landed && u.hp < 100) { const h = Math.min(100 - u.hp, 15); u.hp += h; ev.push({ type: 'heal', u: u.id, amount: h }); }
      // Nachschub: am eigenen HQ oder im FOB-Bereich
      const atHq = this.inSafe(u.c, u.r, owner), fob = this.fobCovering(owner, u.c, u.r);
      if (u.def.ammo && u.ammo < u.def.ammo && (atHq || (fob && (u.def.mt !== 'air' || this.buildings.some((b) => !b.dead && b.type === 'werkstatt' && b.fob === fob.id && b.turnsLeft <= 0))))) { u.ammo = u.def.ammo; ev.push({ type: 'rearm', u: u.id }); }
      if (atHq && u.hp < 100) { const h = Math.min(100 - u.hp, 25); u.hp += h; if (u.def.spawnPoint && u.hp >= 50) u.antenna = true; ev.push({ type: 'heal', u: u.id, amount: h }); }
      else if (fob && (u.def.cat === 'veh' || u.def.mt === 'air') && u.hp < 100 && this.buildings.some((b) => !b.dead && b.type === 'werkstatt' && b.owner === owner && b.fob === fob.id && b.turnsLeft <= 0)) {
        const h = Math.min(100 - u.hp, 25); u.hp += h; if (u.def.spawnPoint && u.hp >= 50) u.antenna = true; ev.push({ type: 'heal', u: u.id, amount: h });
      }
    }
    for (const b of this.buildings) if (!b.dead && b.owner === owner) { b.attacked = false; b.reflex = false; b.acted = false; }
    return ev;
  }

  // Rundenende einer Fraktion: Stellungen feuern selbstständig, Reaktionsfeuer wird scharf
  endTurnEvents(owner) {
    const ev = [];
    for (const b of this.buildings) {
      if (b.dead || b.owner !== owner || !b.def.weapon || !this.canFire(b)) continue;
      const ts = this.targetsFrom(b, b.c, b.r, false).filter((t) => owner !== 0 || this.visible[this.i(t.c, t.r)]);
      if (!ts.length) continue;
      ts.sort((a, c) => this.calcDamage(b, c) / Math.max(1, this.hpPct(c)) - this.calcDamage(b, a) / Math.max(1, this.hpPct(a)));
      ev.push(this.attack(b, ts[0]));
    }
    for (const e of [...this.units, ...this.buildings]) {
      if (e.dead || e.owner !== owner) continue;
      const w = this.weapon(e);
      e.reflex = !!w && !e.attacked && !w.noMoveFire && !(e.isUnit && (e.carried || e.downed));
      if (e.isUnit) e.suppressed = 0;
    }
    return ev;
  }

  // ---------- Weltphase: Wertung, Zonengeld, Hot Zone, Bohrtürme ----------
  worldPhase() {
    const ev = [];
    // 1. Wertung
    const lead = this.leader();
    const heads = this.players.map((p) => ({ ...p.heads }));
    if (lead >= 0) { this.players[lead].score++; this.players[lead].stats.ticks++; }
    ev.push({ type: 'tick', leader: lead, heads, scores: this.players.map((p) => p.score) });
    // 2. Zonengeld für alle, je Kopf
    for (const p of this.players) {
      const h = this.headsOf(p.id);
      const amt = h.cz * PAY.cz + h.hz * PAY.hz;
      if (amt > 0) {
        const got = this.pay(p.id, amt, 'Zonengeld');
        ev.push({ type: 'zonepay', owner: p.id, amount: got, at: h.at.map((u) => { const q = this.bodyPos(u); return { c: q.c, r: q.r, hz: this.inHZ(q.c, q.r) }; }) });
      }
    }
    // 3. Einsatz-SPz freischalten
    if (!this.spzUnlocked && this.players.some((p) => p.score >= this.spzAt)) {
      this.spzUnlocked = true;
      for (const p of this.players) this.spawnSpz(p.id, ev);
      this.say(`${this.spzAt} Punkte erreicht: Alle Fraktionen erhalten ihren Einsatz-SPz`, 'good');
    }
    for (const p of this.players) if (this.spzUnlocked && !this.spzOf(p.id) && p.spzCd > 0) { p.spzCd--; if (p.spzCd <= 0) this.spawnSpz(p.id, ev); }
    // 4. Bohrtürme verbrauchen Treibstoff
    for (const b of this.buildings) {
      if (b.dead || b.type !== 'bohrturm' || !b.drillOn) continue;
      const f = this.fobOfB(b);
      if (!f || f.stock.sprit <= 0) { b.drillOn = false; if (b.owner === 0) this.say('Bohrturm steht still — kein Treibstoff', 'warn'); continue; }
      f.stock.sprit--;
    }
    // 5. Hot Zone zieht weiter
    const from = { c: this.hz.c, r: this.hz.r };
    if (this.hz.lock > 0) { this.hz.lock--; if (this.hz.lock <= 0) { this.hz.lockTower = -1; if (true) this.say('Die Hot Zone ist wieder frei', 'info'); } }
    else { const n = this.hz.next || this.hzStep(); this.hz.c = n.c; this.hz.r = n.r; this.hz.dir = n.dir; }
    this.hz.next = this.hzStep();
    ev.push({ type: 'hzmove', from, to: { c: this.hz.c, r: this.hz.r } });
    for (const t of this.towers) if (t.cd > 0) t.cd--;
    this.round++;
    return ev;
  }
  spawnSpz(o, ev) {
    const h = this.spawnHexes(o, 'spz', 'hq')[0]; if (!h) return;
    const u = this.addUnit(o, 'spz', h[0], h[1]);
    u.moved = true; u.acted = true;
    this.players[o].spzId = u.id; this.players[o].spzCd = 0;
    ev.push({ type: 'spawn', u: u.id, from: this.hqOf(o)?.id || 0, spz: true });
    if (o === 0) this.say('Euer Einsatz-SPz steht am HQ bereit — fahrt ihn nach vorn und setzt dort neue Infanterie ein', 'good');
  }

  // ---------- Tageszeit ----------
  dayPhase(round = this.round) { return ['morgen', 'tag', 'tag', 'tag', 'abend', 'nacht', 'nacht', 'morgen'][(round - 1) % 8]; }
  isNight() { return this.dayPhase() === 'nacht'; }

  // ---------- Sicht ----------
  sightOf(e) {
    if (e.isBuilding) return e.def.sight || 1;
    let s = e.def.sight + (RANKS[e.rank || 0].sight || 0);
    if (e.def.mt !== 'air') { s += TERRAIN[this.terr(e.c, e.r)].sight || 0; if (this.isNight()) s -= 1; }
    if (e.downed) s = 1;
    return Math.max(1, s);
  }
  updateVision() {
    this.visible.fill(0);
    const reveal = (c, r, rad) => { for (const [x, y] of ring(c, r, rad, this.W, this.H)) this.visible[this.i(x, y)] = 1; };
    for (const u of this.units) if (!u.dead && u.owner === 0 && !u.carried) reveal(u.c, u.r, this.sightOf(u));
    for (const b of this.buildings) if (!b.dead && b.owner === 0 && b.turnsLeft <= 0) reveal(b.c, b.r, this.sightOf(b));
    for (const t of this.towers) if (t.owner === 0) reveal(t.c, t.r, 1);
    for (const b of this.buildings) if (!b.dead && this.visible[this.i(b.c, b.r)]) this.discovered.add(b.id);
  }
  seen(e) {
    if (e.owner === 0) return true;
    if (e.isBuilding) return e.type === 'hq' || this.discovered.has(e.id) || !!this.visible[this.i(e.c, e.r)];
    return !!this.visible[this.i(e.c, e.r)] && !this.stealthed(e, 0);
  }

  checkEnd() {
    const win = this.players.find((p) => p.score >= this.target);
    if (win) this.state = win.id === 0 ? 'won' : 'lost';
    return this.state;
  }

  // ---------- Speichern ----------
  serialize() {
    const strip = (o) => { const c = { ...o }; for (const k of ['def', 'vis', 'anim', 'gone', 'hitFlash', 'recoil', 'forceShow', 'crashing', 'aimUntil', 'z', 'bank']) delete c[k]; return c; };
    return JSON.stringify({ v: 1, W: this.W, H: this.H, seed: this.map.seed, ter: this.map.ter, round: this.round, current: this.current, target: this.target, spzUnlocked: this.spzUnlocked,
      players: this.players, units: this.units.filter((u) => !u.dead).map(strip), buildings: this.buildings.filter((b) => !b.dead).map(strip),
      cz: this.cz, hz: this.hz, towers: this.towers, known: this.known.map((s) => [...s]), codeUses: this.codeUses, discovered: [...this.discovered],
      diffName: this.diffName, settings: this.settings || null, konto: !!this.konto });
  }
  static restore(map, data, diff) {
    map.ter = data.ter;
    const g = new Game(map, { diff, factions: data.players.map((p) => p.faction), target: data.target });
    g.diffName = data.diffName; g.round = data.round; g.current = 0; g.settings = data.settings || null; g.konto = data.konto;
    g.spzUnlocked = data.spzUnlocked;
    g.players = data.players.map((p) => ({ ...p, perk: FACTIONS[p.faction].perk || {} }));
    g.units = data.units.map((u) => ({ ...u, def: u.landed ? g.landedDef(u.type) : UNITS[u.type] }));
    g.buildings = data.buildings.map((b) => ({ ...b, def: BUILDINGS[b.type], rise: 1 }));
    g.cz = data.cz; g.hz = data.hz; g.towers = data.towers; g.known = data.known.map((a) => new Set(a)); g.codeUses = data.codeUses;
    g.discovered = new Set(data.discovered || []);
    for (const e of [...g.units, ...g.buildings]) { g.byId.set(e.id, e); NEXT = Math.max(NEXT, e.id + 1); }
    g.rnd = mulberry32(map.seed * 7 + data.round * 131);
    g.updateVision();
    return g;
  }
  cleanup() {
    this.units = this.units.filter((u) => !u.dead);
    this.buildings = this.buildings.filter((b) => !b.dead);
  }
}
