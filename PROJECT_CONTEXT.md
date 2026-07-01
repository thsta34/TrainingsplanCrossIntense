# Projektkontext: Trainingsplan CrossIntense

Stand: 27.05.2026

Aktuelle App-/Cache-Version: `v87`

## Aenderungsprotokoll

- 01.07.2026: GitHub-Pages-Deploy fuer `v87` erneut angestossen, weil GitHub Pages nach dem Push noch den vorherigen Commit `0fa0d7a`/Version `v86` auslieferte, obwohl `main` bereits auf `v87` stand.

- 01.07.2026: Service-Worker-Cache eingegrenzt. Der Fetch-Handler cached nur noch bekannte eigene App-Assets und keine Supabase/API- oder sonstigen Fremdrequests; fehlerhafte Responses werden nicht in den Cache geschrieben. Cache-/App-Version auf `v87` erhoeht.

- 01.07.2026: Globale Kontrastuebungs-Aenderungen schuetzen erledigte Trainings. Umbenennen/Typ/Stange aktualisiert weiterhin Bibliothek, Auswahl und geplante Einheiten, aber Sessions mit Status `done` behalten ihre gespeicherten Werte. Cache-/App-Version auf `v86` erhoeht.

- 01.07.2026: Rendering von frei eingegebenen Namen/Notizen gehaertet. Userdaten aus Kontrastuebungen, Datalist-Optionen, Trainingsformularen und Statistik werden vor `innerHTML`-Ausgabe escaped, damit Sonderzeichen/HTML die UI nicht beschaedigen. Cache-/App-Version auf `v85` erhoeht.

- 01.07.2026: Aendern eines Phasen-Startdatums abgesichert. Wenn dadurch eine Phase mit gleichem Typ und Startdatum doppelt entstuende, wird die Aenderung blockiert statt per Deduplizierung still eine Phase zu entfernen. Cache-/App-Version auf `v84` erhoeht.

- 01.07.2026: Sync-Schutz gegen stille Remote-Overwrites ergaenzt. Lokale Aenderungen werden mit `pendingSync`/Zeitstempeln markiert; Login/Manuell-Sync ueberschreibt ungesyncte lokale Aenderungen nicht mehr automatisch. Erfolgreiche Remote-Saves speichern `lastRemoteSyncedAt`. Cache-/App-Version auf `v83` erhoeht.

- 01.07.2026: Speichern von Satzwerten weiter gehaertet. Uebungslisten werden beim Rendern/Speichern nun konsequent ueber die konkrete Session/Phase aufgeloest; neue Phasen bekommen kuenftig eindeutige Session-IDs mit Startdatum. Bestehende Session-IDs bleiben unveraendert. Cache-/App-Version auf `v82` erhoeht.

- 01.07.2026: Speichern von Satzwerten in neuen Phasen stabilisiert. Ursache waren wiederverwendete Session-IDs wie `training-1` ueber mehrere Phasen hinweg; die Uebungsinitialisierung ordnet Sessions nun ueber die konkrete Phase bzw. Session-Objekt-Referenz zu. Cache-/App-Version auf `v81` erhoeht.

- 22.06.2026: Statistikbeschriftung fuer Uebungstyp `Stange` korrigiert. Statt des falschen Rueckfalltexts `Keine Stange` wird nun `Stange` angezeigt. Cache-/App-Version auf `v80` erhoeht.

- 22.06.2026: Uebungstyp `Kettlebell` ergaenzt. Das Gewicht wird pro Kettlebell erfasst; pro Satz kann zwischen einer und zwei Kettlebells gewaehlt werden. PB/PR und Gesamtanzeige beruecksichtigen die Anzahl. Cache-/App-Version auf `v79` erhoeht.

