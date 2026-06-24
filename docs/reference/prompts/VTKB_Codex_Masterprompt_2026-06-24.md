# Codex-Masterprompt – VTKB-Anwesenheitssystem

Arbeite ausschließlich im lokalen Projektordner:

`D:\Anwesenheit`

Repository:

`AndreiWilke/vtkb-anwesenheitssystem`

Verbindlicher Arbeitsbranch:

`fix/package-1-7-design-and-quality`

## Absolute Git- und Scope-Regeln

1. Prüfe zu Beginn mit `git branch --show-current`, dass der aktive Branch exakt `fix/package-1-7-design-and-quality` ist.
2. Wechsle niemals auf `main`.
3. Führe keinen Merge, Rebase, Pull-Request-Merge oder Push auf `main` aus.
4. Führe keinen `git reset --hard`, kein `git clean -fd`, kein automatisches Konfliktüberschreiben und keine sonstige destruktive Git-Aktion aus.
5. Führe in diesem Auftrag noch keinen Commit und keinen Push aus. Implementiere, teste und berichte zunächst nur den vollständigen lokalen Stand.
6. Keine AWS-, Terraform-, Cloud-, Hosting- oder Deployment-Arbeiten durchführen.
7. `.github/workflows/deploy-pages.yml` und `infra/terraform` in diesem Auftrag nicht verändern.
8. Keine echten Mitgliedsdaten, Kinderbilder, Zugangsdaten oder biometrischen Daten einführen.

## Ausgangslage

Der aktuelle lokale Stand besitzt 308 bestandene Tests, besteht Prettier, ESLint, TypeScript, UTC-Tests, Build und npm audit. Diese grünen Prüfungen dürfen nicht durch oberflächliche Änderungen erkauft werden. Alle bisherigen 308 Tests müssen bestehen bleiben; für jede Korrektur sind gezielte Regressionstests zu ergänzen.

Verwende `PROJECT_RULES.md` als verbindliche Fachgrundlage. Bei einem Widerspruch zwischen älteren Paketberichten und diesem Auftrag gilt dieser Auftrag zusammen mit `PROJECT_RULES.md`.

## Phase 1 – Sicherer Repository-Cleanup

1. Entferne aus `scripts` sämtliche veralteten `*.ps1`-Git-Hilfsskripte.
2. Erhalte ausschließlich `scripts/package1-browser-qa.mjs`.
3. Stelle sicher, dass folgende Dateien nicht durch Git verfolgt werden:
   - `node_modules`
   - `dist`
   - `*.tsbuildinfo`
   - temporäre ZIP-Dateien
   - temporäre Browser-QA-Screenshots
4. Entferne erzeugte Build- und Cache-Dateien aus dem Arbeitsbaum, soweit sie keine bewusst versionierten Quellen sind.
5. Ändere keine fachlichen Quellen allein durch automatische Formatierung außerhalb der tatsächlich bearbeiteten Dateien.

## Phase 2 – Blocker vollständig beheben

### B-01 Eine kanonische Sitzungshistorie

- Entferne die ungenutzte Parallelstruktur `trialAttendanceHistory` oder überführe deren Demo-Einträge vollständig in die kanonische `HistoricalTrainingSession[]`-Historie.
- Die vorbereiteten Demo-Profile müssen tatsächlich 0, 1, 2, 3, 4 und 5 gezählte Besuche darstellen.
- Trial-Anwesenheiten müssen dieselbe Session- und Attendance-Struktur wie Mitglieder verwenden.
- Es darf nur eine Quelle der Wahrheit für die laufende Historie geben.

### B-02 Eine zentrale Sperrlogik

- Verwende `checkTrialEligibility` für Abschlussvalidierung, Listenfilter, Warnungen, Berichte und Kennzahlen.
- Entferne separat nachgebaute Sperrbedingungen.
- Ergänze Regressionstests für mindestens:
  - vier Besuche + `NOT_ISSUED`,
  - vier Besuche + `ISSUED`,
  - vier Besuche + `RECEIVED`,
  - ungenutzte Ausnahme,
  - verbrauchte Ausnahme,
  - aktives Mitglied.

### B-03 Vorstandsausnahme korrekt erteilen und verbrauchen

