# Projektkontext: Trainingsplan CrossIntense

Stand: 27.05.2026

Aktuelle App-/Cache-Version: `v73`

## Ziel

Die App ist ein digitaler Trainingsplan fuer CrossIntense, nutzbar am PC und Handy. Sie laeuft als statische Web-App ueber GitHub Pages und synchronisiert Trainingsdaten via Supabase.

Live-URL:

https://staehth.github.io/TrainingsplanCrossIntense/

Repository:

https://github.com/staehth/TrainingsplanCrossIntense

## Technischer Aufbau

- Frontend ohne Build-Schritt: `index.html`, `styles.css`, `app.js`
- PWA/Cache: `sw.js`, `manifest.webmanifest`
- Logo: `CIT_Logo-Schwarz.png`
- Deployment: GitHub Pages aus Branch `main`, Ordner `/root`
- Persistenz lokal: Browser Storage
- Sync: Supabase
- Supabase-Projekt-URL: `https://rkvjktevdmlikzrcewel.supabase.co`
- Supabase Publishable Key ist in `app.js` hinterlegt.

Nach Aenderungen:

1. lokal testen
2. `git add ...`
3. `git commit -m "..."`
4. `git push`
5. GitHub Pages braucht meist 1 bis 3 Minuten
6. Bei Cache-Problemen `Ctrl + F5` oder Browserdaten fuer die Seite loeschen

Wenn statische Assets oder gecachte Dateien geaendert werden, die Cache-Version in `sw.js` erhoehen.

Die aktuelle Version wird in den Settings unten angezeigt. Wenn Handy und PC unterschiedliche Versionen zeigen, laeuft auf einem Geraet noch ein alter Browser-/Service-Worker-Cache.

## Nutzer und Login

Die App soll nur nach Login bedienbar sein, damit keine lokalen Trainings versehentlich ohne Sync erfasst werden.

Besonderheit:

- Registrierung kann in den Settings ein- und ausgeschaltet werden.
- Diese Option ist nur sichtbar, wenn der eingeloggte User `thstaehli@gmail.com` ist.
- Nicht eingeloggte User sehen die Registrierungsoption nicht.
- Nach erfolgreichem Login soll die App automatisch auf den Reiter `Training` wechseln.

## Trainingslogik

Es gibt Phasen:

- 4 Wochen Training
- 2 Wochen Kontrast

Eine Phase startet immer an einem Montag.

### 4-Wochen-Training

Trainiert wird Montag, Mittwoch, Freitag. Ein 4-Wochen-Block hat 12 Trainings.

Training A:

- 2 Uebungen, z.B. A1 und A2

Training B:

- 2 Uebungen, z.B. B11 und B12

A und B wechseln sich ab. Jedes Uebungspaar kommt idealerweise 6x vor.

Anzeigeformat in Kalenderkacheln:

- Datum
- Training, z.B. `Training A - 1`
- Uebung 1, z.B. `A1 - Frontsquat`
- Uebung 2, z.B. `A2 - Klimmzuege enger Griff supiniert`
- Status

Das 5. Training eines Uebungspaars wird mit rotem `PR` in der Kachel markiert. Training 5 und 6 gelten im Fokus als `PR-Tag`, aber der rote Hinweis in der Kachel soll nur bei Training 5 stehen.

Falls wegen Skippen weniger Trainings stattfinden, zaehlt trotzdem der beste erfasste Wert als PR/PB.

Zusaetzlich zum Skippen ganzer Trainings kann eine einzelne Uebung innerhalb eines Trainings geskippt werden:

- Die Einheit kann weiterhin als erledigt markiert werden.
- Die geskippten Uebungswerte bleiben erhalten, werden aber deaktiviert/grau dargestellt.
- Die geskippten Uebungen zaehlen nicht fuer PR/PB, Statistik oder Bestleistung.
- In der Kalenderkachel wird eine geskippt markierte Einzeluebung durchgestrichen.

### Kontrasttraining

Kontrastphasen dauern 2 Wochen und haben ebenfalls Montag, Mittwoch, Freitag, also 6 Trainings.

Es gibt Kontrast 1 und Kontrast 2. Pro Kontrasttraining koennen bis zu 10 Uebungen eingetragen werden. Angezeigt werden nur Uebungen, die wirklich ausgefuellt sind.

Kontrastuebungen werden global verwaltet:

- Beim Erfassen einer Kontrastphase kann man bestehende Uebungen auswaehlen oder neue direkt erfassen.
- Neue Uebungen sollen in die globale Kontrastuebungsliste uebernommen werden.
- Die Liste wird alphabetisch sortiert.
- Kontrastuebungen koennen geloescht werden.
- Das Loeschen einer Kontrastphase darf globale Kontrastuebungen nicht loeschen.

## Uebungen und Hilfsmittel

Es gibt eine Uebungsverwaltung in den Settings, aufgeteilt in:

- Training
- Kontrast

