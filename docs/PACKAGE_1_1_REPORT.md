# Paket 1.1 · Anwesenheitsauswertung und automatische Aufwandsentschädigung

- Datum: 2026-06-21
- Status: lokal implementiert und geprüft
- Branch: `feature/package-1-1-compensation-reporting`
- Cloudaktionen: keine
- Deployment: keines

## Ziel und Umfang

Paket 1.1 erweitert den bestehenden Smartphone-first-Prototyp um nachvollziehbare Anwesenheitsauswertungen und eine lokale Monatsabrechnung für verantwortliche Trainer und Assistenztrainer. Alle Daten, Personen, Rollen, Vergütungssätze und Bearbeiter sind eindeutig fiktiv. Paket 1.2 und Paket 2 wurden nicht begonnen.

## Umgesetzte Ansichten

1. Auswertungsdashboard
2. Mitglieder- und Schülerübersicht
3. Mitgliedsdetail mit Monatsübersicht und chronologischen Einheiten
4. Trainer- und Assistenzübersicht
5. Trainerdetail
6. Monatsabrechnung
7. Einzelabrechnung
8. Vergütungssätze
9. Korrekturdialog
10. Auditprotokoll
11. Zahlungsliste
12. eigene Trainerübersicht

## Datenmodell und historische Einheiten

Der aktuelle Prototyp erzeugt deterministisch 66 abgeschlossene Einheiten von Januar bis Juni 2026. Grundlage sind die vier Dojo-Stammdatensätze und elf verbindlichen Wochenzeiten. Enthalten sind parallele Einheiten in verschiedenen Dojos, direkt aufeinanderfolgende Einheiten im selben Dojo sowie unterschiedliche Trainer- und Assistenzrollen.

Jede Einheit enthält ID, fachliches Datum, Start und Ende, `Europe/Berlin`, Bezeichnung, Trainingsart, Dojo, Status `COMPLETED`, genau einen verantwortlichen Trainer, null bis mehrere Assistenztrainer, Teilnehmer, Abschlusszeitpunkt und fiktive abschließende Person. Pro Person und Einheit wird genau ein Anwesenheitsdatensatz erzeugt.

Die gemeinsamen Fachtypen wurden um Statuswerte für geplante, laufende und stornierte Einheiten sowie um Vergütungssätze, Abrechnungsstatus, Korrekturen, Einzelpositionen, Snapshots, Auditereignisse und Demo-Rollen erweitert.

## Anwesenheitsaggregation

Die Funktionen in `apps/web/src/reporting.ts` filtern Monat, Jahr oder freien Zeitraum und aggregieren ausschließlich Datensätze mit `presenceStatus === PRESENT` aus Einheiten mit `status === COMPLETED`. `ABSENT` sowie geplante, laufende, stornierte oder abgebrochene Einheiten verändern weder Teilnahme, letzte Teilnahme, Mitgliedsdetail, Monatsübersicht, Trainerermittlung, Dashboard noch CSV-Anwesenheit. Teilnehmer-, Trainer- und Assistenzeinsätze ergeben zusammen exakt die Gesamtanwesenheit. Trainer- und Assistenzfunktionen zählen allgemein als Anwesenheit, aber nie zusätzlich als Teilnehmer. Die letzte Teilnahme und die Monatswerte entstehen aus historischen Einheiten.

Es gibt keinen festen Kader. Deshalb berechnet oder zeigt Paket 1.1 weder Fehlzeiten noch eine Anwesenheitsquote.

## Trainer-, Assistenz- und Vergütungslogik

Für die Abrechnung gilt ausschließlich `sessionRole` in der konkreten abgeschlossenen Einheit. Die dauerhafte Qualifikation wird nicht verwendet. Normale Teilnahme erzeugt keine Vergütung. Nur Status `COMPLETED` ist abrechnungsfähig.

Die lokalen Beispielsätze sind:

