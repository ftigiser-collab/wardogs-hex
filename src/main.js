// Einstieg: Menü, Einsatzplanung, Konto, Spielschleife
import { generateMap, mapName } from './map.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Controller } from './ui.js';
import { FX } from './fx.js';
import { DIFFICULTY, FACTIONS, FAC_KEYS, TARGETS, START_CASH, CASH_FLOOR, UNITS } from './data.js';
import { center } from './hex.js';
import { startMenuBg } from './menubg.js';
import { crestImg } from './crest.js';
import { SLOTS, readAuto, slotMeta, readSlot, deleteSlot, metaFromSave } from './saves.js';

let menuBg = null;
try { menuBg = startMenuBg(document.getElementById('menu')); } catch (e) { console.warn(e); }

const $ = (s) => document.querySelector(s);
const money = (v) => '$' + Math.floor(v).toLocaleString('de-DE');
const MAPS = { klein: [30, 22], mittel: [36, 26], gross: [42, 30] };

// ---------- Konto: Geld und Bilanz über alle Einsätze ----------
const KONTO = 'hundemarke-konto';
function readKonto() { try { return { bank: START_CASH, games: 0, wins: 0, best: 0, ...JSON.parse(localStorage.getItem(KONTO) || '{}') }; } catch { return { bank: START_CASH, games: 0, wins: 0, best: 0 }; } }
function writeKonto(k) { try { localStorage.setItem(KONTO, JSON.stringify(k)); } catch {} }
function showKonto() {
  const k = readKonto();
  $('#mkonto').innerHTML = `<span>Konto <b>${money(k.bank)}</b></span><span>${k.games} ${k.games === 1 ? 'Einsatz' : 'Einsätze'} · ${k.wins} ${k.wins === 1 ? 'Sieg' : 'Siege'}</span><button id="kreset" title="Konto auf $10.000 zurücksetzen">↺</button>`;
  $('#kreset').onclick = () => { if (confirm('Konto wirklich auf $10.000 zurücksetzen?')) { writeKonto({ bank: START_CASH, games: 0, wins: 0, best: 0 }); showKonto(); } };
}
showKonto();

let opts = { faction: 'ironstar', map: 'mittel', target: 'normal', diff: 'normal', cash: 'konto', seed: '' };
try { opts = { ...opts, ...JSON.parse(localStorage.getItem('hundemarke-opts') || '{}') }; } catch {}
if (!FACTIONS[opts.faction]) opts.faction = 'ironstar';
$('#mcrests').innerHTML = FAC_KEYS.map((f) => crestImg(f, 50)).join('');

let saved = readAuto();
if (saved) { const c = $('#continue'); c.style.display = 'block'; c.textContent = `Fortsetzen (Runde ${saved.round})`; c.onclick = () => start(saved); }

function seg(id, values, labels) {
  return `<div class="seg" data-opt="${id}">${values.map((v, i) => `<button data-v="${v}" class="${String(opts[id]) === String(v) ? 'on' : ''}">${labels[i]}</button>`).join('')}</div>`;
}
function showSkirmish() {
  const el = $('#skirmish'), k = readKonto();
  const fac = (f) => { const F = FACTIONS[f], sp = UNITS[F.special]; return `<button data-fac="${f}" class="${opts.faction === f ? 'on' : ''}" style="--c:${F.color}">${crestImg(f, 44)}<b>${F.name}</b><span>${F.desc}<br>${F.perkText} · ${sp.name}</span></button>`; };
  el.innerHTML = `<div class="box"><button class="close">×</button><h2>Einsatz planen</h2>
    <div class="m-label">Eure Fraktion — die beiden anderen sind eure Gegner</div>
    <div class="facgrid three">${FAC_KEYS.map(fac).join('')}</div>
    <div class="m-label">Punkteziel</div>${seg('target', ['kurz', 'normal', 'lang'], ['Kurz · 12', 'Normal · 20', 'Lang · 30'])}
    <div class="m-label">Einsatzgebiet</div>${seg('map', ['klein', 'mittel', 'gross'], ['Klein', 'Mittel', 'Groß'])}
    <div class="m-label">Schwierigkeit</div>${seg('diff', ['leicht', 'normal', 'schwer'], ['Leicht', 'Normal', 'Schwer'])}
    <div class="m-label">Kasse</div>${seg('cash', ['konto', 'fest'], [`Konto · ${money(Math.max(CASH_FLOOR, k.bank))}`, `Fest · ${money(START_CASH)}`])}
    <div class="m-hint">Mit „Konto“ zählt jeder Dollar: Was am Ende übrig ist, nehmt ihr mit — plus Prämie.</div>
    <div class="m-label">Karte (optional)</div><input id="seed" placeholder="Zufällig — oder Zahl/Wort eingeben" autocomplete="off" value="${opts.seed || ''}">
    <div class="row"><button id="sback">Zurück</button><button id="sgo" class="primary">Einsatz starten</button></div></div>`;
  el.classList.add('show');
  el.querySelector('.close').onclick = el.querySelector('#sback').onclick = () => el.classList.remove('show');
  el.querySelectorAll('[data-fac]').forEach((b) => b.onclick = () => { opts.faction = b.dataset.fac; el.querySelectorAll('[data-fac]').forEach((x) => x.classList.toggle('on', x === b)); });
  el.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.onclick = () => {
    const v = b.dataset.v; opts[sg.dataset.opt] = isNaN(+v) ? v : +v;
    sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  el.querySelector('#sgo').onclick = () => {
    opts.seed = el.querySelector('#seed').value.trim();
    try { localStorage.setItem('hundemarke-opts', JSON.stringify(opts)); } catch {}
    el.classList.remove('show'); start();
  };
}
function crests(m) { return m.factions.map((f) => crestImg(f, 22)).join(''); }
function showSaves() {
  const el = $('#saves');
  const auto = readAuto(), am = metaFromSave(auto);
  let html = '<div class="box"><button class="close">×</button><h2>Spielstände</h2>';
  if (am) html += `<div class="slot"><span class="sn">Auto</span><div><div class="crs">${crests(am)}</div><div class="si">Runde ${am.round} · Karte ${am.size} · ${am.score}</div></div><div class="sb"><button class="primary" data-load="auto">Laden</button></div></div>`;
  for (let k = 1; k <= SLOTS; k++) {
    const m = slotMeta(k);
    html += m ? `<div class="slot"><span class="sn">${k}</span><div><div class="crs">${crests(m)}</div><div class="si">Runde ${m.round} · Karte ${m.size} · ${m.date}</div></div><div class="sb"><button class="primary" data-load="${k}">Laden</button><button data-del="${k}">✕</button></div></div>`
      : `<div class="slot"><span class="sn">${k}</span><div class="si">Leer — im Spiel über ☰ speichern</div><div></div></div>`;
  }
  el.innerHTML = html + '</div>';
  el.classList.add('show');
  el.querySelector('.close').onclick = () => el.classList.remove('show');
  el.querySelectorAll('[data-load]').forEach((b) => b.onclick = () => { const k = b.dataset.load; const d = k === 'auto' ? auto : readSlot(+k); if (d) { el.classList.remove('show'); start(d); } });
  el.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { deleteSlot(+b.dataset.del); showSaves(); });
}
$('#start').onclick = () => showSkirmish();
$('#loadbtn').onclick = () => showSaves();
try { const ls = sessionStorage.getItem('hundemarke-load-slot'); if (ls) { sessionStorage.removeItem('hundemarke-load-slot'); const d = ls === 'auto' ? readAuto() : readSlot(+ls); if (d) setTimeout(() => start(d), 50); } } catch {}

