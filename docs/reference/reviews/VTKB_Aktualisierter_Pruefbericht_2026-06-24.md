# Aktualisierter Prüfbericht – VTKB-Anwesenheitssystem

**Prüfdatum:** 24.06.2026
**Neu geprüfter Stand:** `/mnt/data/vtkb_current_review` als Abbild des erneut übergebenen lokalen Ordners `D:\Anwesenheit`
**Repository laut Übergabe:** `AndreiWilke/vtkb-anwesenheitssystem`
**Vorgesehener Arbeitsbranch laut Übergabe:** `fix/package-1-7-design-and-quality`

## 1. Prüfgrenzen

Der übergebene Ordner enthält **keinen `.git`-Ordner**. Deshalb konnten Branch, Commitstand, Git-Status, tatsächlich verfolgte Dateien und der Draft-PR nicht direkt verifiziert werden. Die Quell- und Projektdateien wurden vollständig geprüft. Es wurden keine Git-Skripte ausgeführt und keine Projektdateien verändert.

## 2. Formale Qualitätsprüfung des neu übergebenen Standes

| Prüfung | Ergebnis |
|---|---:|
| Prettier | bestanden |
| ESLint | bestanden |
| TypeScript | bestanden |
| Tests, normale Umgebung | 308 von 308 bestanden |
| Tests mit `TZ=UTC` | 308 von 308 bestanden |
| Produktionsbuild | bestanden |
| npm audit | 0 Schwachstellen |
| npm-Workspaces | 4 korrekt erkannt |
| Browser-QA | fehlgeschlagen: festes Microsoft-Edge-Binary fehlt |

Der Browser-QA-Fehler ist nicht nur eine Einschränkung der Prüfungsumgebung. Das Skript startet den Preview-Server **vor** dem Browser und erreicht beim fehlgeschlagenen Browserstart den vorhandenen `finally`-Block nicht. Im Prüflauf blieb dadurch ein Vite-Prozess zurück und musste manuell beendet werden.

## 3. Bestätigte zwischenzeitliche Änderungen

Folgende Angaben aus der Übergabe stimmen mit dem neu geprüften Quellcode überein:

1. Die allgemeine Gastfunktion wurde aus dem produktiven Bedienablauf entfernt.
2. Probetrainingsteilnehmer werden als dauerhafte Profile modelliert.
3. Der Gürtelkatalog enthält 13 Farben und 23 Stufen einschließlich der drei zweifarbigen Zwischenstufen und 1. bis 9. Dan.
4. Zweifarbige Gürtel werden visuell dargestellt.
5. Das VTKB-Logo ist lokal eingebunden.
6. Externe Google Fonts sind entfernt.
7. Deutsche Datumsfelder verwenden `TT.MM.JJJJ`.
8. Ungültige Kalenderdaten wie `31.02.2026` werden abgelehnt.
9. Interne Datumswerte bleiben im ISO-Format.
10. Eine vollständige Nachtragserfassung mit Datum, Zeiten, Trainingsart, Dojo, Trainerrollen, Anwesenheit, Grund und Audit wurde ergänzt.
11. Vorstand, Trainer, Assistenztrainer und Kassenwart können die Nachtragserfassung öffnen.
12. Die tatsächlich aktive Demo-Rolle wird im Nachtragsaudit gespeichert.
13. Assistenztrainer besitzen Gürteländerungsrechte.
14. Der Kassenwart besitzt keine Mitglieder-, Probetraining- oder Gürtelverwaltungsrechte.
15. `PROJECT_RULES.md` nennt den lokalen Ordner `D:\Anwesenheit`.
16. Der offizielle Testbefehl verwendet einen seriellen Vitest-Lauf mit `--maxWorkers=1`.
17. Der Verwaltungsbereich und die untere Navigation wurden ergänzt.

## 4. Abweichungen und nur teilweise umgesetzte Punkte

### 4.1 Nachtragserfassung

Die Nachtragserfassung ist funktional vorhanden, aber die Domänenfunktion akzeptiert weiterhin doppelte IDs in `participantIds`. Dadurch kann dieselbe Person mehrere Anwesenheitsdatensätze für dieselbe Einheit erhalten. Die zentrale Sitzungsvalidierung wird nach der Erzeugung nicht aufgerufen.

**Status:** teilweise umgesetzt, Blocker B-07 bleibt offen.

### 4.2 Rollenprüfung der Nachtragserfassung

Die vier vorgesehenen Rollen dürfen die Nachtragserfassung verwenden. `hasPermission` erlaubt dafür jedoch zusätzlich **jede beliebige nichtleere Zeichenfolge** als Rolle.

**Status:** vorgesehene Rollen funktionieren; Rollenvalidierung bleibt fehlerhaft.

### 4.3 Verwaltungsnavigation