Bei Trainingsuebungen wird pro Uebung das Hilfsmittel verwaltet, nicht nur die Hilfsmittel selbst.

Bekannte Hilfsmittel:

- Stange
- Hantel
- Baender
- Maschine
- Koerpergewicht
- Kabelzug

Wichtig: Aeltere Trainingseintraege sollen moeglichst stabil bleiben, wenn ein Hilfsmittel spaeter geaendert wird. Hintergrund: Wenn eine Uebung z.B. von Band auf Hantel wechselt, sollen alte Werte nicht falsch interpretiert werden.

Uebungen ohne Stange aus der urspruenglichen Liste:

- A2 - Baender
- A6 - Hantel
- A10 - Baender
- A14 - Baender
- B16 - Hantel
- A18 - Baender
- B20 - Hantel

`KH` bedeutet Kurzhantel.

Bei Banduebungen sind Texte/Kombinationen wichtig, nicht nur Zahlen. Beispiel: `gruen&schwarz`.

Bandlogik:

- Gruen = meiste Unterstuetzung
- Rot = weniger Unterstuetzung als Gruen
- Schwarz = weniger Unterstuetzung als Rot
- Kombinationen sind moeglich
- Rot + Schwarz zusammen ist weniger Unterstuetzung als Gruen
- Danach kommt Koerpergewicht
- Danach Koerpergewicht mit Zusatzgewicht

Diese Logik muss auch in PB/PR-Vergleichen beruecksichtigt werden, weil es nicht immer ein reiner Zahlenwert ist.

Aktuelle UI fuer Banduebungen:

- Pro Satz gibt es Checkboxen fuer `Gruen`, `Rot`, `Schwarz` und `Koerper`.
- `Koerper` bedeutet Koerpergewicht ohne Zusatzgewicht.
- Zusatzgewicht setzt automatisch Koerpergewicht.
- Wenn nach Koerpergewicht/Zusatzgewicht wieder ein Band gewaehlt wird, werden Koerpergewicht und Zusatzgewicht in dieser Satzzeile geloescht.
- Das sichtbare Label ist bewusst kurz `Koerper`, intern bleibt die Bedeutung Koerpergewicht.
- Bei allen Gewichtseingaben gilt: keine negativen Werte und maximal zwei Nachkommastellen.
- Negative Werte werden in der Speicherlogik auf `0` geklemmt.

## Statistik

Es gibt einen eigenen Reiter `Statistik`.

Die fruehere `Auswertung` aus dem Trainingsreiter wurde dorthin verschoben.

Statistik soll getrennt umschaltbar sein:

- Trainings-PBs/PRs
- Kontrast-PBs

Bei Trainingsuebungen:

- Der 3. Satz ist immer der schwerste Satz, weil das Trainingssystem so aufgebaut ist.
- Anzeige z.B.:
  - `Bankdruecken 30°`
  - `Schwerster Satz: Satz 3`
  - rechts grosser Wert
  - darunter `Aktueller PR: 25.05.26` ohne erneut das Gewicht zu wiederholen

Bei Kontrastuebungen:

- Der schwerste Satz kann Satz 3 oder Satz 4 sein.
- Der beste Satz soll dynamisch anhand des hoechsten Scores markiert werden.
- Die Markierung soll erst nach Verlassen des Eingabefeldes neu berechnet werden, nicht bei jedem Tastendruck, damit der Fokus beim Tippen nicht springt.
- Anzeige z.B.:
  - `Trizeps Kabelzug`
  - `Schwerster Satz: Satz 4, 05.06.26`

Wenn sich eine Kontrastuebung wiederholt, soll beim Ausfuellen die bisher beste Leistung unterhalb der Uebung angezeigt werden.

## Navigation und Anzeige

Reiter:

- Training
- Statistik
- Settings

Beim Wechsel auf `Training` soll die App auf Basis des heutigen Datums automatisch die passende Phase und Einheit auswaehlen.

Am Wochenende:

- Die App sollte sinnvoll die naechste oder aktuelle relevante Trainingseinheit anzeigen, ohne eine falsche Samstag/Sonntag-Einheit zu erzeugen.

In den Settings:

- Phasen sollen per Plus/Minus direkt auf- und zuklappbar sein.
- Die alte Bedienung ueber `Phase bearbeiten` wurde entfernt.
- Uebungsverwaltung ebenfalls per Plus/Minus auf- und zuklappbar.
- Der manuelle Button `Jetzt syncen` steht nur noch in den Settings und nur, wenn ein User eingeloggt ist.
- Unten in Settings steht die aktuelle Version, z.B. `Version v73`.

Kalender:

- Standardmaessig nur aktuelle Woche anzeigen.
- Mit Plus kann der ganze Kalender aufgeklappt werden.

Topbar:

- Links ist das Logo `CIT_Logo-Schwarz.png`.
- Klick auf das Logo fuehrt zum Trainingsreiter.
- Text rechts neben dem Logo.
- Favicon und PWA-Icons wurden aus dem Logo erzeugt und in HTML/Manifest/Service Worker eingebunden.

