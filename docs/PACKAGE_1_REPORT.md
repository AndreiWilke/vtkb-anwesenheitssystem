# Paket 1 · Lokaler UX-Prototyp

- Datum: 2026-06-21
- Status: lokal implementiert, korrigiert und geprüft
- Branch: `feature/package-1-ux-prototype`
- Cloudaktionen: keine
- Deployment: keines

## Umgesetzter Umfang

- React-/TypeScript-/Vite-PWA im Workspace `@vtkb/web`.
- Smartphone-first-Oberfläche in Weiß, Anthrazit und VTKB-Rot mit Tastaturfokus, großen Touch-Zielen und responsivem Desktop-Rahmen.
- 40 eindeutig fiktive Mitglieder mit Altersgruppe, Gürtelgrad/-farbe und dauerhafter Qualifikation.
- Mehrere Trainingseinheiten mit zeitbasierter Empfehlung und freier Auswahl.
- Genau ein verantwortlicher Trainer, optional mehrere Assistenztrainer; Trainingsfunktion setzt Anwesenheit und erzeugt keine Doppelzählung.
- Vollständige manuelle Schnellerfassung mit Suche, Filtern, Einzelumschaltung, Rollenänderung und manuellen Gästen/Probetraining.
- Rein lokale Fotoassistenz-Demo mit drei abstrakten Aufnahmebereichen, simulierten Vorschlägen, eindeutigen/unsicheren/unbekannten/Dubletten-Fällen und verpflichtender Trainerentscheidung.
- Prüfbare Gesamtliste, fachlich gesperrter Abschluss bei offenen Vorschlägen und lokale Abschlussansicht.
- Interne Demo-Auswertung mit fiktiven aggregierten Statistiken.
- Installierbare PWA-Grundlage mit Manifest und generiertem Service Worker.

## Korrekturen nach dem Paket-1-Review

### Vereinszeit

- Die fachliche Zeitzone ist `Europe/Berlin` und wird sowohl bei der Erzeugung als auch bei der Darstellung lokaler Trainingseinheiten ausdrücklich verwendet.
- Die Implementierung ermittelt den Berlin-Offset einschließlich Sommerzeit mit der eingebauten `Intl`-API; es gibt weder einen fest codierten UTC-Offset noch eine Abhängigkeit von lokalem `setHours()`.
- Einheiten verwenden das halb offene Intervall `Start <= Zeitpunkt < Ende`. Deshalb ist die Einheit 17:30–19:00 Uhr exakt um 19:00 Uhr beendet und die direkt folgende Einheit läuft bereits.

### Nachvollziehbare Fotoentscheidungen

- Jeder Vorschlag besitzt neben `resolved` eine konkrete `resolutionAction` und optional `selectedMemberId` oder `guestId`.
- Sichere Vorschläge sind sichtbar vorausgewählt und die ausgewählte Person wird genau einmal in die Anwesenheit übernommen.
- Angezeigt werden die tatsächlichen Zustände: sicher vorausgewählt, Person bestätigt, andere Person gewählt, als unbekannt markiert, als Gast erfasst oder verworfen.
- Entscheidungen können vor dem Speichern geändert oder zurückgenommen werden; Anwesenheit und Demo-Gäste werden dabei synchron korrigiert.
- Unbekannte Gesichter besitzen keine allgemeine Schaltfläche „Bestätigen“. Zulässig sind nur Mitglied auswählen, als unbekannt markieren, als Gast erfassen oder verwerfen.
- „Andere Person“ öffnet eine sichtbare lokale Auswahl mit Suche, Avatar, Name, Gürtelgrad, Bestätigung und Abbruch.

### Gast-IDs und Navigation