Der Verwaltungsbereich ist erreichbar. Die folgenden vorhandenen Funktionen haben aber weiterhin keine erreichbare Aktionsschaltfläche:

- Probetraining in Mitglied umwandeln,
- Vorstandsausnahme erteilen,
- Gürtel-Bildsimulation starten.

**Status:** Verwaltungs-Hub ergänzt; Blocker B-04 bleibt offen.

### 4.4 Build- und Repository-Hygiene

Der neu übergebene Ordner enthält weiterhin:

- `node_modules`,
- `apps/web/dist`,
- drei `*.tsbuildinfo`-Dateien,
- sieben Screenshots unter `docs/screenshots/package1`,
- 17 veraltete PowerShell-Git-Skripte.

Da `.git` fehlt, kann nicht festgestellt werden, welche davon tatsächlich verfolgt werden. Das Übergabearchiv ist jedenfalls noch nicht bereinigt.

## 5. Status der sieben ursprünglichen Blocker

| ID | Befund | Aktueller Status |
|---|---|---|
| B-01 | Probetraining-Historie nicht angeschlossen | **offen** – `trialAttendanceHistory` bleibt ungenutzt; historische Sitzungen enthalten keine Trial-IDs |
| B-02 | widersprüchliche Sperrlogik | **offen** – Listenfilter, Reporting und zentrale Eligibility verwenden weiter unterschiedliche Bedingungen |
| B-03 | Vorstandsausnahme zu früh erteilbar/verbrauchbar | **offen** – kein Vier-Einheiten-Nachweis bei Erteilung; Verbrauch weiterhin bei jeder Anwesenheit |
| B-04 | vorhandene Funktionen im UI nicht erreichbar | **offen** – Konvertierung, Ausnahme und Gürtelsimulation bleiben ohne Navigation |
| B-05 | Fotoanwesenheit als manuell gespeichert | **offen** – `persistCurrentSession` schreibt für alle `CaptureSource.MANUAL` |
| B-06 | Trainingsart stets Grundlagentraining | **offen** – `trainingType` wird fest auf `GRUNDLAGENTRAINING` gesetzt |
| B-07 | doppelte Anwesenheiten bei Nachtrag möglich | **offen** – `participantIds` werden nicht dedupliziert oder abgelehnt |

**Ergebnis:** Keiner der sieben Blocker wurde im neu übergebenen Stand vollständig behoben.

## 6. Status der hohen Fehler

| ID | Kurzbefund | Status |
|---|---|---|
| H-01 | Direktanlage verliert Telefonnummer und im App-Member das Geburtsdatum | offen |
| H-02 | Trial-Dublettenprüfung berücksichtigt bestehende Mitglieder nicht | offen |
| H-03 | umgewandeltes Demo-Profil verweist auf nicht vorhandenes `member-41` | offen |
| H-04 | Trial-Zählung behandelt historische Besuche nach Konvertierung pauschal als `TRIAL` | offen |
| H-05 | Kennzahl „in diesem Jahr umgewandelt“ besitzt keine Jahreslogik | offen |
| H-06 | CSV-Formelinjektionen werden nicht neutralisiert | offen |
| H-07 | Settlement-Snapshot kann Korrekturen enthalten, die nicht im Snapshot-Gesamtbetrag stecken | offen |
| H-08 | `createBeltHistoryEntry` erzwingt Katalog- und Kalendervalidierung nicht | offen |
| H-09 | Bildvorschlag kann als bestätigt gelten, ohne Historieneintrag | offen |
| H-10 | React-State und global mutierbares `historicalSessions`-Array konkurrieren | offen |

## 7. Weitere weiterhin offene Qualitätsbefunde

1. Vorgeschlagene Assistenztrainer werden beim Start nicht in die initiale Anwesenheit übernommen.
2. Die Sitzungsvorauswahl hängt von der Array-Reihenfolge ab.
3. Der Dojo-Kontext wird bei der automatischen Auswahl nicht berücksichtigt.
4. Eine bereits vorhandene Session-ID wird beim Speichern ohne sichtbare Fehlermeldung verworfen.
5. Der vorhandene Login-Screen wird beim Start umgangen; Initialscreen ist `START`.
6. Coverage ist konfiguriert, aber der erforderliche Provider fehlt.
7. Die GitHub-Pages-Workflowdatei führt weder Prettier noch ESLint noch die 308 Tests aus und reagiert noch auf einen alten Feature-Branch.
8. Der Produktionsbuild enthält vollständige Source Maps einschließlich `sourcesContent` und Anwendungsquelltext.
9. Die angegebene npm-Version wird in CI nicht reproduzierbar erzwungen.
10. Der Vite-Basispfad hängt pauschal von `CI=true` ab.
11. README und Paketberichte beschreiben einen älteren Paketstand.
12. `belt.ts` bezeichnet den Katalog gleichzeitig als fiktiv/unbestätigt und als verbindlich.
13. Veraltete Git-Skripte enthalten unter anderem `git reset --hard`, Wechsel auf `main`, Merge und Push auf `main`.

