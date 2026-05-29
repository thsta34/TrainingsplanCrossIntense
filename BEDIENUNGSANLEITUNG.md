# Bedienungsanleitung: Trainingsplan CrossIntense

Stand: 28.05.2026  
App-Version: v78

## 1. Zweck der App

Die App ist ein digitaler Trainingsplan fuer CrossIntense. Sie hilft dabei,
Trainingsphasen, Kontrastphasen, Uebungen, Trainingswerte, Personal Bests und
Personal Records zu erfassen und auf mehreren Geraeten zu synchronisieren.

Die App laeuft im Browser und kann auf PC und Handy genutzt werden:

https://thsta34.github.io/TrainingsplanCrossIntense/

## 2. Grundprinzip

Die App arbeitet mit zwei Arten von Phasen:

- Training: 4 Wochen mit Trainings am Montag, Mittwoch und Freitag
- Kontrast: 2 Wochen mit Trainings am Montag, Mittwoch und Freitag

Eine Phase startet immer an einem Montag. Die App berechnet daraus automatisch
alle Trainingstage.

Die wichtigsten Bereiche sind:

- Training: aktuelles Training erfassen
- Statistik: Bestleistungen ansehen
- Settings: Login, Sync, Phasen und Uebungen verwalten

## 3. Login und Synchronisation

Die App soll nur nach dem Login benutzt werden. Dadurch wird verhindert, dass
Trainingsdaten nur lokal auf einem einzelnen Geraet gespeichert werden.

### Einloggen

1. Oeffne die App.
2. Wechsle zu `Settings`.
3. Gib E-Mail und Passwort ein.
4. Klicke auf `Einloggen`.

Nach erfolgreichem Login wechselt die App automatisch in den Bereich
`Training`.

### Synchronisation

Trainingsdaten werden lokal gespeichert und mit Supabase synchronisiert.

In den Settings gibt es den Button `Jetzt syncen`. Er ist nur sichtbar, wenn du
eingeloggt bist.

Typische Nutzung:

- Auf Geraet A Training erfassen.
- Auf Geraet B App oeffnen.
- Falls die Daten nicht sofort aktuell sind: in `Settings` auf `Jetzt syncen`
  klicken.

Wenn oben oder in den Settings ein Sync-Fehler erscheint, pruefe zuerst die
Internetverbindung und versuche `Jetzt syncen` erneut.

## 4. Bereich Training

Der Bereich `Training` ist der Hauptbereich der App.

Im Header siehst du:

- aktuelle Phase oder naechstes Training
- aktuelles Training, z.B. `Training A`, `Training B`, `Kontrast 1`
- Datum

An Wochentagen ohne Training zeigt der Header `Kein Training`. Die kleine Zeile
darueber zeigt dann, welches Training als naechstes oder letztes relevant ist.

### Phase auswaehlen

Unter dem Sync-Status gibt es ein Auswahlfeld `Phase`. Dort kannst du zwischen
angelegten Trainings- und Kontrastphasen wechseln.

### Zwischen Trainings wechseln

Mit den Pfeiltasten links und rechts kannst du zwischen den Trainings einer
Phase wechseln.

Die Anzeige zeigt:

- Position innerhalb der Phase
- Status des Trainings
- Durchfuehrung, z.B. `1 / 6`
- Fokus, z.B. `Aufbau`, `PR-Tag`, `Kontrast` oder `Pause`

### Kalender

Im Kalender wird standardmaessig nur die aktuelle Woche angezeigt.

Mit dem Plus-Button kannst du den gesamten Kalender der Phase aufklappen. Ein
Klick auf eine Kalenderkachel oeffnet das jeweilige Training.

Die Kalenderkacheln zeigen:

- Datum
- Training und Nummer
- Uebungen
- Status

Beim 5. Training eines Uebungspaars erscheint ein roter PR-Hinweis in der
Kalenderkachel.

## 5. Training erfassen

In einem normalen Training werden zwei Uebungen angezeigt.

Pro Uebung kannst du eintragen:

- Stangengewicht, falls die Uebung mit Stange ausgefuehrt wird
- Werte pro Satz
- bei Banduebungen die verwendeten Baender, Koerpergewicht und Zusatzgewicht

Die App berechnet automatisch die Gesamtwerte und Bestleistungen.

### Gewichtseingaben

Bei Gewichtseingaben gelten diese Regeln:

