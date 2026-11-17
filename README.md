# Hundemarke

Spin-off von [Sandthron](https://github.com/ftigiser-collab/sandthron) im Setting des Team17-Shooters **Wardogs**: rundenbasierte King-of-the-Hill-Strategie auf Hexfeldern mit drei Söldnerfraktionen. Läuft im Browser (PWA), am PC und auf dem Handy.

**Spielen:** https://ftigiser-collab.github.io/wardogs-hex/ (sobald GitHub Pages aktiv ist)

## Kern: Control Zone und Hot Zone
- **Drei Fraktionen gleichzeitig** (ihr + zwei KI), jeder gegen jeden, Zugfolge rotiert jede Runde.
- **Control Zone (CZ):** Am Rundenende bekommt die Fraktion mit den meisten Köpfen in der CZ 1 Punkt (Gleichstand: niemand). Ziel 12/20/30 Punkte.
- **Hot Zone (HZ):** wandert jede Runde ein Feld durch die CZ (Vorhersage sichtbar), Köpfe zählen doppelt, Aktionen bringen doppeltes Geld.
- **Funktürme A–D:** Konsole hacken verrät eine Ziffer des Codes; mit drei Ziffern ist der Code bekannt. Eingabe auf eigenem Turm reißt die HZ für 3 Runden dorthin (6 Runden Abklingzeit, 5 Eingaben pro Partie).
- **Bohrturm:** mit 6 Treibstoff gestartet, zieht er die HZ jede Runde zum eigenen Vorposten.

## Geld statt Ernte
- Alles kostet Dollar, jede Einheit wird am HQ gekauft. Einnahmen: $160/$320 je Kopf in CZ/HZ pro Wertung, Abschüsse, Rettungen, Transport in die Zone, Palettenlieferungen, Bauen.
- **Konto:** Restgeld wird in den nächsten Einsatz mitgenommen (plus Prämie), nie unter $5.000.
- **Kopfgeld** auf den Punkteführer (+50 %), damit drei Fraktionen im Gleichgewicht bleiben.

| Sandthron | Hundemarke |
|---|---|
| Glut, Ernter, Raffinerie | Dollar, Zonengeld, Kopfgeld |
| Bauhof-Basis | HQ mit sicherer Zone + Vorposten (FOB) im Feld |
| Würmer, Sturm | Hot Zone, Turmcodes, Bohrturm |
| Thopter | Hubschrauber (Leicht-, Transport-, Kampfhubschrauber) |
| Gebäude zerstören | Zone halten |

**Fraktionen:** Ironstar (westliche Kontraktoren, Sperber), Volkhova (Sowjet-Restaurationsmiliz, Grad-Werfer), Simurgh (persische Schattenarmee, Drohnentrupp).

**Weitere Mechaniken:** Verwundet statt tot (Sanitäter retten), Munitionswahl FMJ/HP/AP, Niederhalten durch MG/Minigun, Einsatz-SPz als vorgeschobener Spawnpunkt mit zerstörbarer Antenne, FOB mit Lager, Hammerschlägen und hackbarer Konsole, Paletten-Logistik, zerstörbare Ortschaften.

## Stufe 1
- Komplettes Regelwerk, KI für drei Fraktionen, ländliche Karte (Felder, Wälder, Ortschaften, Fluss mit Brücken, Straßen, Hügel)
- Eigene Grafik für alle Einheiten, Bauten, Funktürme und Abzeichen

## Stand: Stufe 2
- **Loadouts wie in Wardogs:** Infanterie aus Waffe + bis zu 2 Ausrüstungsteilen + Weste, Rolle ergibt sich aus der Ausrüstung. 30 Waffen (KH-2002 bis AMR 50, RPG-7, Verba, MGL-40), 16 Ausrüstungsteile (C4, Molotow, Rauch, Defi, Entfernungsmesser, Claymore, Ghillie, drei Hämmer, Panzermine …)
- **Sechs Spuren** (Sturm, Sanität, Aufklärung, Unterstützung, Fahrer, Pilot) mit Konto-XP, Wardog-Stufe als Summe, **Waffenkammer** zum Freischalten gegen Gebühr
- **Wardogs-Fahrzeuge:** Bobcat, Kodiak, Ural, Wolf, Buggy, Pickup, Humvee, T-72, L2A6, Gepard, SPH-2, MH-6, AH-6, Lakota, Havoc
- **FOB-Bauten mit drei Hammerstufen:** Sandsack, Draht, Panzersperre, Zelt, HESCO, Tür, Tor, Lautsprecher, Bunker, Aufklärungsturm, Bremer, Schutzraum, Stingray, Mörser, Tankstation, Reparaturstation, SAM, CIWS, Bohrturm; Feldbauten aus dem Rucksack
- **Große Karten** bis 60×42, Symbolansicht beim Herauszoomen, **Taktikkarte** im Wardogs-Stil (M)

## Stand: Stufe 3
- Hubschrauber nehmen nur gelandet auf und setzen nur gelandet ab; Fallschirmabsprung aus der Luft (Einweg-Fallschirm im Loadout, zufälliger Landepunkt, verwundbar bis zur nächsten Runde, Überlebensprämie)
- Wardogs-Ökonomie: Pendelfahrten-Bonus, Versorgungskisten, Aufklärungs-Assist, Bauten übernehmen, Teambeitrag nach Platz, Rekrutenrabatt bis Wardog-Stufe 9
- Regenfronten (−1 Sicht), Fahrzeugnebel als Gegenmaßnahme
- Koalition gegen den Führenden: KI-Verbündete schonen sich, sammeln sich innen am CZ-Rand und stürmen gemeinsam, Turmcode gegen die HZ des Führenden
- Kompaktes Einheiten-Panel: Statuschips, kurze Aktionsknöpfe, Details einklappbar; Kamera weicht aus, damit die gewählte Einheit sichtbar bleibt; Baumenü zeigt nur, was der Hammer kann

## Stand: Balancing-Runde 1
- Keine Nacht mehr, Wetter statt Tageszeit; Gelände mit deutlich mehr Gewicht (Deckung, Sicht, Reichweite, Waldtarnung, ungeschützte Straßen)
- Türme: +3 Sicht, +1 Reichweite, aber +25–30 % Schaden
- Mehr Transportplätze, günstigere Preise, deutlich schnelleres Freischalten
- Koalition sammelt sich innen am CZ-Rand
- Eigene Grafiken für Ural (6×6 mit Plane), SPH-2 (Radhaubitze), Lakota (Black-Hawk-Stil) und Havoc (Tandemcockpit); schwere/leichte Westen und Ghillie-Anzüge an den Figuren sichtbar

## Geplant
- Mehrere Kartentypen und rotierende Zonen
- Option: gleichzeitige Zugauswertung (WeGo) als eigener Modus
- **Später:** Sound und Musik

## Technik
Reines HTML/JavaScript (ES-Module), Canvas 2D, keine Abhängigkeiten. Alle Grafiken entstehen per Code.