## 8. Dojo- und Wochenplanerweiterung

Die vier verbindlichen Dojos und die elf Trainingszeitblöcke sind im neu übergebenen Stand **noch nicht umgesetzt**. Die Namen `Seikatsu`, `Ebereschen`, `Senshi` und `Musashi` kommen in den Quell- oder Konfigurationsdateien nicht vor. Weiterhin verwendet werden generische Demo-Bezeichnungen wie `Dojo Nord`, `Dojo Süd` und `Dojo VTKB Berlin`.

Verbindlich umzusetzen bleiben:

| Wochentag | Dojo | Zeit |
|---|---|---|
| Montag | Ebereschen Dojo | 16:00–17:00 |
| Montag | Seikatsu Dojo | 17:00–18:00 |
| Montag | Seikatsu Dojo | 18:00–19:30 |
| Mittwoch | Ebereschen Dojo | 16:00–17:00 |
| Mittwoch | Senshi Dojo | 16:00–18:00 |
| Donnerstag | Musashi Dojo | 17:00–18:00 |
| Donnerstag | Musashi Dojo | 18:00–19:00 |
| Donnerstag | Musashi Dojo | 19:00–20:00 |
| Freitag | Seikatsu Dojo | 17:30–18:15 |
| Freitag | Seikatsu Dojo | 18:15–19:00 |
| Freitag | Seikatsu Dojo | 19:00–20:00 |

Trainer, Assistenztrainer, Zielgruppen und Gürtelstufen dürfen dabei noch keine festen Teilnahmebeschränkungen bilden.

## 9. Gefährliche Git-Skripte

Die geforderte Bereinigung wurde noch nicht durchgeführt. Im Ordner `scripts` liegen weiterhin 17 PowerShell-Dateien. Mehrere davon wechseln auf `main`, führen harte Resets aus, mergen automatisch oder pushen direkt auf `main`.

**Zu entfernen:** sämtliche `*.ps1` im Ordner `scripts`.
**Einzig zu erhalten:** `scripts/package1-browser-qa.mjs`.

Bis zur Entfernung dürfen die PowerShell-Dateien nicht ausgeführt werden.

## 10. Browser-QA

Der aktuelle Lauf endet mit:

```text
browserType.launch: Chromium distribution 'msedge' is not found
```

Zusätzlicher technischer Fehler:

- Preview-Server wird vor dem Browser gestartet.
- `browser` wird erst nach erfolgreichem Launch definiert.
- Der `try/finally`-Block beginnt erst danach.
- Scheitert der Browserlaunch, wird der Preview-Prozess nicht beendet.

Erforderliche Korrektur:

1. Browser und Preview-Prozess nullable initialisieren.
2. Den gesamten Startablauf in einen äußeren `try/finally` legen.
3. Im `finally` Browser und Preview-Prozess unabhängig vom Fehlerzustand sicher schließen.
4. Bevorzugt Playwright-Chromium verwenden oder Edge nur optional mit dokumentiertem Fallback starten.
5. QA-Artefakte ausschließlich in einem temporären Betriebssystemordner speichern.

## 11. Git- und PR-Status

Aufgrund des fehlenden `.git`-Ordners konnten folgende Angaben nicht unabhängig bestätigt werden:

- aktiver Branch `fix/package-1-7-design-and-quality`,
- lokaler Commitstand,
- ungecommitete Änderungen,
- verfolgte Build-/Cache-Dateien,
- Verbindung zu Draft-PR #5.

Vor einem späteren Commit sind lokal mindestens auszuführen:

```powershell
git branch --show-current
git status --short
git ls-files | Select-String "node_modules|dist|tsbuildinfo|\.zip$|docs/screenshots"
```

Es darf nicht auf `main` gewechselt und nicht gemergt werden.

## 12. Aktualisiertes Gesamturteil

Der neu übergebene Stand bestätigt die angekündigte technische Verbesserung auf **308 erfolgreich getestete Fälle**. Die Korrekturen an Datum, Gürtelkatalog, Rollen und Nachtragserfassung sind real vorhanden. Sie beheben jedoch nicht die fachlichen Kernprobleme aus der unabhängigen Prüfung.

**Freigabestatus:** weiterhin nicht freigabefähig.
**Nächster sinnvoller Schritt:** Umsetzung der sieben Blocker, der hohen Datenintegritätsfehler, der Dojo-/Wochenplanfunktion und des Repository-Cleanups auf dem bestehenden Arbeitsbranch; anschließend vollständige Regression einschließlich portablem Browser-QA.
