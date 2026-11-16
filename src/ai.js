// Gegner-KI: Zonenkontrolle, Einkauf, Transport, Vorposten, Turmcodes, Logistik
import { UNITS, BUILDINGS, PALLETS, WEAPONS, AMMO, AMMO_ORDER, BUILD_LIST } from './data.js';
import { neighbors, distance, ring } from './hex.js';

function value(g, e) {
  if (e.isBuilding) return e.type === 'fob' ? 2500 : e.type === 'bohrturm' ? 2200 : 700;
  const v = e.def.cost || 600;
  return Math.max(500, v) * (e.downed ? 0.6 : 1) + (e.def.spawnPoint ? 3000 : 0) + (e.passengers || []).length * 1200;
}
// Grobe Gefahrenkarte: wie viel Feuer kann ein Gegner nächste Runde auf ein Feld legen
function dangerMap(g, owner) {
  const d = new Float32Array(g.W * g.H);
  for (const e of g.units) {
    if (e.dead || e.owner === owner || e.carried || e.downed) continue;
    const w = g.weapon(e); if (!w || !w.ground) continue;
    const reach = (w.noMoveFire ? 0 : Math.min(6, e.def.move)) + w.range[1];
    const pw = w.power / 100;
    for (const [c, r] of ring(e.c, e.r, reach, g.W, g.H)) d[g.i(c, r)] += pw * (distance(c, r, e.c, e.r) <= w.range[1] ? 1.2 : 0.6);
  }
  for (const b of g.buildings) {
    if (b.dead || b.owner === owner || !b.def.weapon || b.turnsLeft > 0) continue;
    const w = WEAPONS[b.def.weapon]; if (!w.ground) continue;
    for (const [c, r] of ring(b.c, b.r, w.range[1], g.W, g.H)) d[g.i(c, r)] += w.power / 100;
  }
  return d;
}
function airDanger(g, owner) {
  const d = new Float32Array(g.W * g.H);
  for (const e of [...g.units, ...g.buildings]) {
    if (e.dead || e.owner === owner || (e.isUnit && (e.carried || e.downed)) || (e.isBuilding && e.turnsLeft > 0)) continue;
    const w = g.weapon(e); if (!w || !w.air) continue;
    const mod = { sam: 1.4, ciws: 1.3, minigun: 0.8, at: 0.5, mg: 0.4, hmg: 0.5 }[w.type] || 0.15;
    const reach = (e.isUnit && !w.noMoveFire ? Math.min(5, e.def.move) : 0) + w.range[1];
    for (const [c, r] of ring(e.c, e.r, reach, g.W, g.H)) d[g.i(c, r)] += mod;
  }
  return d;
}
const nearest = (u, list) => { let best = null, bd = Infinity; for (const e of list) { const d = distance(u.c, u.r, e.c, e.r); if (d < bd) { bd = d; best = e; } } return best; };
const alive = (u) => u && !u.dead && !u.downed;

// ---------- KI-Zug ----------
export async function aiTurn(g, act, owner) {
  const me = g.players[owner];
  const ctx = {
    danger: dangerMap(g, owner), air: airDanger(g, owner), claims: new Set(), owner,
    hq: g.hqOf(owner), spz: g.spzOf(owner), fob: g.fobsOf(owner)[0] || null,
  };
  // Munition passend zum Gelände der Gegner
  const foes = g.units.filter((e) => !e.dead && e.owner !== owner && !e.carried);
  const armorShare = foes.length ? foes.filter((e) => e.def.armor !== 'inf').length / foes.length : 0;

  // Bohrturm starten
  for (const b of g.buildings) if (!b.dead && b.owner === owner && g.canStartDrill(b)) await act.act(g.startDrill(b));

  // Reihenfolge: Sanitäter zuerst (Rettungen), dann Fernkampf, dann Rest; Transporter am Schluss
  const mine = g.ownUnits(owner).filter((u) => !u.downed && !u.carried);
  const order = mine.sort((a, b) => prio(g, a) - prio(g, b));
  for (const u of order) {
    if (u.dead || u.downed || u.carried || u.acted || g.state !== 'play') continue;
    if (u.fresh) continue;
    try { await unitTurn(g, act, u, ctx, armorShare); } catch (e) { console.warn('KI-Fehler', u.type, e); u.acted = true; }
  }
  // Stellungen feuern aktiv auf das lohnendste Ziel
  for (const b of g.buildings) {
    if (b.dead || b.owner !== owner || !b.def.weapon || !g.canFire(b) || g.state !== 'play') continue;
    let bt = null, b2 = 0;
    for (const t of g.targetsFrom(b, b.c, b.r, false)) { const f = g.forecast(b, t); const sc = f.dmg / 100 * value(g, t) + (f.kills || f.downs ? value(g, t) * 0.5 : 0); if (sc > b2) { b2 = sc; bt = t; } }
    if (bt) await act.attack(b, bt);
  }
  if (g.state === 'play') await aiShop(g, act, owner, ctx);
}