async function start(save) {
  $('#menu .loading').classList.add('show');
  await new Promise((r) => setTimeout(r, 50));
  let seed, map, game;
  if (save) {
    seed = save.seed; map = generateMap(seed, save.W || 36, save.H || 26);
    game = Game.restore(map, save, DIFFICULTY[save.diffName || 'normal']);
  } else {
    seed = opts.seed ? (parseInt(opts.seed, 10) || hash(opts.seed)) : Math.floor(Math.random() * 1e6);
    const [W, H] = MAPS[opts.map] || MAPS.mittel;
    map = generateMap(seed, W, H);
    const factions = [opts.faction, ...FAC_KEYS.filter((f) => f !== opts.faction).sort(() => Math.random() - 0.5)];
    const k = readKonto();
    const konto = opts.cash !== 'fest';
    game = new Game(map, { diff: DIFFICULTY[opts.diff], factions, target: TARGETS[opts.target] || 25, playerCash: konto ? Math.max(CASH_FLOOR, k.bank) : START_CASH });
    game.diffName = opts.diff; game.settings = { ...opts }; game.konto = konto;
    game.setup();
  }
  const fx = new FX();
  const renderer = new Renderer($('#game'), game, fx);
  const ctrl = new Controller(game, renderer, fx);
  ctrl.onEnd = (state) => {
    if (!game.konto) return null;
    const k = readKonto(), before = k.bank, bonus = state === 'won' ? 5000 : 1000;
    k.bank = Math.round(game.players[0].credits + bonus); k.games++; if (state === 'won') k.wins++; k.best = Math.max(k.best || 0, k.bank);
    writeKonto(k);
    return `Konto: ${money(before)} → ${money(k.bank)} (inkl. ${money(bonus)} ${state === 'won' ? 'Siegprämie' : 'Einsatzprämie'})`;
  };
  window.__game = { game, renderer, ctrl };
  const home = center(map.starts[0].c, map.starts[0].r), cz = center(game.cz.c, game.cz.r);
  renderer.cam.z = window.innerWidth < 700 ? 0.7 : 0.95;
  renderer.centerOn(home.x + (cz.x - home.x) * 0.3, home.y + (cz.y - home.y) * 0.3, false);
  $('#menu').classList.add('hide');
  if (menuBg) { const b = menuBg; menuBg = null; setTimeout(() => b.stop(), 600); }
  $('#seedinfo').textContent = `${map.name} · Karte ${seed}`;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    ctrl.update(dt);
    renderer.draw(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  if (!save) {
    game.say(`Einsatzgebiet ${map.name}. Haltet die Control Zone — die Hot Zone zählt doppelt.`, 'info');
    game.say('Tipp: HQ antippen, um Einheiten zu kaufen. Pioniere errichten Vorposten.', 'info');
    ctrl.save();
  }
  ctrl.refresh();
  await ctrl.banner(save ? `Runde ${game.round}` : map.name, save ? 'Einsatz fortgesetzt' : `${game.players.map((p) => p.name).join(' · ')} · Ziel ${game.target} Punkte`, 1.6, game.players[0].faction);
}

function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 1e6; }

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