- verantwortlicher Trainer: 20,00 EUR je abgeschlossener Einheit,
- Assistenztrainer: 10,00 EUR je abgeschlossener Einheit.

Die Oberfläche kennzeichnet sie mit „Fiktive Vergütungssätze für den lokalen Prototyp“. Vorhandene Sätze sind bearbeitbar; zusätzlich können neue zeitabhängige Sätze mit lokal eindeutigen, monoton vergebenen IDs angelegt oder vor dem Speichern verworfen werden. Rolle, Abrechnungsart, Betrag, Gültig-ab, optionales Gültig-bis und Aktivstatus sind vollständig erfassbar. Entwürfe berechnen sich danach automatisch neu. Sätze werden anhand des fachlichen Einheitsdatums inklusive Gültigkeitsgrenzen bestimmt. Betrag, Bezeichnung und Datumswerte werden fachlich validiert; aktive Zeiträume derselben Rolle dürfen sich nicht überschneiden, unmittelbar aufeinanderfolgende Zeiträume sind zulässig. So kann ein Satzwechsel ab dem 1. Juli abgebildet werden, ohne eine bereits freigegebene Juni-Abrechnung rückwirkend zu verändern. `findCompensationRate` verwirft Mehrdeutigkeiten ausdrücklich. Fehlt ein Satz, bleibt die Position ohne Betrag und erzeugt einen sichtbaren Prüfhinweis; es wird nicht stillschweigend mit 0,00 EUR abgerechnet.

Alle Geldbeträge werden intern als ganze Centwerte verarbeitet und in Euro mit zwei Nachkommastellen dargestellt.

## Korrekturen, Status und Snapshot

Positive oder negative Korrekturen besitzen Centbetrag, verpflichtende Begründung, fiktive bearbeitende Person und Zeitpunkt. Sie bleiben getrennt von Trainer- und Assistenz-Zwischensummen. Eine zentrale Euro-zu-Cent-Funktion akzeptiert deutsche Eingaben wie `10`, `10,50` und `-5,00` und verwirft leere, nicht numerische, mehrdeutige, zu genaue, nicht endliche, nullwertige oder technisch zu große Beträge ohne unbehandelten Fehler.

Implementierte Statuswerte und erlaubte Übergänge:

- `DRAFT` → `REVIEWED` oder `CANCELLED`
- `REVIEWED` → `DRAFT`, `APPROVED` oder `CANCELLED`
- `APPROVED` → `PAID` oder `CANCELLED`

Freigabe, Bezahlt-Markierung und Stornierung verlangen eine Bestätigung. Eine zentrale Validierung blockiert `REVIEWED` und `APPROVED`, solange Prüfhinweise oder Positionen ohne Satz beziehungsweise Betrag bestehen; die Oberfläche zeigt den Grund und deaktiviert die jeweilige Schaltfläche. Bei `APPROVED` wird ein eingefrorener Snapshot mit Monat, Person, Positionen, Sätzen, Korrekturen, Gesamtbetrag, Freigabezeit und fiktiver freigebender Person erzeugt.

`resolveSettlementView` ist die einzige Auflösung zwischen aktueller Berechnung und Snapshot. Einzelansicht, Monatsübersicht, Zahlungsliste, beide Abrechnungs-CSV, Druckansicht und Dashboard verwenden dadurch bei `APPROVED`, `PAID` und nach Freigabe `CANCELLED` konsistent den eingefrorenen Stand. Eine Stornierung ist terminal. Eine vor Freigabe stornierte Abrechnung erhält einen eigenen Stornierungssnapshot; eine nach Freigabe stornierte Abrechnung behält den historischen Freigabesnapshot. Danach sind Korrekturen, Beträge, erneute Freigabe und Bezahlt-Markierung ausgeschlossen.