- Eine Vorstandsausnahme darf nur für ein aktives Trial-Profil erteilt werden, das bereits vier reguläre besuchte Probetrainings erreicht hat und noch keine Ausnahme erhalten hat.
- Übergib den aus der Historie berechneten Besuchsstand an die Domänenfunktion; vertraue keinem frei editierbaren Zähler.
- Verbrauche die Ausnahme nur für genau die konkrete fünfte Teilnahme, die ohne Ausnahme gesperrt wäre.
- Erzeuge beim Verbrauch einen eigenen Audit-Eintrag.
- Die Ausnahme darf nicht beim ersten bis vierten Besuch verbraucht werden.

### B-04 Fehlende Navigation ergänzen

Ergänze rollenabhängige, getestete Navigation für:

- Vorstandsausnahme im Trial-Profil nur für Vorstand und nur bei erfüllten Vorbedingungen,
- Umwandlung zum Mitglied im Trial-Profil nur für Vorstand und bei erfüllter Vertragsvorbedingung,
- Gürtel-Bildsimulation an einer fachlich passenden Stelle für berechtigte Rollen.

Keine bloßen Switch-Fälle ohne erreichbare UI hinterlassen.

### B-05 Erfassungsquelle je Person korrekt speichern

- Führe die Capture-Quelle pro Anwesenheitsauswahl.
- Manuell ausgewählte Personen erhalten `MANUAL`.
- Durch bestätigte Foto-Demovorschläge hinzugefügte Personen erhalten `PHOTO_ASSISTED`.
- Manuelle Korrekturen innerhalb eines fotoassistierten Ablaufs bleiben `MANUAL`, sofern sie nicht aus einem bestätigten Vorschlag stammen.
- Regressionstests müssen gemischte Quellen in derselben Session prüfen.

### B-06 Trainingsart korrekt übernehmen

- Ergänze `trainingType` in die planmäßige Sitzungsdefinition.
- Speichere beim Abschluss den tatsächlichen Typ der gewählten Sitzung.
- Entferne den fest codierten Wert `GRUNDLAGENTRAINING`.
- Ergänze Tests für mindestens Grundlagen- und Fortgeschritteneneinheit.

### B-07 Doppelte Anwesenheiten verhindern

- Lehne doppelte `participantIds` in der Nachtragserfassung mit einem eindeutigen Validierungsfehler ab oder dedupliziere sie vor der Erstellung. Bevorzugt: als Eingabefehler ablehnen.
- Prüfe Überschneidungen zwischen verantwortlichem Trainer, Assistenztrainern und Teilnehmern.
- Rufe vor Rückgabe einer erzeugten Session die allgemeine zentrale Sitzungsvalidierung auf.
- Pro Person und Session darf exakt ein AttendanceRecord entstehen.

## Phase 3 – Hohe Datenintegritätsfehler beheben

1. Direktanlage:
   - Telefonnummer nicht mehr erfassen, wenn sie im Modell nicht gespeichert werden soll, oder vollständig durch Typen, Ergebnis und Member-State transportieren.
   - Geburtsdatum in das erzeugte `Member`-Objekt übernehmen.
   - Dublettenprüfung gegen Trial-Profile und bestehende Mitglieder ergänzen.
   - Mitgliedsnummer an der Domänengrenze auf Eindeutigkeit prüfen.
2. Trial-Dublettenprüfung gegen bestehende Mitglieder erweitern.
3. Das umgewandelte Demo-Profil konsistent machen: Personen-ID gemäß Projektregel beibehalten; kein Verweis auf ein nicht vorhandenes `member-41`.
4. Trial-Zählung muss den Mitgliedschaftsstatus zum Zeitpunkt der Anwesenheit verwenden. Keine pauschale Annahme `TRIAL` für alle historischen Datensätze.
5. Ein echtes Konvertierungsdatum speichern und „in diesem Jahr umgewandelt“ anhand eines expliziten Bezugsjahres berechnen.
6. Alle CSV-Exporte gegen Formelinjektionen absichern. Felder, die nach führenden Leerzeichen mit `=`, `+`, `-` oder `@` beginnen, müssen als Text neutralisiert werden, ohne normale negative Zahlenwerte zu zerstören.
7. Settlement-Snapshots müssen einen Gesamtbetrag enthalten, der exakt den eingefrorenen Zeilen plus eingefrorenen Korrekturen entspricht. Inkonsistente Eingaben ablehnen.
8. `createBeltHistoryEntry` muss `validateBeltChange` zwingend durchsetzen und reale Kalenderdaten prüfen.
9. Ein Bildvorschlag darf nur dann `CONFIRMED` werden, wenn gleichzeitig ein gültiger Historieneintrag erzeugt und referenziert wurde. Andernfalls Status offen lassen oder Transaktion abbrechen.
10. Entferne die konkurrierende globale Mutation von `historicalSessions`. Nutze im App-Lauf genau einen React-State beziehungsweise einen ausdrücklich injizierten Store als Quelle der Wahrheit.