- Lokale Gast-IDs stammen aus einem monotonen, instanzgebundenen Zähler (`guest-001`, `guest-002`, …). Entfernen und erneutes Hinzufügen kann dadurch keine ID wiederverwenden.
- Der Workflow hält Trainingsstart, Erfassungsart, tatsächliche Erfassungsaktivität und Listenprüfung getrennt fest.
- Die Navigation „Prüfung“ ist bis zur Listenprüfung deaktiviert. Direkte Navigation kann Trainingsleitung und Erfassungsart nicht umgehen.
- Ein verantwortlicher Trainer allein gilt nicht als aktiv erfasste Anwesenheitsliste; ohne tatsächliche manuelle Aktion oder Foto-Demo bleibt Speichern gesperrt.

## Bewusst nicht umgesetzt

- kein Backend, keine Datenbank und keine dauerhafte Speicherung,
- kein produktiver Login und keine Autorisierung,
- keine Kamera, keine Bildaufnahme, kein Upload und keine Gesichtserkennung,
- keine biometrische Enrollment-ID für Gäste,
- keine AWS-, Terraform-, Rekognition- oder Deployment-Aktion,
- keine produktive Einwilligungsverwaltung und keine Verarbeitung echter Personen.

## Lokaler Start

Empfohlen wird Node.js 22.12 oder neuer innerhalb der Engine-Vorgabe `^20.19.0 || ^22.12.0 || >=24.0.0`.

```powershell
npm ci
npm run dev
```

Build und lokale Vorschau:

```powershell
npm run build
npm run preview
npm run qa:browser
```

Für `npm run qa:browser` muss die Vorschau in einem zweiten Terminal unter `http://127.0.0.1:4173` laufen.

## Ausgeführte Abschlussprüfung

Ausführungsumgebung: Node.js `v24.14.0`, npm `11.4.2`.