## Reset-Verhalten

Button unten in Settings:

`App zurücksetzen - ALLE Daten werden gelöscht`

Gewuenschtes Verhalten:

- Erfasste Trainingsdaten und Phasen loeschen
- Nicht die globale Uebungsverwaltung loeschen
- Reset muss auch in Supabase landen, sonst kommen alte Phasen nach `Jetzt syncen` wieder zurueck

Frueheres Problem:

- Nach Reset waren lokale Daten weg, nach Sync kamen alte Phasen wieder.
- Ursache lag in Sync-/Speicherlogik. Beim Weiterarbeiten Reset immer gegen Supabase testen.

## Sync-Regeln und bekannte Risiken

Sync soll so funktionieren:

- Eingaben werden automatisch gespeichert und nach Supabase synchronisiert.
- Auf anderem Geraet muss ggf. in Settings `Jetzt syncen` gedrueckt werden, um aktuelle Daten runterzuladen.
- Es wurde diskutiert, spaeter eine Meldung `Neue Daten vorhanden, bitte synchronisieren` einzubauen. Noch nicht umgesetzt.

Bekannte Problemstellen aus der Entwicklung:

- Struktur von Phasen und Uebungen wurde mehrfach geaendert. Immer auf Migration/Fallbacks achten.
- Leere Phase oder leerer Plan darf die App nicht blockieren.
- Fehlermeldungen sollen benutzerfreundlich sein, z.B. nicht `parsed.phases[0] is undefined`.
- Nach dem Anlegen der ersten Phase muss sie sofort sichtbar sein, nicht erst nach `Ctrl + F5`.
- Wenn ein Kontrastprogramm geloescht wird, duerfen globale Kontrastuebungen nicht verschwinden.
- Wenn neue Kontrastuebungen in einer Phase erfasst werden, muessen sie auch in der globalen Liste gespeichert werden.
- Mobile Browser feuern bei Checkboxen teils eher `change` als `input`; Band-Totals muessen auf beiden Events aktualisiert werden.
- Bei Service-Worker/Cache-Problemen hilft auf dem Handy oft eine URL mit Query-Parameter oder das Loeschen der Website-Daten.

## Wichtige Testfaelle

Nach groesseren Aenderungen testen:

1. Login auf PC
2. Login auf Handy
3. Neue Trainingsphase anlegen
4. Neue Kontrastphase anlegen
5. Phase direkt nach dem Anlegen in Training und Settings sichtbar
6. Training erledigen
7. Training skippen
8. PR-Anzeige bei Training 5 und 6 pruefen
9. Roter PR-Hinweis nur bei Training 5
10. Bandwerte wie `gruen&schwarz` speichern und wieder anzeigen
11. PB/PR fuer Banduebungen pruefen
12. Kontrastuebung neu erfassen
13. Kontrastuebung aus globaler Liste auswaehlen
14. Kontrastuebung umbenennen
15. Kontrastuebung loeschen
16. Kontrastphase loeschen, globale Uebungen muessen bleiben
17. Statistik Training
18. Statistik Kontrast
19. Dynamische Markierung des besten Kontrastsatzes nach Blur
20. Reset: Trainingsdaten weg, globale Uebungen bleiben
21. Sync nach Reset: alte Phasen duerfen nicht zurueckkommen
22. PC erfassen, Handy syncen
23. Handy erfassen, PC syncen
24. GitHub Pages nach Push testen
25. Service-Worker-Cache bei Asset-Aenderungen pruefen
26. Einzelne Uebung skippen, Training erledigen, Kalender-Durchstreichung pruefen
27. Geskippte Einzeluebung darf nicht in Statistik/PR/PB zaehlen
28. Banduebung: Koerper ohne Zusatz als gueltiger Satz
29. Banduebung: Zusatz setzen, danach Band waehlen; Koerper/Zusatz muessen verschwinden
30. Mobile: Band-Totals aktualisieren sich direkt bei Checkbox-Wechsel
31. Gewichtsfelder: keine negativen Werte und maximal zwei Nachkommastellen
32. Settings: Version sichtbar und entspricht der Cache-Version in `sw.js`

## Hinweise fuer Codex im Buero

Bitte zuerst immer:

```powershell
git pull
git status --short
```

Dann Code lesen, besonders:

- `app.js`
- `index.html`
- `styles.css`
- `sw.js`

Nach Aenderungen:

```powershell
git status --short
git diff
```

Wenn alles passt:

```powershell
git add .
git commit -m "Kurze Beschreibung"
git push
```

Bitte keine Userdaten hart zuruecksetzen, ausser der User verlangt es klar.

Bitte keine bestehende Logik grob ersetzen, sondern gezielt arbeiten. Die App ist inzwischen stark nutzungsgetrieben und viele Details sind bewusst so umgesetzt.