function prio(g, u) {
  if (u.def.medic) return 0;
  const w = g.weapon(u);
  if (w && w.noMoveFire) return 1;
  if (u.def.transport && u.def.cat !== 'inf') return 5;
  if (u.def.pallets) return 6;
  if (u.def.builder) return 3;
  return 2;
}

// ---------- Einzelne Einheit ----------
async function unitTurn(g, act, u, ctx, armorShare) {
  const owner = u.owner;
  // Munitionswahl
  const w = g.weapon(u);
  if (w && w.ammoSel) u.ammoType = armorShare > 0.5 ? 'ap' : armorShare < 0.15 ? 'hp' : 'fmj';
  // Spezialaufgaben
  if (u.def.medic && await medicTurn(g, act, u, ctx)) return;
  if (u.def.builder && await builderTurn(g, act, u, ctx)) return;
  if (u.def.pallets && await logisticsTurn(g, act, u, ctx)) return;
  if (u.def.transport && u.def.cat !== 'inf' && await ferryTurn(g, act, u, ctx)) return;
  if (g.isFootInf(u) && await towerTurn(g, act, u, ctx)) return;
  if (g.isFootInf(u) && g.canHackFob(u)) { await act.act(g.hackFob(u, g.hackFobTargets(u)[0])); return; }
  await combatTurn(g, act, u, ctx);
}

// Zonenwert eines Feldes für diese Einheit (Bodeneinheiten wollen in die Hot Zone)
function zoneScore(g, u, c, r) {
  if (u.def.mt === 'air') return 0;
  if (g.inHZ(c, r)) return 70;
  if (g.inCZ(c, r)) return 30 - distance(c, r, g.hz.c, g.hz.r) * 2;
  return -distance(c, r, g.hz.c, g.hz.r) * 3;
}

