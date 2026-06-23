# VTKB Digitales Anwesenheitssystem

> **Status:** Lokaler klickbarer UX- und Fachlogik-Prototyp (Paket 1 und 1.1). Es besteht keine Produktivfreigabe. Es werden keine AWS-Ressourcen bereitgestellt und keine echten Personen-, Zahlungs-, Foto- oder biometrischen Daten verarbeitet.

## Projektziel

Das System soll Trainern und Assistenztrainern eine schnelle, nachvollziehbare Anwesenheitserfassung auf dem Smartphone ermoeglichen. Eine mobile PWA wird zunaechst eine vollstaendige manuelle Schnellerfassung anbieten. Eine spaetere optionale Fotoanalyse darf Personen nur vorschlagen; der Trainer prueft und bestaetigt die endgueltige Liste.

Es gibt keinen festen Kader. Alle aktiven Mitglieder koennen grundsaetzlich an einer Einheit teilnehmen. Die Anwendung schlaegt die passende Einheit anhand von Datum, Uhrzeit und Dojo vor, laesst aber eine Aenderung zu.

## Fachlicher Kernprozess

1. Eine berechtigte Person waehlt oder bestaetigt die vorgeschlagene Trainingseinheit.
2. Genau ein verantwortlicher Trainer und optional mehrere Assistenztrainer werden festgelegt.
3. Anwesende Mitglieder werden manuell oder spaeter mit Fotoassistenz vorgeschlagen.
4. Gaeste und Probetrainingsteilnehmer werden ausschliesslich manuell erfasst.
5. Der Trainer prueft die Gesamtliste und schliesst die Einheit ab.
6. Pro Person und Einheit bleibt genau ein Anwesenheitsdatensatz mit genau einer heutigen Funktion.

## Rollenlogik

- `RESPONSIBLE_TRAINER`: genau einmal in jeder abgeschlossenen Einheit.
- `ASSISTANT_TRAINER`: null bis mehrfach.
- `PARTICIPANT`: normale Teilnahme, unabhaengig von einer dauerhaften Trainerqualifikation.
- Eine Trainer- oder Assistenzfunktion impliziert `PRESENT` und wird nicht zusaetzlich als Teilnehmer gezaehlt.
- Dauerhafte Qualifikation und heutige Funktion sind verschiedene fachliche Konzepte.

## Paket-1-Prototyp

Die Smartphone-first-PWA in `apps/web` bildet den vollständigen lokalen Bedienablauf mit 40 eindeutig fiktiven Mitgliedern ab:

- vorgeschlagene oder frei gewählte Trainingseinheit,
- genau ein verantwortlicher Trainer und optionale Assistenztrainer,
- vollständige manuelle Anwesenheit mit Suche, Filtern, Rollen und dauerhaften Probetrainingprofilen,
- rein simulierte Fotoassistenz ohne Kamera, Upload, Bilder oder Gesichtserkennung,
- verpflichtende Trainerprüfung, lokale Abschlussansicht und interne Demo-Auswertung.

Die fachliche Vereinszeitzone ist ausdrücklich `Europe/Berlin`. Lokale Trainingseinheiten und ihre Anzeige werden unabhängig von der Prozess- oder Systemzeitzone in dieser Zeitzone erzeugt; direkt aufeinanderfolgende Einheiten verwenden halb offene Zeitintervalle und wechseln deshalb exakt am gemeinsamen Zeitpunkt.

Der Prototyp speichert nur im React-Zustand des aktuellen Browser-Tabs. Ein Neuladen setzt die Demo zurück. Details und Prüfergebnisse stehen in [docs/PACKAGE_1_REPORT.md](docs/PACKAGE_1_REPORT.md).

## Paket-1.1-Auswertung und Aufwandsentschaedigung

Der lokale Prototyp enthaelt zusaetzlich einen vollstaendigen Auswertungs- und Abrechnungsbereich mit 60 fiktiven abgeschlossenen Einheiten von Januar bis Juni 2026:

- Mitglieder- und Schuelerauswertung fuer Monat, Jahr oder freien Zeitraum ohne unzulaessige Fehlzeitenquote,
- chronologische Mitgliedsdetails und aus Einheiten berechnete Monatswerte,
- getrennte Trainer-/Assistenzauswertung auf Basis der Funktion je konkreter Einheit,
- automatische Monatsabrechnung mit ganzen Centwerten und datumsabhaengigen fiktiven Verguetungssaetzen,
- begruendete positive und negative Korrekturen, Statusworkflow, Freigabesnapshot und lokales Auditprotokoll,
- Demo-Rollen fuer Trainer, Vorstand und Kassenwart,
- CSV-Exporte sowie druckoptimierte Einzel- und Monatsansichten.