Stornierte Abrechnungen bleiben mit ihrem historischen Snapshot für Dokumentation und Audit sichtbar, zählen aber mit 0,00 EUR zur aktuellen erwarteten Auszahlung. Sie erscheinen weder in der Zahlungsliste noch als offener Auszahlungsbetrag und ihre historischen Prüfhinweise erhöhen nicht die Dashboardkennzahl „Offene Prüfhinweise“. `DRAFT`, `REVIEWED`, `APPROVED` und `PAID` fließen weiterhin mit dem jeweils verbindlichen aktuellen oder eingefrorenen Betrag in die erwartete Gesamtvergütung ein.

Monatsabrechnung und Dashboard behandeln nur Personen mit Trainer-/Assistenzeinsatz, Korrektur, gespeichertem Status oder Snapshot als relevante Abrechnung. Personen ohne jede Monatsposition erhöhen nicht künstlich die Zahl der Entwürfe.

## Auditprotokoll

Die lokale Sitzung protokolliert Satzanlage und Satzänderung, hinzugefügte oder entfernte Korrektur sowie geprüft, freigegeben, bezahlt, storniert und zurück in Entwurf. Jeder Eintrag enthält ID, Zeitpunkt, fiktive Bearbeitung, Aktion, Objekt, vorherigen und neuen Wert sowie optional eine Begründung. Das Protokoll ist ausdrücklich kein produktiver Sicherheitsnachweis.

## Rollenansichten

- Trainer: ausschließlich eigene Anwesenheiten, Einsätze, berechnete Entschädigung und Status; keine Satz- oder Freigabefunktion.
- Vorstand: alle Auswertungen und Abrechnungen, Sätze, Korrekturen, Prüfung, Freigabe und Stornierung.
- Kassenwart: zentral gefiltert ausschließlich freigegebene und bezahlte Abrechnungen, Zahlungsliste, Export und Bezahlt-Markierung; Entwürfe, geprüfte und stornierte Abrechnungen sind auch über den Detailpfad nicht zugänglich.

Der Rollenumschalter ist deutlich als lokale Demo ohne echte Anmeldung oder Rechteprüfung gekennzeichnet.

## Exporte und Druck

Implementiert sind CSV-Exporte für Mitgliederanwesenheit, Aufwandsentschädigung und Zahlungsliste. Die Exporte entstehen erst nach ausdrücklichem Klick, enthalten den gefilterten Zeitraum beziehungsweise Monat, formatierte Beträge und keine Bankdaten. Eine Print-CSS-Ansicht blendet Navigation und Bedienelemente aus und unterstützt „Als PDF speichern“ für Einzelabrechnung und Monatsübersicht. Eine zusätzliche PDF-Bibliothek wurde nicht eingeführt.

## Mobile Darstellung und Datenverbrauch

Mitglieder-, Trainer- und Abrechnungslisten verwenden responsive Karten auf kleinen Geräten und mehrspaltige Datendarstellung auf Desktop. Geprüft wurden 375, 390, 430, 768 und 1280 Pixel ohne horizontalen Seitenüberlauf. Bedienelemente besitzen große Touchflächen; Geldbeträge, Status und Prüfhinweise sind textlich lesbar und nicht nur farbcodiert.

Es gibt keine externen Bilder, Schriftarten, Hintergrundabfragen oder automatisch geladenen Exporte. Paket 1.1 fügt keine Laufzeitbibliothek hinzu.

## Buildgröße

Vite-Produktionsergebnis:

| Datei      |  Rohgröße |     gzip |
| ---------- | --------: | -------: |
| JavaScript | 284,83 kB | 85,47 kB |
| CSS        |  26,03 kB |  6,23 kB |
| HTML       |   0,76 kB |  0,44 kB |

Produktionsbuilds erzeugen bewusst keine Source Maps. Buildgrößen sind standabhängig und werden nur aus dem jeweils ausgeführten Build berichtet.

## Testbefehle und Ergebnisse

Ausführungsumgebung: Node.js `v24.17.0`, npm `11.4.2`.