## Phase 4 – Dojo-Stammdaten und Wochenplan

Implementiere getrennte zentrale Stammdaten für genau diese vier aktiven Dojos:

- `dojo-seikatsu` – `Seikatsu Dojo`
- `dojo-ebereschen` – `Ebereschen Dojo`
- `dojo-senshi` – `Senshi Dojo`
- `dojo-musashi` – `Musashi Dojo`

Implementiere genau diese elf aktiven Wochenzeitblöcke in `Europe/Berlin`:

- Montag, Ebereschen Dojo, 16:00–17:00
- Montag, Seikatsu Dojo, 17:00–18:00
- Montag, Seikatsu Dojo, 18:00–19:30
- Mittwoch, Ebereschen Dojo, 16:00–17:00
- Mittwoch, Senshi Dojo, 16:00–18:00
- Donnerstag, Musashi Dojo, 17:00–18:00
- Donnerstag, Musashi Dojo, 18:00–19:00
- Donnerstag, Musashi Dojo, 19:00–20:00
- Freitag, Seikatsu Dojo, 17:30–18:15
- Freitag, Seikatsu Dojo, 18:15–19:00
- Freitag, Seikatsu Dojo, 19:00–20:00

Fachregeln:

1. Dojo-Stammdaten und Wochenzeitblöcke getrennt modellieren.
2. Keine Trainer, Assistenztrainer, Anfänger-, Fortgeschrittenen- oder Gürtelbeschränkungen im Wochenplan fest codieren.
3. Parallele Einheiten in unterschiedlichen Dojos sind zulässig.
4. Überschneidungen im selben Dojo und selben Wochentag sind unzulässig.
5. Jeder Zeitblock besitzt eine stabile ID.
6. Jede erzeugte konkrete Session speichert mindestens `scheduledSlotId`, `dojoId`, `dojoNameSnapshot`, `startsAt`, `endsAt` und `trainingType` beziehungsweise eine neutrale Sitzungsbezeichnung.
7. Spätere Stammdatenänderungen dürfen historische Dojo-Namen nicht verändern.
8. Die Startseite zeigt alle Einheiten des aktuellen Berliner Tages sortiert.
9. Bei parallelen Einheiten darf keine zufällige oder arrayabhängige Vorauswahl erfolgen. Zeige eine eindeutige Auswahl mit Dojo und Zeit.
10. Historie und Auswertungen müssen nach Dojo filterbar bleiben.

Ersetze die generischen Dojo-Demodaten `Dojo Nord`, `Dojo Süd` und `Dojo VTKB Berlin` dort, wo planmäßige aktuelle Sitzungen und der verbindliche Wochenplan betroffen sind. Historische Demo-Daten dürfen nur bewusst migriert werden; keine stillschweigende Verfälschung alter Sessions.

## Phase 5 – Weitere lokale Qualitätskorrekturen