- 05.06.2026: GitHub Action `Supabase heartbeat` ergaenzt. Sie pingt alle 8 Stunden die Supabase REST API, um Free-Plan-Inaktivitaet zu vermeiden. Dafuer muss im neuen Supabase-Projekt die unten dokumentierte anonyme Heartbeat-Select-Policy gesetzt sein.
- 29.05.2026: Supabase-Projekt auf neuen Account migriert. App nutzt nun `https://tnhwyrapdsqoklenzwjn.supabase.co` und neuen Publishable Key; Tabelle `training_app_states` mit RLS/Policies im neuen Projekt angelegt. Cache-/App-Version auf `v78` erhoeht.
- 29.05.2026: GitHub-Repository von `staehth` zu `thsta34` transferiert. GitHub Pages laeuft nun unter `https://thsta34.github.io/TrainingsplanCrossIntense/`; lokale Git-Remote auf `https://github.com/thsta34/TrainingsplanCrossIntense.git` umgestellt.
- 29.05.2026: Lokale Arbeitsordner bereinigt. Der aktive Arbeitsordner ist wieder `C:\git_repository\TrainingsplanCrossIntense` und zeigt auf `thsta34`; der alte lokale Clone liegt archiviert unter `C:\git_repository\TrainingsplanCrossIntense-old-staehth`.
- 28.05.2026: `BEDIENUNGSANLEITUNG.md` erstellt. Die Dokumentation beschreibt Zweck, Login, Sync, Trainingserfassung, Kalender, PR/PB, Statistik, Settings, Uebungsverwaltung, Reset und typische Fragen fuer Endnutzer.
- 28.05.2026: Header erweitert. An trainingsfreien Wochentagen zeigt der Titel `Kein Training`; die kleine Header-Zeile verweist auf das naechste bzw. letzte Training. Cache-/App-Version auf `v77` erhoeht.

## Ziel

Die App ist ein digitaler Trainingsplan fuer CrossIntense, nutzbar am PC und Handy. Sie laeuft als statische Web-App ueber GitHub Pages und synchronisiert Trainingsdaten via Supabase.

Live-URL:

https://thsta34.github.io/TrainingsplanCrossIntense/

Repository:

https://github.com/thsta34/TrainingsplanCrossIntense

## Technischer Aufbau

- Frontend ohne Build-Schritt: `index.html`, `styles.css`, `app.js`
- PWA/Cache: `sw.js`, `manifest.webmanifest`
- Logo: `CIT_Logo-Schwarz.png`
- Deployment: GitHub Pages aus Branch `main`, Ordner `/root`
- Persistenz lokal: Browser Storage
- Sync: Supabase
- Supabase-Projekt-URL: `https://tnhwyrapdsqoklenzwjn.supabase.co`
- Supabase Publishable Key ist in `app.js` hinterlegt.

## Supabase Heartbeat

Es gibt eine GitHub Action:

```text
.github/workflows/supabase-heartbeat.yml
```

Sie laeuft alle 8 Stunden und kann zusaetzlich manuell unter `Actions` gestartet werden. Zweck ist, das Supabase-Free-Projekt durch echte REST-API-Aktivitaet aktiv zu halten.

Damit der Heartbeat trotz Row Level Security erfolgreich ist, braucht das neue Supabase-Projekt folgende zusaetzliche Policy. Sie erlaubt anonymen Requests einen Select, gibt wegen `using (false)` aber keine Userdaten frei:

```sql
drop policy if exists "Allow anon heartbeat without exposing rows" on public.training_app_states;

create policy "Allow anon heartbeat without exposing rows"
on public.training_app_states
for select
to anon
using (false);
```

Test-URL der Action:

```text
https://tnhwyrapdsqoklenzwjn.supabase.co/rest/v1/training_app_states?select=user_id&limit=1
```

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
- Kettlebell
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
- Unten in Settings steht die aktuelle Version, z.B. `Version v87`.

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

## Moegliche Migration weg von Supabase

Stand 04.06.2026: Supabase hat gemeldet, dass das Projekt wegen zu geringer Nutzung pausiert werden kann. Als Alternative wurde besprochen, die Synchronisation in die Datenbank des eigenen Hostings zu verschieben.