async function combatTurn(g, act, u, ctx) {
  const w = g.weapon(u);
  const reach = g.reachable(u);
  const danger = g.isAir(u) ? ctx.air : ctx.danger;
  const curZone = zoneScore(g, u, u.c, u.r);
  // Beste Angriffsoption
  if (w && !(w.ammo && u.ammo <= 0) && !g.inSafe(u.c, u.r, u.owner)) {
    let best = null, bs = 15;
    const consider = w.noMoveFire ? [reach.get(g.i(u.c, u.r))] : [...reach.values()];
    for (const n of consider) {
      if (!n || !n.end || g.inSafe(n.c, n.r, u.owner)) continue;
      for (const t of g.targetsFrom(u, n.c, n.r, false)) {
        const oc = u.c, or = u.r; u.c = n.c; u.r = n.r;
        const f = g.forecast(u, t, n.c, n.r);
        u.c = oc; u.r = or;
        let s = f.dmg / 100 * value(g, t) - f.counter / 100 * value(g, u) * 0.9;
        if (f.kills || f.finish) s += value(g, t) * 0.6;
        if (f.downs) s += value(g, t) * 0.35;
        if (f.flare) s -= 300;
        if (s > 0 && g.bounty(t.owner) > 1) s *= 1.35;       // gemeinsam gegen den Punkteführer
        if (t.isUnit && g.inHZ(t.c, t.r)) s += 160;          // Köpfe aus der Hot Zone holen
        else if (t.isUnit && g.inCZ(t.c, t.r)) s += 70;
        if (t.isUnit && t.def.spawnPoint && t.antenna) s += 400;
        if (u.hp < 40 && !f.kills) s -= 80;
        s += (zoneScore(g, u, n.c, n.r) - curZone) * 3;
        s -= danger[g.i(n.c, n.r)] * 40;
        if (!g.isAir(u)) s += g.coverAt({ ...u, c: n.c, r: n.r, isUnit: true, def: u.def, owner: u.owner }) * 60;
        s -= n.cost * 2;
        if (s > bs) { bs = s; best = { n, t }; }
      }
    }
    if (best) {
      if (best.n.c !== u.c || best.n.r !== u.r) await act.move(u, best.n.c, best.n.r, reach);
      if (alive(u) && !best.t.dead && g.canFire(u)) await act.attack(u, best.t);
      return;
    }
  }
  // Leergeschossen: zurück zum Nachschub
  if (w && w.ammo && u.ammo <= 0) { const home = ctx.fob && distance(u.c, u.r, ctx.fob.c, ctx.fob.r) < distance(u.c, u.r, ctx.hq.c, ctx.hq.r) ? ctx.fob : ctx.hq; await moveToward(g, act, u, home.c, home.r, reach); return; }
  // Artillerie: auf Feuerposition, aber nicht in die Zone
  if (w && w.noMoveFire) {
    let best = null, bs = -1e9;
    for (const n of reach.values()) {
      if (!n.end) continue;
      const dz = distance(n.c, n.r, g.hz.c, g.hz.r);
      const s = -Math.abs(dz - (w.range[1] - 1)) * 10 - ctx.danger[g.i(n.c, n.r)] * 50 - n.cost;
      if (s > bs) { bs = s; best = n; }
    }
    if (best && (best.c !== u.c || best.r !== u.r)) await act.move(u, best.c, best.r, reach);
    return;
  }
  // Schwer angeschlagen: zurück zur Werkstatt / zum HQ
  if (u.hp < 30 && (u.def.cat === 'veh' || u.def.mt === 'air')) {
    const home = ctx.fob && g.buildings.some((b) => !b.dead && b.type === 'werkstatt' && b.fob === ctx.fob.id) ? ctx.fob : ctx.hq;
    if (distance(u.c, u.r, home.c, home.r) > 1) { await moveToward(g, act, u, home.c, home.r, reach); return; }
  }
  // Kampfhubschrauber: über der Zone kreisen, weg von Luftabwehr
  if (g.isAir(u)) {
    let best = null, bs = -1e9;
    for (const n of reach.values()) { if (!n.end) continue; const s = -distance(n.c, n.r, g.hz.c, g.hz.r) * 4 - ctx.air[g.i(n.c, n.r)] * 30 + (distance(n.c, n.r, g.hz.c, g.hz.r) >= 2 ? 6 : 0); if (s > bs) { bs = s; best = n; } }
    if (best && (best.c !== u.c || best.r !== u.r)) await act.move(u, best.c, best.r, reach);
    return;
  }
  // Bodeneinheit: in die Hot Zone, sonst in die Control Zone, Deckung bevorzugt
  let best = null, bs = -1e9;
  for (const n of reach.values()) {
    if (!n.end) continue;
    let s = zoneScore(g, u, n.c, n.r) * 1.5 + g.coverAt({ ...u, c: n.c, r: n.r }) * 40 - ctx.danger[g.i(n.c, n.r)] * (g.inHZ(n.c, n.r) ? 10 : 25) - n.cost * 0.5;
    if (g.hzNextHas(n.c, n.r)) s += 8;
    if (s > bs) { bs = s; best = n; }
  }
  if (best && zoneScore(g, u, best.c, best.r) > -15) { if (best.c !== u.c || best.r !== u.r) await act.move(u, best.c, best.r, reach); }
  else await moveToward(g, act, u, g.hz.c, g.hz.r, reach);
  // Nach dem Zug noch schießen
  if (alive(u) && g.canFire(u)) { const t = bestShot(g, u); if (t) await act.attack(u, t); }
}
function bestShot(g, u) {
  let bt = null, b2 = 20;
  for (const t of g.targetsFrom(u, u.c, u.r, false)) { const f = g.forecast(u, t); const s = f.dmg / 100 * value(g, t) - f.counter / 100 * value(g, u) + (f.kills || f.downs || f.finish ? value(g, t) * 0.4 : 0); if (s > b2) { b2 = s; bt = t; } }
  return bt;
}
async function moveToward(g, act, u, tc, tr, reach = g.reachable(u)) {
  if (u.c === tc && u.r === tr) return false;
  const field = g.distanceField(u);
  let gc = tc, gr = tr;
  if (field.d[g.i(tc, tr)] === Infinity) { let bd = Infinity; for (const [c, r] of ring(tc, tr, 2, g.W, g.H)) if (field.d[g.i(c, r)] < bd) { bd = field.d[g.i(c, r)]; gc = c; gr = r; } }
  const st = g.stepToward(u, field, gc, gr, reach);
  if (st && (st.c !== u.c || st.r !== u.r)) { await act.move(u, st.c, st.r, reach); return true; }
  return false;
}

