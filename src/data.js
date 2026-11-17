// Datengetriebene Definitionen — Hundemarke (Wardogs-Spin-off von Sandthron)
// TP = Trefferpunkte (100 = volle Stärke), Reichweite in Hexfeldern, Geld in Dollar

export const FACTIONS = {
  ironstar: { name: 'Ironstar', color: '#4a9dff', camo: ['#b4a27e', '#6f6247', '#3f382a'], short: 'IRN', motto: 'Vertrag ist Vertrag', desc: 'Westliche Kontraktoren und Paramilitärs',
    perk: { airCost: 0.85, transportPay: 1.5 }, perkText: 'Hubschrauber 15 % günstiger, Transportprämien +50 %' },
  volkhova: { name: 'Volkhova', color: '#ff4b3e', camo: ['#8e9468', '#575c3c', '#30331f'], short: 'VLK', motto: 'Die Ordnung kehrt zurück', desc: 'Sowjetische Restaurationsmiliz',
    perk: { armorCost: 0.85, vehTough: 0.9 }, perkText: 'Kettenfahrzeuge 15 % günstiger, alle Fahrzeuge 10 % robuster' },
  simurgh: { name: 'Simurgh', color: '#45d468', camo: ['#a99c78', '#6b6248', '#3b3527'], short: 'SMG', motto: 'Unsichtbar wie der Wind', desc: 'Persische Schattenarmee',
    perk: { infMove: 1, infStealth: true }, perkText: 'Infanterie +1 Bewegung, in Wald und Ortschaft getarnt' },
};
export const FAC_KEYS = ['ironstar', 'volkhova', 'simurgh'];

export const TERRAIN = {
  // def = Deckung (Anteil weniger Schaden, negativ = ungeschützt), sight = Sicht, range = Reichweite für Fernkämpfer, hide = Infanterie nur aus der Nähe zu sehen
  feld:     { name: 'Feld',        def: 0,     build: true },
  wald:     { name: 'Wald',        def: 0.4,   build: true, cover: true, hide: 2, sight: -1 },
  ort:      { name: 'Ortschaft',   def: 0.5,   build: true, cover: true, town: true },
  truemmer: { name: 'Trümmer',     def: 0.35,  build: true },
  huegel:   { name: 'Hügel',       def: 0.2,   build: true, sight: 1, range: 1 },
  fels:     { name: 'Felsgrat',    def: 0.45,  build: false, sight: 2, range: 1 },
  wasser:   { name: 'Fluss',       def: 0,     build: false, water: true },
  strasse:  { name: 'Straße',      def: -0.15, build: true, road: true },
  bruecke:  { name: 'Brücke',      def: -0.25, build: false, road: true },
};
export const TER_IDS = Object.keys(TERRAIN);

// Bewegungskosten je Fortbewegungsart (Infinity = unpassierbar). Räder rollen auf Straßen doppelt so weit.
export const MOVE_COST = {
  foot:  { feld: 1, wald: 2, ort: 1, truemmer: 2, huegel: 2, fels: 3, wasser: Infinity, strasse: 1, bruecke: 1 },
  wheel: { feld: 1, wald: 3, ort: 1, truemmer: 3, huegel: 2, fels: Infinity, wasser: Infinity, strasse: 0.5, bruecke: 0.5 },
  track: { feld: 1, wald: 2, ort: 2, truemmer: 2, huegel: 2, fels: Infinity, wasser: Infinity, strasse: 1, bruecke: 1 },
  air:   { feld: 1, wald: 1, ort: 1, truemmer: 1, huegel: 1, fels: 1, wasser: 1, strasse: 1, bruecke: 1 },
};

export const ARMOR_MOD = {
  rifle:     { inf: 1.0, light: 0.4, heavy: 0.12, bld: 0.12, air: 0.25 },
  smg:       { inf: 0.95, light: 0.3, heavy: 0.08, bld: 0.1, air: 0.15 },
  sg:        { inf: 1.3, light: 0.35, heavy: 0.06, bld: 0.15, air: 0.1 },
  mg:        { inf: 1.15, light: 0.6, heavy: 0.18, bld: 0.15, air: 0.4 },
  hmg:       { inf: 1.05, light: 0.8, heavy: 0.25, bld: 0.25, air: 0.5 },
  sniper:    { inf: 1.4, light: 0.3, heavy: 0.08, bld: 0.05, air: 0.2 },
  amr:       { inf: 1.3, light: 0.9, heavy: 0.3, bld: 0.2, air: 0.6 },
  at:        { inf: 0.35, light: 1.1, heavy: 1.3, bld: 0.7, air: 0.55 },
  gl:        { inf: 1.0, light: 0.7, heavy: 0.3, bld: 0.6, air: 0 },
  cannon:    { inf: 0.6, light: 0.95, heavy: 0.9, bld: 0.95, air: 0 },
  minigun:   { inf: 1.3, light: 0.6, heavy: 0.15, bld: 0.12, air: 0.75 },
  flak:      { inf: 0.6, light: 0.5, heavy: 0.1, bld: 0.1, air: 1.35 },
  artillery: { inf: 1.0, light: 0.8, heavy: 0.55, bld: 0.95, air: 0 },
  mortar:    { inf: 1.05, light: 0.6, heavy: 0.3, bld: 0.6, air: 0 },
  rockets:   { inf: 0.8, light: 1.0, heavy: 0.85, bld: 0.8, air: 0.3 },
  sam:       { inf: 0, light: 0, heavy: 0, bld: 0, air: 1.35 },
  ciws:      { inf: 0.35, light: 0.35, heavy: 0.12, bld: 0.1, air: 1.25 },
  drone:     { inf: 0.55, light: 1.2, heavy: 1.45, bld: 0.5, air: 0 },
  c4:        { inf: 0.6, light: 1.3, heavy: 1.2, bld: 1.6, air: 0 },
};