1. Übernimm vorgeschlagene Assistenztrainer korrekt in die initiale Anwesenheit.
2. Sortiere Sitzungsvorschläge deterministisch nach Beginn und Dojo.
3. Gib bei einer doppelten Session-ID eine sichtbare Fehlermeldung statt stillen Abbruchs aus.
4. Begrenze Nachtragserfassung auf die tatsächlich definierten angemeldeten Rollen. Keine beliebige nichtleere Zeichenfolge akzeptieren.
5. Entscheide konsistent über den Login-Prototyp: Wenn er Teil des Ablaufs ist, starte auf `LOGIN`; andernfalls entferne toten Login-Code und dokumentiere den Demo-Start. Bevorzugt den vorhandenen Login-Screen tatsächlich verwenden.
6. Entferne öffentliche Source Maps aus dem normalen Produktionsbuild. Optional nur über einen expliziten lokalen Analysemodus aktivieren.
7. Ergänze den fehlenden Vitest-Coverage-Provider und einen lokalen, nicht deployenden Coverage-Befehl. Keine Workflow- oder Deploymentänderung in diesem Auftrag.
8. Mache `scripts/package1-browser-qa.mjs` portabel und ausfallsicher:
   - gesamter Startablauf in äußerem `try/finally`,
   - Preview-Prozess bei jedem Fehler beenden,
   - Browser bei jedem Fehler schließen,
   - standardmäßig Playwright-Chromium verwenden,
   - optionaler Edge-Kanal nur bei vorhandener Installation,
   - QA-Dateien nur im OS-Temp-Verzeichnis.
9. Aktualisiere README und Paketberichte auf den tatsächlich erreichten lokalen Stand.
10. Entferne den Widerspruch zwischen „fiktiv/unbestätigt“ und „verbindlich“ beim Gürtelkatalog. Der in `PROJECT_RULES.md` und diesem Auftrag genannte Katalog ist für diesen Prototyp verbindlich.

## Erforderliche Tests

Ergänze gezielte Unit-, Integration- und UI-Tests für jede oben behobene Fehlerklasse. Insbesondere:

- Trial-Demo zählt 0/1/2/3/4/5 korrekt,
- alle Eligibility-Zustände liefern in UI, Filter und Reporting dasselbe Ergebnis,
- Ausnahme erst nach vier Besuchen und nur einmal nutzbar,
- Ausnahmeverbrauch mit Audit,
- Navigation für Ausnahme, Konvertierung und Gürtelsimulation,
- gemischte Capture-Quellen,
- korrekte Trainingsarten,
- keine doppelten AttendanceRecords,
- Datenverlust der Direktanlage ausgeschlossen,
- Dubletten gegen Mitglieder und Trials,
- CSV-Injektionsfälle,
- konsistente Settlement-Snapshots,
- ungültige Gürtel/Farb-Grad-Paare und ungültige Kalenderdaten,
- Bildbestätigung immer mit Historieneintrag,
- genau vier Dojos und elf Slots,
- parallele Mittwochseinheiten,
- drei lückenlos aufeinanderfolgende Donnerstag- und Freitagsslots,
- Überschneidung im selben Dojo abgelehnt,
- historische Dojo-Snapshots unverändert,
- alle vier gültigen Rollen beim Nachtrag, beliebige Rollen abgelehnt,
- Browser-QA beendet Preview-Prozess auch bei absichtlich ausgelöstem Browserstartfehler.

## Abschlussprüfungen

Führe nach der Implementierung aus:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ="UTC"; npm test; Remove-Item Env:TZ
npm run build
npm audit
git ls-files | Select-String "node_modules|dist|tsbuildinfo|\.zip$|docs/screenshots"
npm run qa:browser
```

Erwartung:

- alle bisherigen 308 Tests plus neue Regressionstests bestehen,
- UTC-Lauf besteht,
- Build und Audit bestehen,
- Browser-QA besteht lokal ohne Prozessleak,
- die `git ls-files`-Prüfung liefert keine verbotenen Artefakte,
- keine PowerShell-Git-Skripte verbleiben,
- kein Commit, kein Push, kein Merge wurde ausgeführt.

## Abschlussbericht von Codex

Berichte am Ende ausschließlich:

1. aktive Branch-Bezeichnung,
2. geänderte und gelöschte Dateien,
3. je Blocker/Fehler die konkrete Lösung,
4. neue Tests und neue Gesamtzahl,
5. Ergebnisse aller Abschlussbefehle,
6. Ergebnis der Browser-QA einschließlich Speicherort temporärer Artefakte,
7. bewusst offene oder wegen Scope-Verbot nicht bearbeitete Punkte,
8. vollständiges `git status --short`.

Stoppe danach. Nenne noch keine Commit-, Push- oder Merge-Befehle.