// ---------- Sanitäter ----------
async function medicTurn(g, act, u, ctx) {
  const down = g.units.filter((t) => !t.dead && t.downed && t.owner === u.owner);
  // Direkt retten oder hinlaufen und retten
  const reach = g.reachable(u);
  let best = null, bd = Infinity;
  for (const t of down) for (const n of reach.values()) { if (!n.end || distance(n.c, n.r, t.c, t.r) > 1) continue; const d = n.cost + ctx.danger[g.i(n.c, n.r)] * 3; if (d < bd) { bd = d; best = { n, t }; } }
  if (best) {
    if (best.n.c !== u.c || best.n.r !== u.r) await act.move(u, best.n.c, best.n.r, reach);
    if (alive(u) && !u.acted && g.reviveTargets(u).includes(best.t)) await act.act(g.revive(u, best.t));
    return true;
  }
  const hurt = g.healTargets(u).sort((a, b) => a.hp - b.hp)[0];
  if (hurt && hurt.hp < 60) { await act.act(g.heal(u, hurt)); return true; }
  // Verwundete außer Reichweite: dorthin
  const far = nearest(u, down);
  if (far && distance(u.c, u.r, far.c, far.r) <= 8) { await moveToward(g, act, u, far.c, far.r, reach); return true; }
  return false;
}

