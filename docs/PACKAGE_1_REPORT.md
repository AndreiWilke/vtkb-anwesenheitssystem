# Paket 1 – UX-Prototyp und Korrekturstand

## Umfang

Der lokale React-Prototyp bildet den vollständigen Anwesenheitsablauf mit fiktiven Daten ab:

- Start und Auswahl einer Trainingseinheit,
- genau ein verantwortlicher Trainer und mehrere Assistenztrainer,
- manuelle Erfassung sowie Fotoassistenz-Demo ohne Kamera oder Bildverarbeitung,
- Trainerprüfung vor dem Speichern,
- dauerhafte Probetrainingprofile mit Teilnahmegrenze,
- Mitglieder-, Trainer-, Gürtel- und Vergütungsauswertungen,
- vollständige nachträgliche Erstellung vergangener Einheiten,
- vier Dojo-Stammdatensätze und elf stabile Wochenzeiten in `Europe/Berlin`,
- Laufzeit-Historie und Audit.

## Fotoassistenz

Unbekannte Vorschläge können einem bestehenden Mitglied zugeordnet, als unbekannt markiert,
verworfen oder später manuell geprüft werden. Die Demo erzeugt keine neuen Personenprofile und
keine biometrischen Daten. Jede Entscheidung bleibt bis zum Abschluss änderbar.

## Personenmodell

Probetrainingsteilnehmer besitzen dauerhafte `TrialParticipant`-Profile. Dieselbe Personen-ID
bleibt bei einer Umwandlung zum Mitglied erhalten; die Mitgliedsnummer wird separat ergänzt.
Anwesenheits-, Probetraining- und Gürtelhistorie bleiben dadurch derselben Person zugeordnet.

## Nachtragseinheiten

Jede der vier definierten angemeldeten Rollen kann eine vergangene Einheit mit Datum, Zeit, Bezeichnung, Trainingsart, Dojo,
Trainingsleitung, Anwesenheit, Pflichtgrund und optionaler Notiz vollständig erstellen. Rollen,
Zeitspanne, Vergangenheit, Dubletten und Probetraininggrenze werden geprüft. Der Abschluss fließt
in Historie, Auswertung, Vergütung, Exporte und Audit ein.

## Aktueller Korrekturstand

Probetrainingbesuche stammen ausschließlich aus `HistoricalTrainingSession[]`; eine separate
Zweithistorie existiert nicht. Anwesenheiten speichern Mitgliedschaftsstatus und Erfassungsquelle
als Snapshot. Der React-Zustand ist die einzige veränderliche Historienquelle des laufenden Tabs.
Fotozuordnungen bleiben `PHOTO_ASSISTED`, manuelle Korrekturen `MANUAL`.

## Datenschutz und Demo-Grenzen

- ausschließlich fiktive Namen und lokale Mockdaten,
- kein Kamerazugriff,
- keine Gesichtserkennung,
- keine Referenzbilder oder biometrischen Enrollment-Daten,
- keine Cloud-, AWS- oder Deployment-Aktion.

## Qualität

Aktueller lokaler Nachweis vom 24.06.2026 auf `fix/package-1-7-design-and-quality`:

| Befehl                  | Ergebnis                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm ci`                | erfolgreich, 545 Pakete installiert, 0 Schwachstellen                                  |
| `npm run format:check`  | erfolgreich                                                                            |
| `npm run lint`          | erfolgreich                                                                            |
| `npm run typecheck`     | erfolgreich                                                                            |
| `npm test`              | 17 Testdateien, 347 Tests bestanden                                                    |
| UTC: `npm test`         | 17 Testdateien, 347 Tests bestanden                                                    |
| `npm run check`         | erfolgreich                                                                            |
| `npm run test:coverage` | erfolgreich; V8-Coverage erzeugt                                                       |
| `npm run build`         | erfolgreich; Produktionsbuild ohne Source Maps                                         |
| `npm audit`             | 0 bekannte Schwachstellen                                                              |
| `npm query .workspace`  | vier Workspaces erkannt                                                                |
| `npm run qa:browser`    | erfolgreich; fünf Viewports und fünf Fachabläufe, keine Konsolenfehler oder 404-Assets |

Die Browser-QA verwendet Playwright Chromium und legt ihre temporären Ergebnisse unter
`%TEMP%\vtkb-package-1-7-browser-qa` ab. Nach dem Lauf verbleibt kein Listener auf Port 4173.
Historische Screenshots sind keine fachliche Quelle; maßgeblich sind der aktuelle Code, die
automatisierten Tests und die Browser-QA.
