// Datengetriebene Definitionen — Hundemarke (Wardogs-Spin-off von Sandthron)
// TP = Trefferpunkte (100 = volle Stärke), Reichweite in Hexfeldern, Geld in Dollar

export const FACTIONS = {
  ironstar: { name: 'Ironstar', color: '#4a9dff', camo: ['#b4a27e', '#6f6247', '#3f382a'], short: 'IRN', motto: 'Vertrag ist Vertrag', desc: 'Westliche Kontraktoren und Paramilitärs',
    perk: { airCost: 0.85, transportPay: 1.5 }, perkText: 'Hubschrauber 15 % günstiger, Transportprämien +50 %', special: 'sperber' },
  volkhova: { name: 'Volkhova', color: '#ff4b3e', camo: ['#8e9468', '#575c3c', '#30331f'], short: 'VLK', motto: 'Die Ordnung kehrt zurück', desc: 'Sowjetische Restaurationsmiliz',
    perk: { armorCost: 0.85, vehTough: 0.9 }, perkText: 'Panzerfahrzeuge 15 % günstiger und 10 % robuster', special: 'grad' },
  simurgh: { name: 'Simurgh', color: '#45d468', camo: ['#a99c78', '#6b6248', '#3b3527'], short: 'SMG', motto: 'Unsichtbar wie der Wind', desc: 'Persische Schattenarmee',
    perk: { infMove: 1, infStealth: true }, perkText: 'Infanterie +1 Bewegung, in Wald und Ortschaft getarnt', special: 'drohnen' },
};
export const FAC_KEYS = ['ironstar', 'volkhova', 'simurgh'];

export const TERRAIN = {
  feld:     { name: 'Feld',        def: 0,    build: true },
  wald:     { name: 'Wald',        def: 0.25, build: true, cover: true },
  ort:      { name: 'Ortschaft',   def: 0.35, build: true, cover: true, town: true },
  truemmer: { name: 'Trümmer',     def: 0.2,  build: true },
  huegel:   { name: 'Hügel',       def: 0.15, build: true, sight: 1 },
  fels:     { name: 'Felsgrat',    def: 0.35, build: false, sight: 1 },
  wasser:   { name: 'Fluss',       def: 0,    build: false, water: true },
  strasse:  { name: 'Straße',      def: 0,    build: true, road: true },
  bruecke:  { name: 'Brücke',      def: 0,    build: false, road: true },
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
  smg:       { inf: 0.9, light: 0.3, heavy: 0.08, bld: 0.1, air: 0.15 },
  mg:        { inf: 1.15, light: 0.6, heavy: 0.18, bld: 0.15, air: 0.4 },
  hmg:       { inf: 1.05, light: 0.8, heavy: 0.25, bld: 0.25, air: 0.5 },
  sniper:    { inf: 1.4, light: 0.3, heavy: 0.08, bld: 0.05, air: 0.2 },
  at:        { inf: 0.35, light: 1.1, heavy: 1.3, bld: 0.7, air: 0.55 },
  cannon:    { inf: 0.6, light: 0.95, heavy: 0.9, bld: 0.95, air: 0 },
  minigun:   { inf: 1.3, light: 0.6, heavy: 0.15, bld: 0.12, air: 0.75 },
  artillery: { inf: 1.0, light: 0.8, heavy: 0.55, bld: 0.95, air: 0 },
  mortar:    { inf: 1.05, light: 0.6, heavy: 0.3, bld: 0.6, air: 0 },
  rockets:   { inf: 0.8, light: 1.0, heavy: 0.85, bld: 0.8, air: 0.3 },
  sam:       { inf: 0, light: 0, heavy: 0, bld: 0, air: 1.35 },
  ciws:      { inf: 0.35, light: 0.35, heavy: 0.12, bld: 0.1, air: 1.25 },
  drone:     { inf: 0.55, light: 1.2, heavy: 1.45, bld: 0.5, air: 0 },
};

// Munitionswahl für Handwaffen: Vollmantel (Allround), Hohlspitz (gegen Weichziele), Hartkern (gegen Panzerung)
export const AMMO = {
  fmj: { name: 'FMJ', long: 'Vollmantel', mod: { inf: 1, light: 1, heavy: 1, bld: 1, air: 1 }, text: 'Allround' },
  hp:  { name: 'HP', long: 'Hohlspitz', mod: { inf: 1.25, light: 0.6, heavy: 0.4, bld: 0.6, air: 0.8 }, text: '+25 % gegen Infanterie, schwach gegen Panzerung' },
  ap:  { name: 'AP', long: 'Hartkern', mod: { inf: 0.8, light: 1.6, heavy: 2.0, bld: 1.3, air: 1.2 }, text: 'Stark gegen Fahrzeuge und Hubschrauber, −20 % gegen Infanterie' },
};
export const AMMO_ORDER = ['fmj', 'hp', 'ap'];