Die Beispielsätze von 20,00 EUR fuer verantwortliche Trainer und 10,00 EUR fuer Assistenztrainer sind ausdruecklich keine echte VTKB-Regel. Details und Pruefergebnisse stehen in [docs/PACKAGE_1_1_REPORT.md](docs/PACKAGE_1_1_REPORT.md).

## Zielarchitektur spaeterer Pakete

- React, TypeScript und Vite als Smartphone-first-PWA.
- Amazon Cognito fuer Authentifizierung.
- API Gateway HTTP API und TypeScript-Lambdas.
- DynamoDB On-Demand fuer die Datenhaltung.
- Private temporaere S3-Ablage, SQS, Recognition Worker und Amazon Rekognition fuer die optionale Fotoassistenz.
- Terraform unter `infra/terraform`, AWS-Region `eu-central-1`.
- Serverlos ohne EC2, NAT Gateway, Aurora-Dauerressource oder SMS-Abhaengigkeit.

Diese Architektur wird in Paket 0 nur dokumentiert. Die Entscheidungen stehen in [docs/adr](docs/adr/README.md).

## Repository-Struktur

```text
apps/web/                    lokaler Paket-1-UX-Prototyp
services/api/                spaetere HTTP-API und Geschaeftslogik
services/recognition-worker/ spaetere asynchrone Fotoassistenz
packages/shared/             gemeinsame Typen und Validierung
infra/terraform/             spaetere Infrastrukturdefinition
tests/                       Integration, E2E und Loeschtests
docs/                        ADRs, Datenschutz, Runbooks und API-Dokumentation
docs/reference/              Machbarkeitsstudie, Prompts und neutrale Diagramme
```

Die npm-Workspaces heissen `@vtkb/web`, `@vtkb/api`, `@vtkb/recognition-worker` und `@vtkb/shared`. Nur `@vtkb/web` enthält in Paket 1 eine lokale Implementierung; API und Recognition Worker bleiben Metadaten-Platzhalter.

## Lokale Entwicklung

Als lokale Standardumgebung wird Node.js 22.12 oder neuer mit npm empfohlen. Verbindlich sind die in `package.json` angegebenen kompatiblen Versionslinien `^20.19.0 || ^22.12.0 || >=24.0.0`.

```powershell
npm ci
npm run dev
```

Der lokale Prototyp ist danach standardmäßig unter `http://127.0.0.1:5173` erreichbar. Weitere Prüf- und Buildbefehle:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run preview
```

`npm ci` installiert exakt den Stand aus `package-lock.json` und ist deshalb der reproduzierbare Standard. `npm run check` fuehrt alle nicht veraendernden Qualitaetspruefungen nacheinander aus. Fuer automatische Formatierung steht `npm run format` bereit.

## Entwicklungsphasen

| Paket | Ergebnis                                                | Cloudaktion                   |
| ----- | ------------------------------------------------------- | ----------------------------- |
| 0     | Repository, Regeln, ADRs, gemeinsame Typen und Tests    | keine                         |
| 1     | lokaler klickbarer UX-Prototyp mit Mockdaten            | keine                         |
| 1.1   | lokale Auswertung und Aufwandsentschaedigung            | keine                         |
| 2     | Terraform-Code, nur validieren und nach Freigabe planen | kein Apply                    |
| 3     | manuelles Backend-MVP                                   | nur nach eigener Freigabe     |
| 4     | produktives manuelles PWA-Frontend                      | nur nach eigener Freigabe     |
| 5     | Consent und Enrollment                                  | nur nach Datenschutzfreigabe  |
| 6     | asynchrone Fotoassistenz und Loeschpipeline             | nur nach Pilotfreigabe        |
| 7     | datensparsame Pilotmetriken                             | nach Freigabe                 |
| 8     | Produktivhaertung, CI/CD, Monitoring und Runbooks       | formale Freigabe erforderlich |

## Sicherheit und Datenschutz

- Keine echten Mitgliedsdaten oder Bilder in Entwicklung und Tests.
- Manuelle Erfassung bleibt vollwertige Pflichtbasis.
- Biometrie benoetigt spaeter eine gesonderte Rechts- und Datenschutzfreigabe.
- Fotoartefakte werden spaeter sofort und ueber einen Cleanup-Fallback geloescht.
- Autorisierung wird spaeter im Backend durchgesetzt; Frontendpruefungen allein reichen nicht.
- Least Privilege, private Buckets, kurze Upload-Freigaben und begrenzte Logs sind verbindlich.
- Cloudbereitstellung, Loeschungen und kostenpflichtige Aktionen sind ohne ausdrueckliche Freigabe untersagt.

Alle verbindlichen Arbeits- und Fachregeln stehen in [PROJECT_RULES.md](PROJECT_RULES.md).