- keine negativen Werte
- maximal zwei Nachkommastellen
- leere Felder sind erlaubt

Negative Werte werden beim Speichern auf `0` gesetzt.

### Banduebungen

Bei Banduebungen gibt es pro Satz Auswahlmoeglichkeiten:

- Gruen
- Rot
- Schwarz
- Koerper
- Zusatzgewicht

`Koerper` bedeutet Koerpergewicht ohne Zusatzgewicht.

Wenn du Zusatzgewicht eintraegst, wird Koerpergewicht automatisch gesetzt. Wenn
du danach wieder ein Band auswaehlst, werden Koerpergewicht und Zusatzgewicht
fuer diese Satzzeile entfernt.

Die App bewertet Banduebungen nicht nur nach Zahlen, sondern auch nach der
Unterstuetzung:

- Gruen = meiste Unterstuetzung
- Rot = weniger Unterstuetzung als Gruen
- Schwarz = weniger Unterstuetzung als Rot
- Koerpergewicht ist staerker als Bandunterstuetzung
- Zusatzgewicht ist staerker als reines Koerpergewicht

## 6. Trainingsstatus

Unter den Kopf-Informationen gibt es die Buttons:

- `Training erledigt`
- `Training skippen`

### Training erledigt

Wenn du alle Werte eingetragen hast, klicke auf `Training erledigt`.

Das Training wird dann als erledigt gespeichert und fliesst in PR/PB und
Statistik ein.

### Training skippen

Wenn ein ganzes Training ausfaellt, klicke auf `Training skippen`.

Geskippte Trainings zaehlen nicht als durchgefuehrte Trainings. Die App
beruecksichtigt das bei der Zaehllogik fuer Trainings innerhalb eines
Uebungspaars.

Ein erneuter Klick hebt den Skip wieder auf.

### Einzelne Uebung skippen

Du kannst auch eine einzelne Uebung innerhalb eines Trainings skippen.

Das ist sinnvoll, wenn du das Training grundsaetzlich gemacht hast, aber eine
Uebung auslassen musstest.

Eine geskippt markierte Uebung:

- bleibt sichtbar
- wird grau/deaktiviert dargestellt
- kann spaeter wieder aktiviert werden
- zaehlt nicht fuer PR, PB oder Statistik
- wird in der Kalenderkachel durchgestrichen

## 7. Personal Records und Bestleistungen

Die App unterscheidet Trainingsbestleistungen und Kontrastbestleistungen.

### Training

Bei Trainingsuebungen ist der 3. Satz der wichtigste Satz. Die Statistik zeigt
deshalb fuer Trainingsuebungen den besten 3. Satz.

Training 5 und 6 eines Uebungspaars gelten als PR-Tage. In der Kalenderkachel
wird der rote PR-Hinweis nur beim 5. Training angezeigt.

Wenn wegen Skippen weniger Trainings stattfinden, verwendet die App trotzdem
den besten erfassten Wert als PR/PB.

### Kontrast

Bei Kontrastuebungen kann der beste Satz dynamisch Satz 3 oder Satz 4 sein.
Die App markiert den besten Satz nach dem Verlassen des Eingabefeldes neu.

Wenn eine Kontrastuebung schon frueher gemacht wurde, zeigt die App beim
Ausfuellen die bisherige Bestleistung unterhalb der Uebung an.

## 8. Bereich Statistik

Im Bereich `Statistik` kannst du zwischen zwei Ansichten umschalten:

- Training
- Kontrast

### Statistik Training

Die Trainingsstatistik zeigt pro Trainingsuebung die beste Leistung.

Angezeigt werden:

- Uebung
- schwerster bzw. relevanter Satz
- Datum der Bestleistung
- Wert

Geskippte Uebungen werden nicht beruecksichtigt.

### Statistik Kontrast

Die Kontraststatistik zeigt pro Kontrastuebung die beste erfasste Leistung.

Dabei kann die beste Leistung je nach Uebung und Eingabe aus verschiedenen
Saetzen stammen.

## 9. Bereich Settings

In `Settings` werden Login, Sync, Phasen und Uebungen verwaltet.

### Sync

Oben siehst du den aktuellen Sync-Status.

Mit `Jetzt syncen` kannst du Daten manuell von Supabase laden bzw. den Stand
abgleichen.

### Phasen anlegen

Unter `Phasen` kannst du neue Trainings- oder Kontrastphasen anlegen.