// ---------- Pionier: FOB, Bauen, Hämmern, Reparieren ----------
function fobSpot(g, owner) {
  // gutes Feld: am Rand der Control Zone (Drill zieht die Hot Zone dann gut heran), nicht neben anderen FOBs
  let best = null, bs = -1e9;
  for (const [c, r] of ring(g.cz.c, g.cz.r, g.cz.rad + 1, g.W, g.H)) {
    const dz = distance(c, r, g.cz.c, g.cz.r); if (dz < 2) continue;
    if (!g.in(c, r) || g.buildingAt(c, r) || g.towerAt(c, r)) continue;
    const t = g.terr(c, r); if (t === 'wasser' || t === 'fels' || t === 'bruecke') continue;
    if (g.players.some((p) => distance(c, r, g.map.starts[p.id].c, g.map.starts[p.id].r) <= 4)) continue;
    if (g.buildings.some((b) => !b.dead && b.type === 'fob' && distance(b.c, b.r, c, r) <= 4)) continue;
    const s = -distance(c, r, g.map.starts[owner].c, g.map.starts[owner].r) * 1.5 - Math.abs(dz - 3) * 4 + (t === 'ort' ? 4 : t === 'wald' ? 2 : 0);
    if (s > bs) { bs = s; best = { c, r }; }
  }
  return best;
}
async function builderTurn(g, act, u, ctx) {
  const owner = u.owner, p = g.players[owner];
  // Fertigbauen hat Vorrang
  const site = g.hammerTargets(u)[0];
  if (site) { await act.act(g.hammer(u, site)); return true; }
  const rep = g.repairTargets(u).find((t) => t.isUnit ? t.hp < 60 || t.antenna === false : t.hp < t.maxHp * 0.5);
  if (rep) { await act.act(g.repair(u, rep)); return true; }
  const myFobs = g.fobsOf(owner);
  // Noch kein Vorposten: hin und aufbauen
  if (!myFobs.length) {
    if (p.credits < BUILDINGS.fob.cash) return false;
    if (g.canDeployFob(u)) { const hx = g.fobHexes(u).filter(([c, r]) => distance(c, r, g.cz.c, g.cz.r) <= g.cz.rad + 1).sort((a, b) => Math.abs(distance(a[0], a[1], g.cz.c, g.cz.r) - 3) - Math.abs(distance(b[0], b[1], g.cz.c, g.cz.r) - 3))[0]; if (hx) { await act.act(g.deployFob(u, hx[0], hx[1])); return true; } }
    const spot = fobSpot(g, owner); if (!spot) return false;
    if (ctx.claims.has('fob')) return false; ctx.claims.add('fob');
    await moveToward(g, act, u, spot.c, spot.r);
    if (alive(u) && !u.acted && g.canDeployFob(u)) { const hx = g.fobHexes(u).filter(([c, r]) => distance(c, r, g.cz.c, g.cz.r) <= g.cz.rad + 1)[0]; if (hx) await act.act(g.deployFob(u, hx[0], hx[1])); }
    return true;
  }
  const fob = nearest(u, myFobs);
  // Im FOB-Bereich: bauen nach Bedarf
  const wish = buildWish(g, owner, fob);
  if (wish && g.canBuild(u, wish)) {
    const hexes = g.buildHexes(u, wish);
    const pick = wish === 'hesco' || wish === 'bremer' ? hexes.sort((a, b) => distance(b[0], b[1], fob.c, fob.r) - distance(a[0], a[1], fob.c, fob.r))[0] : hexes.sort((a, b) => distance(a[0], a[1], fob.c, fob.r) - distance(b[0], b[1], fob.c, fob.r))[0];
    if (pick) { await act.act(g.placeStructure(u, wish, pick[0], pick[1])); return true; }
  }
  // Zur nächsten Baustelle oder in den FOB-Bereich
  const sites = g.buildings.filter((b) => !b.dead && b.owner === owner && b.turnsLeft > 0);
  const goal = nearest(u, sites) || (distance(u.c, u.r, fob.c, fob.r) > 1 && wish ? fob : null);
  if (goal) {
    const reach = g.reachable(u);
    let bn = null, bd = Infinity;
    for (const n of reach.values()) { if (!n.end) continue; const d = Math.max(0, distance(n.c, n.r, goal.c, goal.r) - 1) * 10 + ctx.danger[g.i(n.c, n.r)] * 5 + n.cost * 0.1; if (d < bd) { bd = d; bn = n; } }
    if (bn && (bn.c !== u.c || bn.r !== u.r)) await act.move(u, bn.c, bn.r, reach);
    if (alive(u) && !u.acted) { const s2 = g.hammerTargets(u)[0]; if (s2) { await act.act(g.hammer(u, s2)); return true; } if (wish && g.canBuild(u, wish)) { const h = g.buildHexes(u, wish)[0]; if (h) await act.act(g.placeStructure(u, wish, h[0], h[1])); } }
    return true;
  }
  return false;
}
function buildWish(g, owner, fob) {
  const have = (t) => g.buildings.filter((b) => !b.dead && b.owner === owner && b.type === t && b.fob === fob.id).length;
  const enemyAir = g.units.some((e) => !e.dead && e.owner !== owner && e.def.mt === 'air' && distance(e.c, e.r, fob.c, fob.r) <= 10);
  const stock = fob.stock.bau;
  const list = [];
  if (enemyAir && !have('sam') && !have('ciws')) list.push('sam');
  if (!have('moerser')) list.push('moerser');
  if (have('hesco') < 2) list.push('hesco');
  if (!have('bohrturm') && !g.buildings.some((b) => !b.dead && b.owner === owner && b.type === 'bohrturm')) list.push('bohrturm');
  if (!have('werkstatt') && g.ownUnits(owner).some((x) => x.def.cat === 'veh' || x.def.mt === 'air')) list.push('werkstatt');
  if (have('sandsack') < 2) list.push('sandsack');
  if (enemyAir && !have('ciws')) list.push('ciws');
  if (have('hesco') < 4) list.push('hesco');
  for (const t of list) if (stock >= BUILDINGS[t].bau) return t;
  return null;
}