// Munitionswahl für Handwaffen: Vollmantel (Allround), Hohlspitz (gegen Weichziele), Hartkern (gegen Panzerung)
export const AMMO = {
  fmj: { name: 'FMJ', long: 'Vollmantel', mod: { inf: 1, light: 1, heavy: 1, bld: 1, air: 1 }, text: 'Allround' },
  hp:  { name: 'HP', long: 'Hohlspitz', mod: { inf: 1.25, light: 0.6, heavy: 0.4, bld: 0.6, air: 0.8 }, text: '+25 % gegen Infanterie, schwach gegen Panzerung' },
  ap:  { name: 'AP', long: 'Hartkern', mod: { inf: 0.8, light: 1.6, heavy: 2.0, bld: 1.3, air: 1.2 }, text: 'Stark gegen Fahrzeuge und Hubschrauber, −20 % gegen Infanterie' },
};
export const AMMO_ORDER = ['fmj', 'hp', 'ap'];

// Fahrzeug- und Stellungswaffen (Handwaffen der Infanterie kommen aus GUNS)
export const WEAPONS = {
  jeepmg:  { type: 'hmg', power: 44, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  m2:      { type: 'hmg', power: 52, range: [1, 2], ground: true, air: true, proj: 'bullet', ammoSel: true },
  spzmg:   { type: 'hmg', power: 48, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  minigun: { type: 'minigun', power: 56, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true, suppress: true },
  t72gun:  { type: 'cannon', power: 74, range: [1, 1], ground: true, air: false, proj: 'shell' },
  l2a6gun: { type: 'cannon', power: 84, range: [1, 2], ground: true, air: false, proj: 'shell' },
  gepard:  { type: 'flak', power: 70, range: [1, 3], ground: true, air: true, proj: 'flak' },
  artillery: { type: 'artillery', power: 74, range: [3, 7], ground: true, air: false, proj: 'arty', noMoveFire: true, noCounter: true, splash: 0.45, rubble: true },
  mortar:  { type: 'mortar', power: 60, range: [2, 4], ground: true, air: false, proj: 'arty', noCounter: true, splash: 0.3, rubble: true, cost: 3 },
  rockets: { type: 'rockets', power: 70, range: [1, 2], ground: true, air: true, proj: 'rocket', ammo: true },
  havoc:   { type: 'rockets', power: 80, range: [1, 2], ground: true, air: true, proj: 'rocket', ammo: true },
  sam:     { type: 'sam', power: 82, range: [1, 4], ground: false, air: true, proj: 'missile', flareable: true },
  ciws:    { type: 'ciws', power: 70, range: [1, 3], ground: true, air: true, proj: 'bullet' },
  stingray: { type: 'drone', power: 78, range: [1, 5], ground: true, air: false, proj: 'drone', miss: 0.25, mech: 5 },
};

// ---------- Infanterie-Waffen aus Wardogs (Preis, Spur, Stufe) ----------
// cls: ar Sturmgewehr, smg MP, sg Schrotflinte, lmg MG, dmr Präzisionsgewehr, sr Scharfschützengewehr, at Panzerabwehr, gl Granatwerfer, aa Fliegerfaust
const G = (name, cls, track, lvl, price, w, extra = {}) => ({ name, cls, track, lvl, price, w, ...extra });
export const GUNS = {
  kh2002: G('KH-2002', 'ar', 'assault', 0, 0, { type: 'rifle', power: 44 }),
  a91:    G('A-91', 'ar', 'assault', 0, 0, { type: 'rifle', power: 43 }),
  t21:    G('T-21', 'ar', 'assault', 3, 600, { type: 'rifle', power: 47 }),
  ak74:   G('AK74', 'ar', 'assault', 6, 1600, { type: 'rifle', power: 50 }),
  galil:  G('Galil', 'ar', 'assault', 10, 2200, { type: 'rifle', power: 54 }),
  tcx:    G('TCX-SPR', 'dmr', 'assault', 20, 3400, { type: 'rifle', power: 50, range: [1, 2] }),
  m4:     G('M4', 'ar', 'assault', 28, 2800, { type: 'rifle', power: 58 }),
  fal:    G('FAL', 'ar', 'assault', 35, 6500, { type: 'rifle', power: 64 }),
  amp9:   G('AMP-9', 'smg', 'medic', 0, 900, { type: 'smg', power: 40 }),
  mp5:    G('MP5', 'smg', 'medic', 4, 1500, { type: 'smg', power: 45 }),
  pp19:   G('PP-19 Vityaz', 'smg', 'medic', 15, 1200, { type: 'smg', power: 47 }),
  super45: G('Super-45', 'smg', 'medic', 35, 2600, { type: 'smg', power: 54 }),
  mp43:   G('MP43', 'sg', 'support', 0, 400, { type: 'sg', power: 52 }),
  m500:   G('M500', 'sg', 'support', 10, 1200, { type: 'sg', power: 62 }),
  scout:  G('Scout Rifle TD', 'sr', 'recon', 0, 1100, { type: 'sniper', power: 54, range: [2, 3] }),
  sks:    G('SKS', 'dmr', 'recon', 5, 2400, { type: 'rifle', power: 52, range: [1, 2] }),
  mosin:  G('Mosin Nagant', 'sr', 'recon', 10, 4500, { type: 'sniper', power: 62, range: [2, 3] }),
  svd:    G('SVD', 'sr', 'recon', 12, 4800, { type: 'sniper', power: 60, range: [1, 3] }),
  bow:    G('Compound Bow', 'dmr', 'recon', 16, 800, { type: 'rifle', power: 48, range: [1, 2] }, { silent: true }),
  sv98:   G('SV98', 'sr', 'recon', 18, 5200, { type: 'sniper', power: 66, range: [2, 3] }),
  bmr:    G('BMR-308', 'sr', 'recon', 20, 6000, { type: 'sniper', power: 64, range: [2, 3] }),
  m14:    G('M14', 'dmr', 'recon', 25, 3800, { type: 'rifle', power: 58, range: [1, 2] }),
  mk22:   G('MK22', 'sr', 'recon', 30, 6400, { type: 'sniper', power: 70, range: [2, 4] }),
  amr50:  G('AMR 50', 'sr', 'recon', 35, 8800, { type: 'amr', power: 76, range: [2, 4] }),
  rpg7:   G('RPG-7', 'at', 'support', 6, 2000, { type: 'at', power: 66, range: [1, 2], proj: 'rocket', ammo: 3 }),
  verba:  G('9K333 Verba', 'aa', 'support', 14, 800, { type: 'sam', power: 80, range: [1, 3], proj: 'missile', ammo: 2, ground: false, flareable: true }),
  pkm:    G('PKM', 'lmg', 'support', 15, 4500, { type: 'mg', power: 62, suppress: true }),
  maaws:  G('MAAWS', 'at', 'support', 18, 2600, { type: 'at', power: 74, range: [1, 3], proj: 'rocket', ammo: 3 }),
  m249:   G('M249 SAW', 'lmg', 'support', 20, 3200, { type: 'mg', power: 56, suppress: true }),
  mgl40:  G('MGL-40', 'gl', 'support', 35, 6000, { type: 'gl', power: 58, range: [1, 3], proj: 'arty', ammo: 3, splash: 0.35 }),
};
for (const g of Object.values(GUNS)) {
  const w = g.w; w.range = w.range || [1, 1]; w.proj = w.proj || (w.type === 'sniper' || w.type === 'amr' ? 'sniper' : 'bullet');
  if (w.ground === undefined) w.ground = true; if (w.air === undefined) w.air = true;
  if (['rifle', 'smg', 'sg', 'mg', 'sniper', 'amr'].includes(w.type)) w.ammoSel = true;
}
for (const [k, g] of Object.entries(GUNS)) WEAPONS['g_' + k] = g.w;
// Einsatzpreise: Wardogs-Listenpreis halbiert (passt zur Zonenkasse)
const half = (o) => { for (const it of Object.values(o)) it.price = Math.round(it.price * 0.5 / 50) * 50; };
half(GUNS); for (const it of Object.values(GUNS)) it.price = Math.round(it.price * 0.7 / 50) * 50;

// ---------- Ausrüstung (bis zu 2 je Trupp) ----------
export const GEAR = {
  verband:   { name: 'Verbandpäckchen', track: 'medic', lvl: 0, price: 0, heal: 25, desc: 'Verbindet einen Trupp daneben um 25.' },
  reanimator: { name: 'Feld-Reanimator', track: 'medic', lvl: 2, price: 300, revive: 35, desc: 'Belebt Verwundete daneben wieder (Stärke 35).' },
  rauch:     { name: 'M18-Rauchgranate', track: 'medic', lvl: 5, price: 150, uses: 2, desc: 'Nebel auf ein Feld in Reichweite 2 und seine Nachbarn: Wer darin steht, ist bis zu eurem nächsten Zug nur aus nächster Nähe zu treffen.' },
  ifak:      { name: 'Erste-Hilfe-Set (IFAK)', track: 'medic', lvl: 10, price: 250, heal: 40, desc: 'Verbindet einen Trupp daneben um 40.' },
  medtasche: { name: 'Sanitätstasche', track: 'medic', lvl: 14, price: 700, heal: 35, healAll: true, desc: 'Verbindet alle eigenen Trupps daneben um 35.' },
  defi:      { name: 'Defibrillator', track: 'medic', lvl: 22, price: 1000, revive: 70, desc: 'Belebt Verwundete mit Stärke 70 wieder.' },
  c4:        { name: 'C4-Ladung', track: 'assault', lvl: 4, price: 500, uses: 2, desc: 'Sprengladung an ein Bauwerk oder Fahrzeug daneben: HESCO fällt nach 2 Ladungen, Bremer-Wände nach 7.' },
  molotow:   { name: 'Molotow-Cocktail', track: 'assault', lvl: 13, price: 200, uses: 1, desc: 'Brandsatz auf ein Feld in Reichweite 2: 40 Schaden an Infanterie, Deckung hilft nicht.' },
  monokular: { name: 'Monokular', track: 'recon', lvl: 2, price: 200, sight: 1, desc: '+1 Sicht.' },
  entfernung: { name: 'Entfernungsmesser', track: 'recon', lvl: 8, price: 600, sight: 2, mark: true, desc: '+2 Sicht. Markiert einen sichtbaren Feind: Er erleidet bis zu eurem nächsten Zug 20 % mehr Schaden.' },
  claymore:  { name: 'Claymore', track: 'recon', lvl: 23, price: 500, uses: 1, mine: 'inf', desc: 'Versteckte Mine auf ein Nachbarfeld: Feindliche Infanterie, die es betritt, erleidet 70 Schaden.' },
  ghillie:   { name: 'Ghillie-Anzug', track: 'recon', lvl: 26, price: 2500, ghillie: true, desc: 'Getarnt in jedem Gelände, solange der Trupp in seinem Zug nicht schießt.' },
  hammer_s:  { name: 'Kleiner Hammer', track: 'support', lvl: 0, price: 100, hammer: 1, desc: 'Baut Sandsäcke, Stacheldraht, Panzersperren, Aufklärungszelt (auch ohne FOB, mit 20 Material im Rucksack) und HESCO-Blöcke.' },
  hammer_m:  { name: 'Mittlerer Hammer', track: 'support', lvl: 3, price: 800, hammer: 2, desc: 'Dazu Tür, Tor, HESCO-Wall und Lautsprecher.' },
  hammer_l:  { name: 'Großer Hammer', track: 'support', lvl: 8, price: 1600, hammer: 3, desc: 'Baut alles — Bunker, Aufklärungsturm, Bremer-Wand, Mörser, Stingray, SAM, CIWS, Stationen, Bohrturm — und schlägt doppelt so schnell.' },
  atmine:    { name: 'Panzermine', track: 'support', lvl: 25, price: 800, uses: 1, mine: 'veh', desc: 'Versteckte Mine auf ein Nachbarfeld: Feindliche Fahrzeuge erleiden 90 Schaden.' },
};
half(GEAR); for (const it of Object.values(GEAR)) it.price = Math.round(it.price * 0.7 / 50) * 50;
export const VESTS = {
  keine:  { name: 'Keine Weste', track: 'wardog', lvl: 0, price: 0, taken: 1, desc: 'Leicht und schnell.' },
  leicht: { name: 'Leichte Weste', track: 'wardog', lvl: 5, price: 300, taken: 0.88, desc: '−12 % erlittener Schaden.' },
  schwer: { name: 'Schwere Weste', track: 'wardog', lvl: 20, price: 900, taken: 0.75, move: -1, desc: '−25 % erlittener Schaden, 1 Bewegung weniger.' },
};
export const SQUAD_BASE = 250;   // Sold je Trupp, dazu Waffe, Ausrüstung, Weste

// Rolle (Bild und KI-Verhalten) ergibt sich aus der Ausrüstung
half(VESTS);
export function roleOf(lo) {
  const g = GUNS[lo.gun], ge = lo.gear || [];
  if (lo.free) return 'rekrut';
  if (ge.some((k) => GEAR[k].hammer)) return 'pionier';
  if (ge.some((k) => GEAR[k].revive || GEAR[k].healAll)) return 'sani';
  if (g.cls === 'sr') return 'spaeher';
  if (g.cls === 'lmg') return 'mgtrupp';
  if (g.cls === 'at' || g.cls === 'aa' || g.cls === 'gl') return 'panzerjaeger';
  if (ge.some((k) => GEAR[k].heal) && g.cls === 'smg') return 'sani';
  return 'schuetze';
}
export const CHUTE_PRICE = 50;
export function loadoutCost(lo) { if (lo.free) return 0; return (lo.chute ? CHUTE_PRICE : 0) + SQUAD_BASE + GUNS[lo.gun].price + (lo.gear || []).reduce((a, k) => a + GEAR[k].price, 0) + VESTS[lo.vest || 'keine'].price; }
const DEFS = new Map();
export function infDef(lo, perk = {}) {
  const key = JSON.stringify([lo, perk.infMove || 0]);
  if (DEFS.has(key)) return DEFS.get(key);
  const g = GUNS[lo.gun], ge = (lo.gear || []).map((k) => GEAR[k]), v = VESTS[lo.vest || 'keine'];
  const role = roleOf(lo), base = UNITS[role];
  const heavy = g.cls === 'lmg' || g.cls === 'at' || g.cls === 'gl' || lo.gun === 'amr50';
  const d = { ...base, role, weapon: 'g_' + lo.gun, gun: lo.gun, track: g.track, cost: loadoutCost(lo), lo,
    move: 3 + (heavy ? -1 : 0) + (v.move || 0), sight: 3 + ge.reduce((a, x) => a + (x.sight || 0), 0) + (g.cls === 'sr' ? 1 : 0),
    ammo: g.w.ammo || 0, tough: v.taken < 1 ? v.taken : undefined,
    medic: ge.some((x) => x.heal || x.revive), heal: Math.max(0, ...ge.map((x) => x.heal || 0)), healAll: ge.some((x) => x.healAll), revive: Math.max(0, ...ge.map((x) => x.revive || 0)),
    builder: Math.max(0, ...ge.map((x) => x.hammer || 0)) || 0, ghillie: ge.some((x) => x.ghillie), marker: ge.some((x) => x.mark),
    stealth: g.cls === 'sr' ? 'still' : undefined, silent: !!g.silent, gearUses: { ...Object.fromEntries((lo.gear || []).filter((k) => GEAR[k].uses).map((k) => [k, GEAR[k].uses])), ...(lo.chute ? { chute: 1 } : {}) } };
  d.name = lo.free ? 'Rekrut' : `${base.name} · ${g.name}`;
  d.sight += 1;
  DEFS.set(key, d);
  return d;
}

// Vorlagen für Schnellkauf und KI: je Rolle die beste freigeschaltete Ausrüstung
export const TEMPLATES = {
  schuetze: { name: 'Sturm', guns: ['fal', 'm4', 'galil', 'ak74', 't21', 'kh2002'], gear: [['c4'], ['verband']], vest: true },
  sani:     { name: 'Sanitäter', guns: ['super45', 'pp19', 'mp5', 'amp9', 'kh2002'], gear: [['defi', 'reanimator'], ['medtasche', 'ifak', 'verband'], ['rauch']], vest: 'light' },
  pionier:  { name: 'Pionier', guns: ['m500', 'mp43', 'kh2002'], gear: [['hammer_l', 'hammer_m', 'hammer_s'], ['c4', 'verband']], vest: false },
  spaeher:  { name: 'Späher', guns: ['mk22', 'bmr', 'sv98', 'svd', 'mosin', 'scout'], gear: [['entfernung', 'monokular'], ['ghillie', 'claymore']], vest: false },
  mgtrupp:  { name: 'MG-Schütze', guns: ['pkm', 'm249', 'galil', 'ak74', 'kh2002'], gear: [['verband']], vest: true },
  panzerjaeger: { name: 'Panzerabwehr', guns: ['maaws', 'rpg7', 'kh2002'], gear: [['atmine', 'c4', 'verband']], vest: true },
  flak:     { name: 'Fliegerabwehr', guns: ['verba', 'kh2002'], gear: [['verband']], vest: false },
};
export function templateLoadout(role, can, budget = Infinity) {
  const T = TEMPLATES[role]; if (!T) return null;
  for (const gun of T.guns) {
    if (!can(gun)) continue;
    const gear = [];
    for (const opts of T.gear) { if (gear.length >= 2) break; const k = opts.find((x) => can(x)); if (k) gear.push(k); }
    const vest = T.vest ? (T.vest !== 'light' && can('schwer') ? 'schwer' : can('leicht') ? 'leicht' : 'keine') : 'keine';
    const lo = { gun, gear, vest };
    if (loadoutCost(lo) <= budget || gun === T.guns[T.guns.length - 1]) return lo;
  }
  return { gun: 'kh2002', gear: [], vest: 'keine' };
}

// track = Fortschrittsspur (Konto-Erfahrung): assault, medic, recon, support, driver, pilot
export const UNITS = {
  rekrut:  { name: 'Rekrut', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'g_kh2002', cost: 0, track: 'assault', free: true,
             desc: 'Kostenloser Freiwilliger mit KH-2002 und Verbandpäckchen. Einer pro Runde, solange ihr weniger als 5 Einheiten habt.' },
  schuetze: { name: 'Sturmtrupp', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', cost: 1200, track: 'assault', desc: 'Das Rückgrat jeder Zonenbesetzung.' },
  sani:    { name: 'Sanitäter', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', cost: 1000, track: 'medic', desc: 'Verbindet und belebt wieder — jede Rettung bringt Geld, in der Hot Zone doppelt.' },
  pionier: { name: 'Pionier', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', cost: 1400, track: 'support', desc: 'Mit Hammer: errichtet den FOB, baut Stellungen, hämmert Baustellen fertig und repariert.' },
  spaeher: { name: 'Späher', cat: 'inf', move: 3, mt: 'foot', sight: 4, armor: 'inf', cost: 1600, track: 'recon', desc: 'Scharfschützengewehr, getarnt solange er weder zieht noch schießt.' },
  mgtrupp: { name: 'MG-Trupp', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', cost: 1800, track: 'support', desc: 'Treffer halten nieder: Das Ziel hat nächste Runde 1 Bewegung weniger.' },
  panzerjaeger: { name: 'Panzerabwehr', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', cost: 2000, track: 'support', desc: 'Raketenwerfer gegen Fahrzeuge und tieffliegende Hubschrauber.' },

  bobcat:  { name: 'Bobcat', cat: 'veh', move: 6, mt: 'wheel', sight: 2, armor: 'light', cost: 300, track: 'driver', lvl: 0, pallets: 1, tough: 1.15, desc: 'Winziges Nutzfahrzeug: billig, schnell, eine Palette auf der Ladefläche.' },
  kodiak:  { name: 'Kodiak', cat: 'veh', move: 6, mt: 'wheel', sight: 3, armor: 'light', cost: 1500, track: 'driver', lvl: 0, transport: 3, desc: 'Schneller Geländewagen für einen Trupp. Auf Straßen doppelte Reichweite.' },
  ural:    { name: 'URAL', cat: 'veh', move: 4, mt: 'wheel', sight: 2, armor: 'light', cost: 3000, track: 'driver', lvl: 3, transport: 4, pallets: 2, tough: 0.9, desc: 'Lastwagen: ein Trupp oder zwei Versorgungspaletten.' },
  kodiak_m249: { name: 'Kodiak [M249]', cat: 'veh', move: 6, mt: 'wheel', sight: 3, armor: 'light', weapon: 'jeepmg', cost: 2250, track: 'driver', lvl: 6, transport: 2, desc: 'Kodiak mit M249 auf dem Dach.' },
  wolf:    { name: 'Wolf-110', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', cost: 1700, track: 'driver', lvl: 8, transport: 3, tough: 0.85, desc: 'Robuster Geländewagen, steckt mehr weg als der Kodiak.' },
  buggy:   { name: 'Dune Buggy', cat: 'veh', move: 8, mt: 'wheel', sight: 3, armor: 'light', cost: 900, track: 'driver', lvl: 9, transport: 2, tough: 1.2, desc: 'Der schnellste Weg in die Zone — und der zerbrechlichste.' },
  pickup:  { name: 'Kodiak [Pickup]', cat: 'veh', move: 6, mt: 'wheel', sight: 3, armor: 'light', cost: 1800, track: 'driver', lvl: 10, transport: 3, pallets: 1, desc: 'Pritschenwagen für zwei Trupps oder eine Palette.' },
  humvee:  { name: 'Humvee', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', cost: 1800, track: 'driver', lvl: 14, transport: 3, tough: 0.8, desc: 'Gepanzerter Geländewagen.' },
  ural_def: { name: 'Ural Defender', cat: 'veh', move: 4, mt: 'wheel', sight: 2, armor: 'light', cost: 3600, track: 'driver', lvl: 15, transport: 4, pallets: 2, tough: 0.7, desc: 'Gepanzerter URAL: Nachschub, der auch unter Feuer ankommt.' },
  wolf_m2: { name: 'Wolf-110 [M2 Browning]', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'm2', cost: 2400, track: 'driver', lvl: 16, transport: 2, tough: 0.85, desc: 'Schweres .50-MG mit Reichweite 1–2.' },
  t72:     { name: 'T-72B3', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', weapon: 't72gun', cost: 5400, track: 'driver', lvl: 20, turret: true, tough: 0.85, armored: true, desc: 'Kampfpanzer mit 125-mm-Kanone.' },
  ural_def_m249: { name: 'Ural Defender [M249]', cat: 'veh', move: 4, mt: 'wheel', sight: 2, armor: 'light', weapon: 'jeepmg', cost: 4050, track: 'driver', lvl: 22, transport: 3, pallets: 2, tough: 0.7, desc: 'Gepanzerter Lastwagen mit M249.' },
  humvee_m249: { name: 'Humvee [M249]', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'jeepmg', cost: 2250, track: 'driver', lvl: 24, transport: 2, tough: 0.8, desc: 'Humvee mit M249.' },
  gepard:  { name: 'Flakpanzer Gepard', cat: 'veh', move: 4, mt: 'track', sight: 3, armor: 'heavy', weapon: 'gepard', cost: 6000, track: 'driver', lvl: 25, turret: true, tough: 0.85, armored: true, desc: 'Zwillings-Flak mit Radar, Reichweite 1–3: holt jeden Hubschrauber, hilft auch gegen leichte Ziele.' },
  humvee_mini: { name: 'Humvee [Minigun]', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'minigun', cost: 2700, track: 'driver', lvl: 30, transport: 2, tough: 0.8, desc: 'Minigun: zerfetzt Infanterie, hält nieder, holt Hubschrauber.' },
  sph2:    { name: 'SPH-2', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'light', weapon: 'artillery', cost: 4800, track: 'driver', lvl: 31, turret: true, armored: true, desc: 'Selbstfahrlafette: Reichweite 3–7, trifft Nachbarfelder mit, schießt Häuser zu Trümmern. Nicht ziehen und feuern in derselben Runde.' },
  l2a6:    { name: 'L2A6', cat: 'veh', move: 4, mt: 'track', sight: 3, armor: 'heavy', weapon: 'l2a6gun', cost: 8400, track: 'driver', lvl: 35, turret: true, tough: 0.7, armored: true, desc: 'Schwerer Kampfpanzer, Kanone mit Reichweite 1–2.' },
  spz:     { name: 'M113 APC SV', cat: 'veh', move: 4, mt: 'track', sight: 3, armor: 'light', weapon: 'spzmg', cost: 0, track: 'driver', transport: 3, spawnPoint: true, noBuy: true, tough: 0.85,
             desc: 'Spawn-Fahrzeug mit Satellitenschüssel: Neue Infanterie wird direkt an ihm eingesetzt. Unter 50 % fällt die Schüssel aus, bis ein Pionier repariert.' },

  mh6:     { name: 'MH-6', cat: 'air', move: 10, mt: 'air', sight: 4, armor: 'air', cost: 3750, track: 'pilot', lvl: 0, transport: 3, pallets: 1, desc: 'Little Bird mit Außensitzen: ein Trupp oder eine Palette, überall hin.' },
  ah6m:    { name: 'AH-6M [Miniguns]', cat: 'air', move: 10, mt: 'air', sight: 4, armor: 'air', weapon: 'minigun', cost: 4200, track: 'pilot', lvl: 8, desc: 'Bewaffneter Little Bird mit zwei Miniguns.' },
  lakota:  { name: 'Z20 Lakota', cat: 'air', move: 9, mt: 'air', sight: 3, armor: 'air', cost: 4450, track: 'pilot', lvl: 10, transport: 5, pallets: 2, tough: 0.9, desc: 'Transporthubschrauber für drei Trupps oder zwei Paletten.' },
  ah6r:    { name: 'AH-6R [Rockets]', cat: 'air', move: 10, mt: 'air', sight: 4, armor: 'air', weapon: 'rockets', ammo: 4, cost: 7500, track: 'pilot', lvl: 20, flares: true, desc: 'Little Bird mit Raketen, Täuschkörper gegen eine SAM-Rakete pro Runde.' },
  lakota_mini: { name: 'Z20 Lakota [Miniguns]', cat: 'air', move: 9, mt: 'air', sight: 3, armor: 'air', weapon: 'minigun', cost: 4800, track: 'pilot', lvl: 25, transport: 3, tough: 0.9, desc: 'Lakota mit Türminiguns, Platz für zwei Trupps.' },
  havoc:   { name: 'Havoc', cat: 'air', move: 9, mt: 'air', sight: 3, armor: 'air', weapon: 'havoc', ammo: 5, cost: 10800, track: 'pilot', lvl: 35, tough: 0.7, flares: true, desc: 'Schwerer Kampfhubschrauber: Raketen und Kanone, dicke Panzerung, Täuschkörper.' },
};
for (const u of Object.values(UNITS)) u.sight = (u.sight || 1) + 1;

// Bauten nach Wardogs. tier = Hammerstufe, bau = Material, turns = Hammerschläge, field = ohne FOB baubar (Material aus dem Rucksack)
// pass: 'all' alle, 'foot' nur Infanterie (Panzersperre), 'own' eigene Bodeneinheiten, 'ownInf' eigene Infanterie, sonst gesperrt
export const BUILDINGS = {
  hq:        { name: 'Hauptquartier', hp: 9999, sight: 4, invuln: true,
               desc: 'Sichere Zone im Umkreis von 2 Feldern: Feinde kommen nicht hinein und können nichts darin treffen. Hier wird gekauft.' },
  fob:       { name: 'Vorposten (FOB)', cat: 'fob', hp: 320, sight: 3, cash: 5500, turns: 0, radius: 2,
               desc: 'Einflussbereich 2 Felder: Lager für Material, Treibstoff und Mechanik, Bauplatz für alle großen Bauten, Nachschub für Munition. Feindliche Infanterie kann die Konsole hacken.' },
  sandsack:  { name: 'Sandsackwall', cat: 'fort', tier: 1, field: true, hp: 90, sight: 1, bau: 3, turns: 1, pass: 'all', cover: 0.2, desc: 'Feldbefestigung: eigene Einheiten darauf erhalten 20 % zusätzliche Deckung.' },
  draht:     { name: 'Stacheldraht', cat: 'fort', tier: 1, field: true, hp: 60, sight: 1, bau: 2, turns: 1, pass: 'all', wire: true, desc: 'Feindliche Infanterie braucht 2 Bewegung extra, um hindurchzukommen.' },
  igel:      { name: 'Panzersperre', cat: 'fort', tier: 1, field: true, hp: 140, sight: 1, bau: 5, turns: 1, pass: 'foot', desc: 'Stahligel: sperrt das Feld für Fahrzeuge, Infanterie kommt durch.' },
  zelt:      { name: 'Aufklärungszelt', cat: 'fort', tier: 1, field: true, hp: 50, sight: 2, bau: 2, turns: 1, pass: 'all', tent: true, desc: 'Wärmeschutz: eigene Trupps darin sind getarnt, solange sie nicht schießen.' },
  hesco_s:   { name: 'HESCO-Block', cat: 'fort', tier: 1, hp: 120, sight: 1, bau: 3, turns: 1, desc: 'Kleiner Drahtkorb voll Erde: sperrt das Feld.' },
  tuer:      { name: 'Tür', cat: 'fort', tier: 2, hp: 140, sight: 1, bau: 5, turns: 1, pass: 'ownInf', desc: 'Wandstück mit Tür: nur eigene Infanterie kommt durch.' },
  tor:       { name: 'Tor', cat: 'fort', tier: 2, hp: 220, sight: 1, bau: 17, turns: 2, pass: 'own', desc: 'Fahrzeugtor: eigene Bodeneinheiten kommen durch, Feinde nicht.' },
  hesco:     { name: 'HESCO-Wall', cat: 'fort', tier: 2, hp: 240, sight: 1, bau: 15, turns: 2, desc: 'Große Drahtkörbe: sperrt das Feld, 4 C4-Ladungen stark.' },
  kiste:     { name: 'Versorgungskiste', cat: 'sup', tier: 1, hp: 60, sight: 1, bau: 0, turns: 0, pass: 'foot', cover: 0.15, desc: 'Abgeworfene Kiste mit Verbandszeug, Munition und Ausrüstung: Eigene Trupps daneben werden zu Rundenbeginn um 20 verbunden und füllen Granaten, Minen, C4 und Rucksack wieder auf. Reicht für 3 Runden.' },
  lautsprecher: { name: 'Lautsprecher', cat: 'sup', tier: 2, hp: 110, sight: 5, bau: 20, turns: 2, desc: 'Mast mit Lautsprechern: Beobachtungsposten mit Sicht 5. Eigene Trupps im Umkreis 1 kämpfen mit +10 % Schaden.' },
  bremer:    { name: 'Bremer-Wand', cat: 'fort', tier: 3, hp: 480, sight: 1, bau: 25, turns: 3, desc: 'Hohe Betonwand: sperrt das Feld, nicht zu überklettern, 7 C4-Ladungen stark.' },
  bunker:    { name: 'Bunker', cat: 'fort', tier: 3, hp: 380, sight: 2, bau: 20, turns: 3, pass: 'ownInf', cover: 0.5, desc: 'Eigene Infanterie darin erhält 50 % Deckung.' },
  turm:      { name: 'Aufklärungsturm', cat: 'fort', tier: 3, hp: 200, sight: 5, bau: 20, turns: 3, pass: 'ownInf', cover: -0.25, tower: true, desc: 'Erhöhter Posten: eigene Infanterie darauf sieht 3 Felder weiter, steht aber exponiert (+25 % Schaden), Scharfschützen schießen 1 Feld weiter.' },
  schutz:    { name: 'Schutzraum', cat: 'fort', tier: 3, hp: 400, sight: 1, bau: 20, turns: 3, pass: 'ownInf', cover: 0.25, shelter: true, desc: 'Gegen indirektes Feuer: Eigene Trupps darin nehmen keinen Schaden durch Artillerie, Mörser und Splitter.' },
  stingray:  { name: 'Stingray-Werfer', cat: 'def', tier: 3, hp: 150, sight: 3, bau: 30, turns: 3, weapon: 'stingray', desc: 'FPV-Drohnen gegen Fahrzeuge, Reichweite 5. Jede Drohne kostet 5 Mechanik aus dem Lager, 25 % Fehlschläge.' },
  moerser:   { name: 'L81-Mörser', cat: 'def', tier: 3, hp: 140, sight: 2, bau: 30, turns: 3, weapon: 'mortar', desc: 'Indirektes Feuer, Reichweite 2–4, trifft Nachbarfelder mit. Jeder Schuss kostet 3 Material.' },
  tankstelle: { name: 'Tankstation', cat: 'sup', tier: 3, hp: 160, sight: 2, bau: 40, turns: 3, desc: 'Fahrzeuge, die ihren Zug im FOB-Bereich beginnen, haben +1 Bewegung. Kostet 1 Treibstoff je Fahrzeug.' },
  werkstatt: { name: 'Reparaturstation', cat: 'sup', tier: 3, hp: 160, sight: 2, bau: 40, turns: 3, desc: 'Repariert eigene Fahrzeuge und Hubschrauber im FOB-Bereich um 25 pro Runde (2 Mechanik je Reparatur), füllt Munition und Täuschkörper auf.' },
  sam:       { name: 'Talon 9K-SAM', cat: 'def', tier: 3, hp: 170, sight: 3, bau: 200, turns: 4, weapon: 'sam', desc: 'Luftabwehrraketen, Reichweite 1–4. Kampfhubschrauber können mit Täuschkörpern ausweichen.' },
  ciws:      { name: 'Vanguard-CIWS', cat: 'def', tier: 3, hp: 200, sight: 3, bau: 300, turns: 5, weapon: 'ciws', desc: 'Rotierende Maschinenkanone, Reichweite 1–3. Täuschkörper nützen nichts.' },
  bohrturm:  { name: 'Bohrturm', cat: 'sup', tier: 3, hp: 260, sight: 2, bau: 450, turns: 6, drill: true,
               desc: 'Hot-Zone-Magnet: Mit 6 Treibstoff gestartet, zieht er die Hot Zone jede Runde zum FOB. Verbraucht 1 Treibstoff pro Runde.' },
};
export const BUILD_LIST = ['sandsack', 'draht', 'igel', 'zelt', 'hesco_s', 'tuer', 'tor', 'hesco', 'lautsprecher', 'bremer', 'bunker', 'turm', 'schutz', 'stingray', 'moerser', 'tankstelle', 'werkstatt', 'sam', 'ciws', 'bohrturm'];
export const HAMMER_NAME = { 1: 'Kleiner Hammer', 2: 'Mittlerer Hammer', 3: 'Großer Hammer' };

export const PALLETS = {
  bau:   { name: 'Materialpalette', icon: '▦', cost: 300, amount: 100, unit: 'Material', desc: '+100 Material für das FOB-Lager' },
  sprit: { name: 'Treibstoffpalette', icon: '⛽', cost: 300, amount: 3, unit: 'Treibstoff', desc: '+3 Treibstoff für Bohrturm und Tankstation' },
  kiste: { name: 'Versorgungskiste', icon: '✚', cost: 300, amount: 3, unit: 'Versorgung', desc: 'Überall abwerfbar, auch aus der Luft: versorgt Trupps daneben 3 Runden lang' },
  mech:  { name: 'Mechanikpalette', icon: '⚙', cost: 300, amount: 20, unit: 'Mechanik', desc: '+20 Mechanik für Reparaturstation und Stingray' },
};

export const PAY = {
  cz: 120,            // je Kopf in der Control Zone pro Wertung
  hz: 240,            // je Kopf in der Hot Zone pro Wertung
  killInf: 900, killVeh: 2000, killAir: 2200, killBld: 400,
  revive: 400, heal: 250, transport: 250, transportHz: 400, hammer: 40, built: 150,
  pallet: 900,        // Lieferprämie je Palette im FOB-Bereich nahe der Zone
  hackFob: 2500,
};
export const START_CASH = 10000;
export const CASH_FLOOR = 5000;   // nie mit weniger in einen Einsatz
export const FOB_STOCK = { bau: 80, sprit: 0, mech: 0 };
export const CODE_USES = 5;       // Turmcode darf so oft pro Partie eingegeben werden
export const CODE_LOCK = 3;       // so viele Runden hält ein Turm die Hot Zone fest
export const TOWER_CD = 6;        // Abklingzeit eines Turms nach Codeeingabe
export const SPZ_RESPAWN = 4;
export const SPZ_DEPLOYS = 2;     // Einsätze pro Runde an einem SPz
export const DOWNED_TURNS = 2;    // so viele eigene Rundenstarts bis zum Verbluten

export const TARGETS = { kurz: 12, normal: 20, lang: 30 };
export const AI_LEVEL = { leicht: 10, normal: 22, schwer: 35 };

export const RANKS = [
  { name: 'Rekrut', xp: 0, dmg: 1, taken: 1 },
  { name: 'Veteran', xp: 50, dmg: 1.1, taken: 0.94 },
  { name: 'Elite', xp: 130, dmg: 1.2, taken: 0.88, sight: 1 },
  { name: 'Wardog', xp: 260, dmg: 1.3, taken: 0.8, sight: 1, move: 1, regen: 10 },
];

export const DIFFICULTY = {
  leicht: { name: 'Leicht', aiBonus: 0.8, aiCash: 8000 },
  normal: { name: 'Normal', aiBonus: 1.0, aiCash: 10000 },
  schwer: { name: 'Schwer', aiBonus: 1.3, aiCash: 14000 },
};

export const TRACKS = {
  assault: { name: 'Sturm', icon: '✦' }, medic: { name: 'Sanität', icon: '✚' }, recon: { name: 'Aufklärung', icon: '◎' },
  support: { name: 'Unterstützung', icon: '⚒' }, driver: { name: 'Fahrer', icon: '⛟' }, pilot: { name: 'Pilot', icon: '✈' },
};
export const TRACK_KEYS = ['assault', 'medic', 'recon', 'support', 'driver', 'pilot'];
// Erfahrungskurve: Gesamt-XP für Stufe L
export const xpForLevel = (L) => 20 * L + 2 * L * L;
export function levelOf(xp) { let L = 0; while (L < 40 && xp >= xpForLevel(L + 1)) L++; return L; }
// Freischaltgebühr (einmalig, vom Konto)
export function unlockFee(item) { if (!item.lvl) return 0; return Math.max(250, Math.round(item.price * (0.6 + item.lvl / 50) / 50) * 50); }
// Katalog aller freischaltbaren Dinge
export function catalog() {
  const out = [];
  for (const [id, g] of Object.entries(GUNS)) out.push({ id, kind: 'gun', name: g.name, track: g.track, lvl: g.lvl, price: g.price, fee: unlockFee(g) });
  for (const [id, g] of Object.entries(GEAR)) out.push({ id, kind: 'gear', name: g.name, track: g.track, lvl: g.lvl, price: g.price, fee: unlockFee(g) });
  for (const [id, g] of Object.entries(VESTS)) out.push({ id, kind: 'vest', name: g.name, track: g.track, lvl: g.lvl, price: g.price, fee: unlockFee(g) });
  for (const [id, u] of Object.entries(UNITS)) if (u.cat !== 'inf' && !u.noBuy) out.push({ id, kind: 'unit', name: u.name, track: u.track, lvl: u.lvl || 0, price: u.cost, fee: unlockFee({ lvl: u.lvl || 0, price: u.cost }) });
  return out;
}
