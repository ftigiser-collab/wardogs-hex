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

## Stand: Stufe 1
- Komplettes Regelwerk, KI für drei Fraktionen, ländliche Karte (Felder, Wälder, Ortschaften, Fluss mit Brücken, Straßen, Hügel)
- Eigene Grafik für alle Einheiten, Bauten, Funktürme und Abzeichen

## Geplant
- Fortschrittsspuren (Sturm, Sanität, Aufklärung, Pionier, Fahrer, Pilot) mit Freischaltungen gegen Gebühr
- Mehrere Kartentypen und rotierende Zonen
- **Später:** Sound und Musik

## Technik
Reines HTML/JavaScript (ES-Module), Canvas 2D, keine Abhängigkeiten. Alle Grafiken entstehen per Code.