1. Startdatum auswaehlen.
2. Typ auswaehlen: `Training` oder `Kontrast`.
3. Auf `Phase hinzufuegen` klicken.

Die App erstellt automatisch alle Trainingstage der Phase.

### Phasen bearbeiten

Jede Phase hat einen Plus-/Minus-Button.

Mit Plus kannst du die Details einer Phase aufklappen. Dort kannst du:

- das Startdatum anpassen
- bei Trainingsphasen die Uebungspaare fuer Training A und B waehlen
- bei Kontrastphasen die Uebungen fuer Kontrast 1 und Kontrast 2 eintragen

### Phasen loeschen

Mit `Loeschen` kann eine Phase entfernt werden.

Beim Loeschen einer Kontrastphase bleiben globale Kontrastuebungen erhalten.

## 10. Uebungsverwaltung

In den Settings gibt es den Bereich `Uebungsverwaltung`.

Mit dem Plus-Button kannst du ihn aufklappen.

Es gibt zwei Bereiche:

- Training
- Kontrast

### Trainingsuebungen

Bei Trainingsuebungen kannst du das Hilfsmittel bzw. den Typ verwalten, z.B.:

- Stange
- Hantel
- Baender
- Maschine
- Koerpergewicht
- Kabelzug

Wichtig: Alte Trainingseintraege behalten moeglichst ihre damalige Struktur.
So werden fruehere Werte nicht falsch interpretiert, wenn eine Uebung spaeter
auf ein anderes Hilfsmittel umgestellt wird.

### Kontrastuebungen

Kontrastuebungen werden global verwaltet.

Du kannst:

- bestehende Kontrastuebungen auswaehlen
- neue Kontrastuebungen direkt in einer Kontrastphase erfassen
- Kontrastuebungen umbenennen
- Typ und Stangengewicht anpassen
- Kontrastuebungen aus der globalen Liste loeschen

Neue Kontrastuebungen werden automatisch in die globale Liste uebernommen.

## 11. App zuruecksetzen

In den Settings gibt es unten den Button:

`App zuruecksetzen - ALLE Daten werden geloescht`

Dieser Reset loescht:

- erfasste Trainingsdaten
- Phasen
- Werte
- PRs/PBs

Der Reset behaelt:

- Uebungsverwaltung
- globale Kontrastuebungen

Wenn du eingeloggt bist, wird der Reset auch nach Supabase synchronisiert.
Dadurch kommen alte Phasen nach einem manuellen Sync nicht wieder zurueck.

Nutze diesen Button nur, wenn du wirklich neu starten willst.

## 12. Nutzung auf dem Handy

Die App kann auf dem Handy im Browser genutzt werden. Je nach Browser kann sie
auch als App zum Startbildschirm hinzugefuegt werden.

Bei Problemen nach einem Update:

1. Seite neu laden.
2. Falls noetig `Ctrl + F5` am PC verwenden.
3. Auf dem Handy Website-Daten fuer die Seite loeschen.
4. Danach neu einloggen und synchronisieren.

In den Settings unten steht die aktuelle Version. Wenn PC und Handy
unterschiedliche Versionen anzeigen, nutzt eines der Geraete noch alte
Browser- oder Service-Worker-Daten.

## 13. Typische Fragen

### Warum sehe ich kein Training?

Moegliche Gruende:

- Du bist nicht eingeloggt.
- Es ist noch keine Phase angelegt.
- Heute ist ein trainingsfreier Wochentag.
- Du bist in einer anderen Phase.

### Warum sind Daten auf einem zweiten Geraet nicht aktuell?

Wechsle auf dem zweiten Geraet zu `Settings` und klicke auf `Jetzt syncen`.

### Warum erscheint eine Uebung nicht in der Statistik?

Moegliche Gruende:

- Das Training ist nicht als erledigt markiert.
- Die Uebung wurde geskippt.
- Es wurden keine gueltigen Werte eingetragen.

### Warum steht unten eine andere Version?

Dann laeuft auf einem Geraet wahrscheinlich noch ein alter Browser- oder
Service-Worker-Cache. Lade die Seite neu oder loesche die Website-Daten.

## 14. Administrator-Hinweis

Die Registrierung kann in den Settings ein- und ausgeschaltet werden. Diese
Option ist nur fuer den Admin-User sichtbar:

`thstaehli@gmail.com`

Normale eingeloggte Nutzer sehen diese Option nicht.