export const WEAPONS = {
  rifle:   { type: 'rifle', power: 50, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  smg:     { type: 'smg', power: 40, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  carbine: { type: 'rifle', power: 42, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  mg:      { type: 'mg', power: 55, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true, suppress: true },
  jeepmg:  { type: 'hmg', power: 42, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  spzmg:   { type: 'hmg', power: 48, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true },
  sniper:  { type: 'sniper', power: 66, range: [2, 3], ground: true, air: true, proj: 'sniper', ammoSel: true },
  at:      { type: 'at', power: 66, range: [1, 2], ground: true, air: true, proj: 'rocket' },
  cannon:  { type: 'cannon', power: 78, range: [1, 1], ground: true, air: false, proj: 'shell' },
  minigun: { type: 'minigun', power: 56, range: [1, 1], ground: true, air: true, proj: 'bullet', ammoSel: true, suppress: true },
  artillery: { type: 'artillery', power: 74, range: [3, 7], ground: true, air: false, proj: 'arty', noMoveFire: true, noCounter: true, splash: 0.45, rubble: true },
  grad:    { type: 'artillery', power: 62, range: [3, 8], ground: true, air: false, proj: 'grad', noMoveFire: true, noCounter: true, splash: 0.6, ammo: true, rubble: true },
  mortar:  { type: 'mortar', power: 60, range: [2, 4], ground: true, air: false, proj: 'arty', noCounter: true, splash: 0.3, rubble: true, cost: 2 },
  rockets: { type: 'rockets', power: 70, range: [1, 2], ground: true, air: true, proj: 'rocket', ammo: true },
  sam:     { type: 'sam', power: 82, range: [1, 4], ground: false, air: true, proj: 'missile', flareable: true },
  ciws:    { type: 'ciws', power: 70, range: [1, 3], ground: true, air: true, proj: 'bullet' },
  drone:   { type: 'drone', power: 70, range: [1, 3], ground: true, air: false, proj: 'drone', ammo: true, miss: 0.2 },
};

// track = Fortschrittsspur (Konto-Erfahrung): assault, medic, recon, support, driver, pilot
export const UNITS = {
  rekrut:  { name: 'Rekrut', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'smg', cost: 0, track: 'assault', free: true,
             desc: 'Kostenloser Freiwilliger mit Maschinenpistole. Einer pro Runde, solange ihr weniger als 5 Einheiten habt — damit seid ihr nie blank.' },
  schuetze: { name: 'Schützentrupp', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'rifle', cost: 1200, track: 'assault',
             desc: 'Sturmgewehre, das Rückgrat jeder Zonenbesetzung. Zählt im Zonenkopf voll.' },
  sani:    { name: 'Sanitäter', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'smg', cost: 1000, track: 'medic', medic: true,
             desc: 'Belebt verwundete Trupps auf Nachbarfeldern wieder und verbindet Angeschlagene (+30). Jede Rettung bringt Geld — in der Hot Zone doppelt.' },
  pionier: { name: 'Pionier', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'carbine', cost: 1400, track: 'support', builder: true,
             desc: 'Hammer und Material: errichtet den FOB, baut Wälle, Mörser, Luftabwehr und den Bohrturm, hämmert Baustellen fertig und repariert Fahrzeuge.' },
  spaeher: { name: 'Späher', cat: 'inf', move: 3, mt: 'foot', sight: 4, armor: 'inf', weapon: 'sniper', cost: 1600, track: 'recon', stealth: 'still', spotter: true,
             desc: 'Präzisionsgewehr mit Reichweite 2–3 und Entfernungsmesser (+2 Sicht). Getarnt, solange er weder zieht noch schießt.' },
  mgtrupp: { name: 'MG-Trupp', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', weapon: 'mg', cost: 1800, track: 'assault',
             desc: 'Schweres Maschinengewehr. Treffer halten nieder: Das Ziel hat in seiner nächsten Runde 1 Bewegung weniger.' },
  panzerjaeger: { name: 'Panzerjäger', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', weapon: 'at', cost: 2000, track: 'assault',
             desc: 'Panzerabwehrrakete mit Reichweite 1–2. Trifft auch tieffliegende Hubschrauber.' },
  drohnen: { name: 'Drohnentrupp', cat: 'inf', move: 3, mt: 'foot', sight: 3, armor: 'inf', weapon: 'drone', ammo: 3, cost: 2400, track: 'recon', faction: 'simurgh',
             desc: 'FPV-Kamikazedrohnen gegen Fahrzeuge, Reichweite 1–3. 20 % Fehlschläge. 3 Drohnen, Nachschub am HQ oder FOB.' },

  jeep:    { name: 'Geländewagen', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'jeepmg', cost: 1500, track: 'driver', transport: 2,
             desc: 'Schneller Transporter mit Bord-MG für zwei Trupps. Auf Straßen doppelte Reichweite. Fahrer kassieren Transportprämien.' },
  rotorjeep: { name: 'Rotorjeep', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'minigun', cost: 4000, track: 'driver',
             desc: 'Geländewagen mit Minigun: zerfetzt Infanterie, hält nieder und holt Hubschrauber vom Himmel.' },
  laster:  { name: 'Lastwagen', cat: 'veh', move: 4, mt: 'wheel', sight: 2, armor: 'light', cost: 3500, track: 'driver', transport: 3, pallets: 2,
             desc: 'Dreiachser für drei Trupps oder zwei Versorgungspaletten. Paletten am HQ laden, im FOB-Bereich abladen: füllt das Lager und bringt eine Lieferprämie.' },
  spz:     { name: 'Einsatz-SPz', cat: 'veh', move: 4, mt: 'track', sight: 3, armor: 'light', weapon: 'spzmg', cost: 0, track: 'driver', transport: 2, spawnPoint: true, noBuy: true, tough: 0.85,
             desc: 'Gepanzerter Kettentransporter mit Funkantenne: Neue Infanterie kann direkt an ihm eingesetzt werden. Fällt die Antenne (unter 50 %), ist der Einsatzpunkt tot, bis ein Pionier repariert.' },
  panzer:  { name: 'Kampfpanzer', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', weapon: 'cannon', cost: 9000, track: 'driver', turret: true, tough: 0.85, armored: true,
             desc: 'Schwere Kanone, dicke Panzerung. Ein spätes Machtwort — aber Panzerjäger und Drohnen lieben ihn.' },
  artillerie: { name: 'Artilleriepanzer', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'light', weapon: 'artillery', cost: 10000, track: 'driver', turret: true, armored: true,
             desc: 'Reichweite 3–7 mit großem Wirkungskreis (Nachbarfelder 45 %). Nicht ziehen und feuern in derselben Runde. Kann Häuser zu Trümmern schießen.' },
  grad:    { name: 'Grad-Werfer', cat: 'veh', move: 4, mt: 'wheel', sight: 2, armor: 'light', weapon: 'grad', ammo: 2, cost: 8000, track: 'driver', faction: 'volkhova',
             desc: 'Raketenwerfer auf Lkw: Reichweite 3–8, Salve trifft Ziel und alle Nachbarfelder (60 %). 2 Salven, Nachschub am HQ oder FOB.' },

  heli:    { name: 'Leichthubschrauber', cat: 'air', move: 10, mt: 'air', sight: 4, armor: 'air', cost: 8000, track: 'pilot', transport: 2,
             desc: 'Flinker Zweisitzer: setzt zwei Trupps überall ab. Piloten kassieren Transportprämien. Unbewaffnet.' },
  sperber: { name: 'Sperber', cat: 'air', move: 10, mt: 'air', sight: 4, armor: 'air', weapon: 'minigun', cost: 11000, track: 'pilot', transport: 2, faction: 'ironstar',
             desc: 'Bewaffneter Leichthubschrauber von Ironstar: Minigun und Platz für zwei Trupps.' },
  lastheli: { name: 'Transporthubschrauber', cat: 'air', move: 8, mt: 'air', sight: 3, armor: 'air', cost: 12000, track: 'pilot', transport: 4, pallets: 2, tough: 0.9,
             desc: 'Schwerer Transporter für vier Trupps oder zwei Paletten an der Schlinge.' },
  kampfheli: { name: 'Kampfhubschrauber', cat: 'air', move: 8, mt: 'air', sight: 3, armor: 'air', weapon: 'rockets', ammo: 4, cost: 16000, track: 'pilot', tough: 0.8, flares: true,
             desc: 'Raketen gegen alles am Boden. Täuschkörper lenken eine SAM-Rakete pro Runde ab — gegen CIWS helfen sie nicht. Nachschub am HQ oder an einer Werkstatt.' },
};
for (const u of Object.values(UNITS)) u.sight = (u.sight || 1) + 1;

// Bauten. Hammer = Anzahl Pionier-Aktionen bis fertig (turns). bau = Material aus dem FOB-Lager.
export const BUILDINGS = {
  hq:        { name: 'Hauptquartier', hp: 9999, sight: 4, invuln: true,
               desc: 'Sichere Zone im Umkreis von 2 Feldern: Feinde kommen nicht hinein und können nichts darin treffen. Hier wird gekauft, an der Waffenkammer und am Fahrzeugdepot.' },
  fob:       { name: 'Vorposten (FOB)', cat: 'fob', hp: 320, sight: 3, cash: 7500, turns: 0, radius: 2,
               desc: 'Einflussbereich 2 Felder: Lager für Material und Treibstoff, Bauplatz für alle Stellungen, Nachschub für Munition. Feindliche Infanterie kann die Konsole hacken und den ganzen Vorposten übernehmen.' },
  sandsack:  { name: 'Sandsackstellung', cat: 'fort', hp: 90, sight: 1, bau: 4, turns: 1, passable: true, cover: 0.2,
               desc: 'Eigene Einheiten können darauf stehen und erhalten 20 % zusätzliche Deckung.' },
  hesco:     { name: 'HESCO-Wall', cat: 'fort', hp: 170, sight: 1, bau: 8, turns: 2,
               desc: 'Drahtkörbe voll Erde: sperrt das Feld für Bodeneinheiten. 2 Sprengladungen stark.' },
  bremer:    { name: 'Bremer-Wand', cat: 'fort', hp: 420, sight: 1, bau: 20, turns: 3,
               desc: 'Hohe Betonwand: sperrt das Feld und hält auch schwerem Beschuss stand.' },
  moerser:   { name: 'Mörserstellung', cat: 'def', hp: 140, sight: 2, bau: 18, turns: 2, weapon: 'mortar',
               desc: 'Indirektes Feuer, Reichweite 2–4, trifft auch Nachbarfelder. Jeder Schuss kostet 2 Material aus dem Lager. Feuert am Rundenende selbstständig.' },
  sam:       { name: 'Talon-SAM', cat: 'def', hp: 150, sight: 3, bau: 22, turns: 3, weapon: 'sam',
               desc: 'Luftabwehrraketen, Reichweite 1–4. Kampfhubschrauber können mit Täuschkörpern ausweichen.' },
  ciws:      { name: 'Vanguard-CIWS', cat: 'def', hp: 170, sight: 3, bau: 26, turns: 3, weapon: 'ciws',
               desc: 'Rotierende Maschinenkanone, Reichweite 1–3. Täuschkörper nützen nichts. Gegen Bodenziele schwach.' },
  werkstatt: { name: 'Werkstatt', cat: 'sup', hp: 160, sight: 2, bau: 14, turns: 2,
               desc: 'Repariert eigene Fahrzeuge und Hubschrauber im FOB-Bereich um 25 pro Runde und füllt Munition und Täuschkörper auf.' },
  bohrturm:  { name: 'Bohrturm', cat: 'sup', hp: 220, sight: 2, bau: 28, turns: 4, drill: true,
               desc: 'Hot-Zone-Magnet: Mit 6 Treibstoff gestartet, zieht er die Hot Zone jede Runde zum FOB. Verbraucht 1 Treibstoff pro Runde. Zieht jeden Feind der Karte an.' },
  wachturm:  { name: 'Beobachtungsturm', cat: 'sup', hp: 120, sight: 6, bau: 12, turns: 2,
               desc: 'Weite Sicht (6 Felder) über den Vorposten hinaus.' },
};
export const BUILD_LIST = ['sandsack', 'hesco', 'bremer', 'moerser', 'sam', 'ciws', 'werkstatt', 'bohrturm', 'wachturm'];

export const PALLETS = {
  bau:   { name: 'Materialpalette', icon: '▦', cost: 400, amount: 20, unit: 'Material', desc: '+20 Material für das FOB-Lager' },
  sprit: { name: 'Treibstoffpalette', icon: '⛽', cost: 400, amount: 3, unit: 'Treibstoff', desc: '+3 Treibstoff für den Bohrturm' },
};

// Geld: alles in Dollar wie im Original
export const PAY = {
  cz: 160,            // je Kopf in der Control Zone pro Wertung
  hz: 320,            // je Kopf in der Hot Zone pro Wertung
  killInf: 1500, killVeh: 3200, killAir: 3600, killBld: 600,
  revive: 500, heal: 400, transport: 350, transportHz: 500, hammer: 40, built: 150,
  pallet: 1500,       // Lieferprämie je Palette im FOB-Bereich nahe der Zone
  hackFob: 2500,
};
export const START_CASH = 10000;
export const CASH_FLOOR = 5000;   // nie mit weniger in einen Einsatz
export const FOB_STOCK = { bau: 30, sprit: 0 };
export const CODE_USES = 5;       // Turmcode darf so oft pro Partie eingegeben werden
export const CODE_LOCK = 3;       // so viele Runden hält ein Turm die Hot Zone fest
export const TOWER_CD = 6;        // Abklingzeit eines Turms nach Codeeingabe
export const SPZ_RESPAWN = 4;
export const SPZ_DEPLOYS = 2;     // Einsätze pro Runde an einem SPz
export const DOWNED_TURNS = 2;    // so viele eigene Rundenstarts bis zum Verbluten

export const TARGETS = { kurz: 12, normal: 20, lang: 30 };

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
  support: { name: 'Pionier', icon: '⚒' }, driver: { name: 'Fahrer', icon: '⛟' }, pilot: { name: 'Pilot', icon: '✈' },
};