| Befehl                 | Ergebnis                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `npm ci`               | erfolgreich, 535 Pakete installiert, 0 Schwachstellen           |
| `npm run format:check` | erfolgreich                                                     |
| `npm run lint`         | erfolgreich                                                     |
| `npm run typecheck`    | erfolgreich                                                     |
| `npm test`             | erfolgreich, 5 Testdateien und 123 Tests                        |
| UTC: `npm test`        | erfolgreich, 5 Testdateien und 123 Tests bei `TZ=UTC`           |
| `npm run check`        | erfolgreich                                                     |
| `npm run build`        | erfolgreich                                                     |
| `npm audit`            | erfolgreich, 0 Schwachstellen                                   |
| `npm query .workspace` | erfolgreich, vier erwartete Workspaces                          |
| `npm run qa:browser`   | erfolgreich, 17 Viewport-/Ablaufprüfungen, keine Konsolenfehler |

Die Tests decken Anwesenheits- und Rollenaggregation, strikte `PRESENT`-/`COMPLETED`-Filterung, Monats-/Jahres-/Bereichsfilter, Berlin-Zeit, letzte Teilnahme, fehlende Quoten, Centgenauigkeit, Satzvalidierung und Gültigkeitsgrenzen, fehlende Sätze, sichere Euroeingaben, Korrekturen, Statussperren, terminale Stornierung, zentrale Snapshotauflösung bis Dashboard/CSV, relevante Monatsabrechnungen, Rollenberechtigungen und CSV-Inhalte ab. Die bestehenden 73 Paket-0-, Paket-1- und Paket-1.1-Tests bleiben unverändert erhalten und wurden nur ergänzt.

## Browser-QA

Die aktuelle portable Browser-QA verwendet standardmäßig den mit Playwright verwalteten Chromium-Browser. Ein lokaler Browser-Channel ist nur eine optionale Konfiguration; Microsoft Edge ist keine Voraussetzung. Browser und Preview-Prozess werden in einem äußeren Cleanup-Pfad zuverlässig beendet.

Geprüft wurden Startansicht und Überlauf bei 375, 390, 430, 768 und 1280 Pixel sowie manueller und Foto-Demo-Ablauf, Vorstands-Dashboard, Monats-/Mitglieder-/Traineransichten, Mitgliedsdetail, Anlage eines gültigen Folgesatzes auf Smartphone und Desktop, verständliche Ablehnung eines überlappenden Satzes, automatische Neuberechnung, gültige und ungültige Korrekturbeträge, blockierte Prüfung bei fehlendem Satz, Freigabe, eingefrorener Juni-Snapshot nach Anlage des Juli-Satzes, Snapshotwerte in Abrechnungs- und Zahlungs-CSV, terminale Stornierung ohne Bearbeitungsschaltflächen, Ausschluss des stornierten Betrags aus der Dashboard-Gesamtsumme, Kassenwart-Zahlung und zentral gefilterte Kassenwart-Abrechnungsliste, Druckmedium, Rollenwechsel und eigene Trainerübersicht. Die Browserkonsole enthielt keine Fehler.

## Bekannte Einschränkungen

- Sämtlicher Zustand lebt nur im aktuellen Browser-Tab und geht beim Neuladen verloren.
- Rollen sind reine UX-Demonstrationen ohne produktive Autorisierung.
- Historische Daten decken bewusst nur sechs fiktive Monate 2026 ab.
- CSV und Browser-Druck sind lokale Demo-Exporte; es gibt keine Buchhaltungs-, Bank-, SEPA- oder Zahlungsintegration.
- Es gibt keine echte Anmeldung, Datenbank, API oder Cloudverbindung.

## Abgrenzung

- keine echten Mitglieds-, Kinder-, Zahlungs- oder Bankdaten,
- keine AWS-, Terraform-, Cloud-, Deployment- oder produktive Systemaktion,
- keine Mitgliederanlage, kein Probetraining, keine Vertrags- oder Gürtelverwaltung aus Paket 1.2,
- Paket 1.2 und Paket 2 nicht begonnen.