// ---------- Logistik: Paletten zum FOB ----------
async function logisticsTurn(g, act, u, ctx) {
  const owner = u.owner, p = g.players[owner];
  const fob = g.fobsOf(owner).sort((a, b) => distance(a.c, a.r, g.cz.c, g.cz.r) - distance(b.c, b.r, g.cz.c, g.cz.r))[0];
  if (!fob) return u.def.transport ? false : (await moveToward(g, act, u, ctx.hq.c, ctx.hq.r), true);
  const drill = g.buildings.find((b) => !b.dead && b.owner === owner && b.type === 'bohrturm' && b.fob === fob.id);
  if ((u.cargoP || []).length) {
    if (g.canDropPallets(u)) { await act.act(g.dropPallets(u)); return true; }
    await moveToward(g, act, u, fob.c, fob.r, g.reachable(u, g.moveOf(u)));
    if (alive(u) && g.canDropPallets(u)) await act.act(g.dropPallets(u));
    return true;
  }
  if ((u.passengers || []).length) return false;
  if (g.inSafe(u.c, u.r, owner)) {
    const reserve = 1500;
    const want = drill && fob.stock.sprit < 8 ? 'sprit' : fob.stock.bau < 40 ? 'bau' : drill && fob.stock.sprit < 14 ? 'sprit' : null;
    if (!want) return false;
    while (g.canLoadPallet(u) && p.credits >= PALLETS[want].cost + reserve) g.loadPallet(u, (u.cargoP.length && want === 'sprit' && fob.stock.bau < 20) ? 'bau' : want);
    if (u.cargoP.length) { await moveToward(g, act, u, fob.c, fob.r); return true; }
    return false;
  }
  // leer: zurück zum HQ (Infanterie mitnehmen übernimmt ferryTurn, wenn welche wartet)
  if (u.def.transport && g.units.some((t) => g.canBoard(u, t))) return false;
  await moveToward(g, act, u, ctx.hq.c, ctx.hq.r);
  return true;
}