| Befehl                 | Ergebnis                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm ci`               | erfolgreich, 590 Pakete installiert, 0 Schwachstellen                  |
| `npm run format:check` | erfolgreich                                                            |
| `npm run lint`         | erfolgreich                                                            |
| `npm run typecheck`    | erfolgreich                                                            |
| `npm test`             | erfolgreich, 4 Testdateien und 43 Tests                                |
| UTC: `npm test`        | erfolgreich, 4 Testdateien und 43 Tests bei gesetztem `TZ=UTC`         |
| `npm run check`        | erfolgreich; Format, Lint, Typecheck und 43 Tests erneut bestanden     |
| `npm run build`        | erfolgreich, Vite-Produktionserzeugnis und PWA-Service-Worker erstellt |
| `npm audit`            | erfolgreich, 0 Schwachstellen                                          |
| `npm query .workspace` | erfolgreich, alle vier erwarteten Workspaces erkannt                   |
| `npm run qa:browser`   | erfolgreich, fünf Viewports, zwei Hauptabläufe, keine Konsolenfehler   |

Der erste `npm ci`-Versuch scheiterte an einem Windows-Dateilock des zuvor gestarteten lokalen Vite-Prozesses. Nach dem gezielten Beenden dieses Prozesses wurde `npm ci` erfolgreich wiederholt; es war keine Quellcodekorrektur dafür erforderlich.

## Automatisierte Tests

Die Paket-1-Tests decken insbesondere ab:

- Vorschlag einer passenden Trainingseinheit,
- laufende und bevorstehende Einheiten in `Europe/Berlin`, den exakten Wechsel um 19:00 Uhr sowie Ausführung mit `TZ=UTC`,
- verantwortliche Trainingsleitung als Abschlussvoraussetzung,
- keine Doppelzählung von Assistenztrainern,
- vollständige manuelle Erfassung und lokales Speichern,
- manuelle Gäste ohne biometrische Felder,
- Sperre bei ungeklärten Foto-Demovorschlägen,
- sichere Vorauswahl samt genau einem Anwesenheitseintrag und Rücknahme,
- alle zulässigen Entscheidungen für unbekannte Gesichter sowie das fehlende allgemeine „Bestätigen“,
- sichtbare Mitgliederauswahl bei „Andere Person“,
- monotone Gast-IDs nach Hinzufügen, Entfernen und erneutem Hinzufügen,
- gesperrte Prüfungsnavigation und Abschluss ohne tatsächliche Erfassungsaktivität,
- mobile Hauptnavigation,
- exakt 40 fiktive Mockmitglieder.

Zusammen mit Paket 0 bestehen 43 Tests in vier Testdateien. Derselbe vollständige Testbestand besteht auch bei gesetzter Prozesszeitzone `UTC`.

## Browser- und Responsive-Prüfung

Der bevorzugte eingebettete Browser wurde initial erfolgreich verbunden, brach nach einer Benutzerunterbrechung jedoch wegen fehlender Sitzungs-/Sandbox-Metadaten ab. Die reproduzierbare Abschlussprüfung wurde deshalb mit dem vorhandenen Playwright 1.60.0 und lokalem Microsoft Edge ausgeführt.

Geprüfte Viewports:

| Viewport | Größe      | Horizontaler Überlauf |
| -------- | ---------- | --------------------- |
| Mobile   | 375 × 812  | keiner                |
| Mobile   | 390 × 844  | keiner                |
| Mobile   | 430 × 932  | keiner                |
| Tablet   | 768 × 1024 | keiner                |
| Desktop  | 1280 × 900 | keiner                |

Der Ablauf Start → Trainingsleitung → manuell bzw. Foto-Demo → Zusammenfassung → lokaler Abschluss wurde geprüft. Die Browser-QA trifft pro Vorschlagstyp eine passende Entscheidung: sichere Vorauswahl beibehalten, unsichere Person ausdrücklich bestätigen, unbekanntes Gesicht als Gast erfassen und Dublette ausdrücklich bestätigen. Sie weist anschließend genau einen vorausgewählten Mitgliedseintrag, genau einen Gast, keine offenen Vorschläge, keine Doppelzählung und die Übereinstimmung von Gesamtsumme und sichtbaren Einzelgruppen nach. Die Foto-Demo griff nicht auf eine Kamera zu und die Browserkonsole enthielt keine Fehler. Die maschinenlesbaren Ergebnisse stehen in [screenshots/package1/qa-results.json](screenshots/package1/qa-results.json).

Ausgewählte Ansichten:

![Startansicht auf 390 Pixeln](screenshots/package1/start-390.png)

![Manuelle Erfassung auf 390 Pixeln](screenshots/package1/manual-attendance-390.png)

![Prüfung der Foto-Demovorschläge](screenshots/package1/photo-review-390.png)

![Geprüfte Zusammenfassung](screenshots/package1/summary-390.png)

## Gestaltungsgrundlage

Der vor der Implementierung erzeugte visuelle Konzeptentwurf liegt unter [reference/diagrams/package1_ux_concept.png](reference/diagrams/package1_ux_concept.png). Die Implementierung übernimmt dessen klare mobile Informationshierarchie, die VTKB-Farbwelt, abstrakte neutrale Avatare und die hervorgehobenen Hauptaktionen, ohne echte Personen oder Fotografien zu verwenden.

## Grenzen des Prototyps

- Zustände leben nur im aktuellen Browser-Tab und gehen beim Neuladen verloren.
- Die zeitbasierte Empfehlung arbeitet ausschließlich mit lokalen Mockeinheiten.
- Die PWA ist installierbar, besitzt aber noch keine produktive Offline- oder Synchronisationslogik.
- Statistikwerte sind fiktiv und nicht aus gespeicherten Anwesenheiten berechnet.
- Datenschutz-, Rollen- und Validierungsregeln werden im Frontend demonstriert; produktive Durchsetzung benötigt spätere Backend-Pakete.

## Stoppgrenze

Paket 2 wurde nicht begonnen. Es wurden weder AWS-Ressourcen verändert noch Terraform- oder Deployment-Befehle ausgeführt.