Wichtig: Die App laeuft aktuell statisch ueber GitHub Pages. Eine statische Browser-App darf nicht direkt mit einer normalen Hosting-Datenbank wie MySQL/MariaDB sprechen, weil sonst DB-Host, Benutzername und Passwort im Browser sichtbar waeren.

Sinnvoller Ansatz:

- GitHub Pages bleibt als Frontend moeglich.
- Auf dem Hosting wird eine kleine API bereitgestellt, z.B. mit PHP.
- Die App spricht mit dieser API statt direkt mit Supabase.
- Die API authentifiziert User und speichert/laedt den App-State in der Hosting-Datenbank.
- Der bestehende JSON-State kann weiterverwendet werden, weil die App bereits den gesamten Zustand als JSON synchronisiert.

Minimale API-Endpunkte:

- `POST /login` - User anmelden, Session/Cookie oder Token ausstellen
- `POST /register` - optional, falls Registrierung weiter in der App moeglich bleiben soll
- `GET /state` - gespeicherten Trainingszustand des eingeloggten Users laden
- `PUT /state` oder `POST /state` - Trainingszustand speichern/ueberschreiben
- `POST /logout` - optional, Session beenden

Minimales DB-Schema:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_app_states (
  user_id INT PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Offene Fragen vor Umsetzung:

- Welches Hosting wird genutzt?
- Gibt es PHP?
- Gibt es MySQL oder MariaDB?
- Koennen eigene PHP-Dateien hochgeladen werden?
- Unter welcher URL soll die API laufen, z.B. `/training-api/` oder eigene Subdomain?
- Soll Login per Cookie-Session oder Token geloest werden?
- Soll die bestehende Registrierung erhalten bleiben oder nur ein fixer User angelegt werden?

Alternative:

- Supabase behalten und regelmaessig aktiv halten, z.B. durch gelegentliche Nutzung oder einen externen Ping. Das waere weniger Umbau, macht aber weiter von Supabase abhaengig.

Bekannte Problemstellen aus der Entwicklung:

- Struktur von Phasen und Uebungen wurde mehrfach geaendert. Immer auf Migration/Fallbacks achten.
- Leere Phase oder leerer Plan darf die App nicht blockieren.
- Fehlermeldungen sollen benutzerfreundlich sein, z.B. nicht `parsed.phases[0] is undefined`.
- Nach dem Anlegen der ersten Phase muss sie sofort sichtbar sein, nicht erst nach `Ctrl + F5`.
- Wenn ein Kontrastprogramm geloescht wird, duerfen globale Kontrastuebungen nicht verschwinden.
- Wenn neue Kontrastuebungen in einer Phase erfasst werden, muessen sie auch in der globalen Liste gespeichert werden.
- Mobile Browser feuern bei Checkboxen teils eher `change` als `input`; Band-Totals muessen auf beiden Events aktualisiert werden.
- Android Chrome war bei Band-Checkboxen besonders heikel: Tippen auf den Label-Text liefert oft `span`/`label` als Event-Target statt den eigentlichen Input. Die App nutzt deshalb `bandInputFromTarget(...)`, um vom Event-Target auf den richtigen Input zurueckzufinden.
- Band-Aenderungen werden fuer Mobile zusaetzlich nach `pointerup`, `touchend` und `click` mit kurzem Timeout erneut synchronisiert und gespeichert. Das ist wichtig, weil der Browser den Checkbox-Zustand teils erst nach dem Touch-Event sichtbar umschaltet.
- Wichtig: Bei Band-Sync darf die allgemeine Satzlogik nur `input[data-set]` lesen. `.band-controls` hat ebenfalls `data-set` fuer die Satznummer, darf aber nicht als normales Zahlenfeld interpretiert werden.
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

Aktiver lokaler Arbeitsordner:

```text
C:\git_repository\TrainingsplanCrossIntense
```

Dieser Ordner muss auf `https://github.com/thsta34/TrainingsplanCrossIntense.git` zeigen. Der alte lokale `staehth`-Clone ist nur noch Archiv und soll nicht mehr fuer neue Arbeit verwendet werden.

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