// ---------- Transport: Trupps vom HQ in die Zone ----------
async function ferryTurn(g, act, u, ctx) {
  const owner = u.owner;
  if (u.def.spawnPoint) {
    // SPz: vorgeschobener Einsatzpunkt hinter der Zone, möglichst in Deckung
    const anchor = ctx.fob || g.cz;
    const reach = g.reachable(u);
    let best = null, bs = -1e9;
    for (const n of reach.values()) { if (!n.end) continue; const dz = distance(n.c, n.r, g.cz.c, g.cz.r); const s = -Math.abs(dz - (g.cz.rad + 1)) * 8 - distance(n.c, n.r, anchor.c, anchor.r) * 2 - ctx.danger[g.i(n.c, n.r)] * 25 + g.coverAt({ ...u, c: n.c, r: n.r }) * 20; if (s > bs) { bs = s; best = n; } }
    if (best && (best.c !== u.c || best.r !== u.r)) await act.move(u, best.c, best.r, reach);
    if (alive(u) && g.canFire(u)) { const t = bestShot(g, u); if (t) await act.attack(u, t); }
    return true;
  }
  const n0 = (u.passengers || []).length;
  // Einsteigen lassen, wer daneben steht und weit von der Zone ist
  if (!u.moved && n0 < u.def.transport) {
    const riders = g.units.filter((t) => g.canBoard(u, t) && distance(t.c, t.r, g.cz.c, g.cz.r) > g.cz.rad + 2 && !t.def.builder || (g.canBoard(u, t) && t.def.builder && g.fobsOf(owner).length === 0 && distance(t.c, t.r, g.cz.c, g.cz.r) > g.cz.rad + 2));
    for (const t of riders) { if ((u.passengers || []).length >= u.def.transport) break; await act.board(u, t); }
  }
  const n = (u.passengers || []).length;
  if (n) {
    // Ziel: Feld am Rand der Zone, von dem aus Aussteigen in die Zone möglich ist
    const reach = g.reachable(u);
    const danger = g.isAir(u) ? ctx.air : ctx.danger;
    let best = null, bs = -1e9;
    for (const nn of reach.values()) {
      if (!nn.end) continue;
      const dz = distance(nn.c, nn.r, g.hz.c, g.hz.r);
      const s = -dz * 6 - danger[g.i(nn.c, nn.r)] * 30 + (g.inCZ(nn.c, nn.r) ? 10 : 0) - (dz < 1 ? 15 : 0);
      if (s > bs) { bs = s; best = nn; }
    }
    if (best && (best.c !== u.c || best.r !== u.r)) await act.move(u, best.c, best.r, reach);
    if (!alive(u)) return true;
    if (g.inCZ(u.c, u.r) || distance(u.c, u.r, g.cz.c, g.cz.r) <= g.cz.rad + 1) {
      while ((u.passengers || []).length && !u.acted) {
        const hx = g.unloadHexes(u).sort((a, b) => distance(a[0], a[1], g.hz.c, g.hz.r) - distance(b[0], b[1], g.hz.c, g.hz.r))[0];
        if (!hx) break;
        await act.unload(u, hx[0], hx[1]);
      }
      u.acted = true;
    }
    if (alive(u) && g.canFire(u)) { const t = bestShot(g, u); if (t) await act.attack(u, t); }
    return true;
  }
  // Leer: zurück, wenn am HQ Infanterie wartet, sonst kämpfen
  const waiting = g.units.filter((t) => !t.dead && t.owner === owner && g.isFootInf(t) && !t.carried && !t.downed && g.inSafe(t.c, t.r, owner)).length;
  if (waiting && !g.inSafe(u.c, u.r, owner) && (!g.weapon(u) || distance(u.c, u.r, g.cz.c, g.cz.r) > 1)) { await moveToward(g, act, u, ctx.hq.c, ctx.hq.r); return true; }
  if (waiting && g.inSafe(u.c, u.r, owner)) return true;   // warten auf Fahrgäste
  return !g.weapon(u) ? (await moveToward(g, act, u, ctx.hq.c, ctx.hq.r), true) : false;
}

// ---------- Funktürme: hacken und Code eingeben ----------
async function towerTurn(g, act, u, ctx) {
  const owner = u.owner;
  if (g.canEnterCode(u) && codeWorth(g, owner, g.towerAt(u.c, u.r))) { await act.act(g.enterCode(u)); return true; }
  if (g.canHack(u)) { await act.act(g.hack(u)); return true; }
  // Türme mit unbekannter Ziffer oder in Feindeshand: einer pro Turm, nur wenn nah
  const need = g.towers.filter((t) => !g.known[owner].has(t.i) || (t.owner !== owner && g.codeKnown(owner) && t.cd <= 0));
  const free = need.filter((t) => !ctx.claims.has('t' + t.i) && !g.units.some((x) => !x.dead && x.owner === owner && x.c === t.c && x.r === t.r));
  const t = nearest(u, free);
  if (!t || distance(u.c, u.r, t.c, t.r) > 7) return false;
  if (u.def.medic || u.def.builder) return false;
  if (g.knownCount(owner) >= 3 && t.owner === owner) return false;
  ctx.claims.add('t' + t.i);
  const reach = g.reachable(u), n = reach.get(g.i(t.c, t.r));
  if (n && n.end) { await act.move(u, t.c, t.r, reach); if (alive(u) && g.canHack(u)) await act.act(g.hack(u)); else if (alive(u) && g.canFire(u)) { const s = bestShot(g, u); if (s) await act.attack(u, s); } return true; }
  await moveToward(g, act, u, t.c, t.r, reach);
  if (alive(u) && g.canFire(u)) { const s = bestShot(g, u); if (s) await act.attack(u, s); }
  return true;
}
function codeWorth(g, owner, tw) {
  if (!tw) return false;
  const near = (c, r, o, d) => g.units.filter((x) => !x.dead && !x.downed && !x.carried && x.def.mt !== 'air' && (o === owner ? x.owner === owner : x.owner !== owner) && distance(x.c, x.r, c, r) <= d).length;
  const atTower = near(tw.c, tw.r, owner, 2) - near(tw.c, tw.r, -1, 2) * 0.8;
  const atHz = near(g.hz.c, g.hz.r, owner, 2) - near(g.hz.c, g.hz.r, -1, 2) * 0.8;
  const leading = g.leader() === owner;
  return atTower - atHz >= (leading ? 3 : 1.5);
}

// ---------- Einkauf ----------
async function aiShop(g, act, owner, ctx) {
  const p = g.players[owner];
  const units = g.ownUnits(owner);
  const count = (t) => units.filter((u) => u.type === t).length;
  const inf = units.filter((u) => u.def.cat === 'inf');
  const foesVeh = g.units.filter((e) => !e.dead && e.owner !== owner && (e.def.armor === 'heavy' || e.def.armor === 'light')).length;
  const foesAir = g.units.filter((e) => !e.dead && e.owner !== owner && e.def.mt === 'air').length;
  const hasFob = g.fobsOf(owner).length > 0;
  const spzFwd = g.spzReady(owner) && distance(ctx.spz?.c ?? 0, ctx.spz?.r ?? 0, g.cz.c, g.cz.r) <= g.cz.rad + 3;
  // Reserve für den Vorposten, solange keiner steht
  const reserve = !hasFob && count('pionier') ? BUILDINGS.fob.cash : 600;
  const wish = [];
  if (!count('pionier') || (hasFob && count('pionier') < 2 && g.round > 6)) wish.push('pionier');
  if (count('sani') < Math.ceil(inf.length / 4)) wish.push('sani');
  if (foesVeh >= 2 && count('panzerjaeger') < Math.ceil(foesVeh / 2)) wish.push('panzerjaeger');
  if (foesAir && count('rotorjeep') + count('panzerjaeger') < foesAir + 1) wish.push(foesAir > 1 ? 'rotorjeep' : 'panzerjaeger');
  if (hasFob && !units.some((u) => u.def.pallets) && p.credits > 9000) wish.push('laster');
  if (p.credits > 26000 && count('kampfheli') < 1) wish.push('kampfheli');
  if (p.credits > 17000 && count('panzer') < 2) wish.push('panzer');
  const sp = { ironstar: 'sperber', volkhova: 'grad', simurgh: 'drohnen' }[p.faction];
  if (p.credits > (sp === 'drohnen' ? 7000 : 16000) && count(sp) < (sp === 'drohnen' ? 2 : 1)) wish.push(sp);
  if (p.credits > 20000 && count('artillerie') < 1 && g.round > 8) wish.push('artillerie');
  const transportCap = units.filter((u) => u.def.transport && u.def.cat !== 'inf' && !u.def.spawnPoint).reduce((a, u) => a + u.def.transport, 0);
  if (!spzFwd && transportCap < 2 + Math.floor(g.round / 10) * 2) wish.push(p.credits > 14000 && g.round > 6 ? 'heli' : 'jeep');
  if (count('mgtrupp') < 1 + Math.floor(inf.length / 6)) wish.push('mgtrupp');
  if (count('spaeher') < 1) wish.push('spaeher');
  const filler = ['schuetze', 'schuetze', 'mgtrupp', 'schuetze', 'panzerjaeger', 'sani'];
  let bought = 0;
  const evs = [];
  const tryBuy = (t) => {
    const d = UNITS[t]; if (!d || d.noBuy || (d.faction && d.faction !== p.faction)) return false;
    const at = d.cat === 'inf' && spzFwd ? 'spz' : 'hq';
    if (!d.free && p.credits - g.unitCost(owner, t) < reserve) return false;
    const ev = g.buy(owner, t, at) || (at === 'spz' ? g.buy(owner, t, 'hq') : null);
    if (ev) { evs.push(ev); bought++; return true; }
    return false;
  };
  for (const t of wish) { if (bought >= 4) break; tryBuy(t); }
  for (let k = 0; bought < 5 && k < 12 && p.credits > reserve + 1200 && units.length + bought < 22; k++) if (!tryBuy(filler[(g.round + k) % filler.length])) break;
  tryBuy('rekrut');
  for (const ev of evs) await act.act(ev);
}
