# Paket 0 - Abnahmebericht

- Datum: 2026-06-20
- Status: abgeschlossen und nach unabhaengigem Review korrigiert
- Projektordner: `C:\Users\andre\OneDrive\Documents\Privat\VTKB\Anwesenheit`
- Cloudaktionen: keine
- Commit: keiner

## Umgesetzter Umfang

- npm-Workspace-Grundlage mit vier erkannten Paketen:
  - `@vtkb/web` unter `apps/web`
  - `@vtkb/api` unter `services/api`
  - `@vtkb/recognition-worker` unter `services/recognition-worker`
  - `@vtkb/shared` unter `packages/shared`
- Verbindliche Arbeits-, Datenschutz-, Fach- und Cloudregeln.
- README mit Zielprozess, Rollenlogik, Zielarchitektur, Phasen und reproduzierbaren lokalen Befehlen.
- Sieben angenommene Architecture Decision Records.
- Zentrale Fachtypen und Validierungen ohne Datenbank- oder Cloudanbindung.
- Geordnete Referenzunterlagen unter `docs/reference`.
- Neutrale Konzeptdiagramme ohne reale Mitgliedsnamen.

## Lokale Laufzeit

- Verbindliche Node-Engine: `^20.19.0 || ^22.12.0 || >=24.0.0`
- Empfohlene lokale Standardumgebung: Node.js 22.12 oder neuer innerhalb der freigegebenen Versionslinien.
- Deklarierter Paketmanager: `npm@11.4.2`
- Ausgefuehrte Abnahmeumgebung: Node.js `v24.14.0`, npm `11.4.2`
- Reproduzierbare Installation: `npm ci`

Die lokale Codex-Laufzeit stellt npm nicht global bereit. Die aufgefuehrten npm-Befehle wurden deshalb mit npm 11.4.2 ueber die gebuendelte Node-Laufzeit gestartet.

## Ausgefuehrte Verifikation

| Befehl                 | Nachgewiesenes Ergebnis                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm ci`               | erfolgreich, 186 Pakete installiert                                  |
| `npm run format:check` | erfolgreich                                                          |
| `npm run lint`         | erfolgreich                                                          |
| `npm run typecheck`    | erfolgreich                                                          |
| `npm test`             | erfolgreich, 2 Testdateien und 17 Tests                              |
| `npm run check`        | erfolgreich; Formatcheck, Lint, Typecheck und Tests erneut bestanden |
| `npm audit`            | erfolgreich, 0 Schwachstellen                                        |
| `npm query .workspace` | erfolgreich, genau vier erwartete Workspaces erkannt                 |

## Getestete Fachregeln

- Genau ein verantwortlicher Trainer je abgeschlossener Einheit.
- Keine Funktion fuer abwesende Personen.
- `PRESENT` erfordert genau eine Funktion.
- Keine doppelte Anwesenheit derselben Person in derselben Einheit.
- Mitgliedsdatensaetze muessen zur geprueften Einheit gehoeren.
- Verantwortliche und assistierende Trainerfunktionen setzen Anwesenheit voraus.
- Gaeste besitzen keine biometrische Enrollment-ID.
- Eine `guestId` darf je Einheit nur einmal vorkommen.
- Gastdatensaetze muessen zur geprueften Einheit gehoeren.
- Ein gueltiger Gast ohne biometrische Enrollment-ID wird akzeptiert.
- `assertValidTrainingSession` akzeptiert gueltige und verwirft ungueltige Daten.
- `ConsentStatus` enthaelt `DECLINED`.
- `BiometricConsent` ist durch seinen Zweck eindeutig auf biometrische Anwesenheitsidentifizierung begrenzt und bildet keine allgemeine Fotoerlaubnis ab.

## Referenz- und Datenschutzpruefung

- Das alte Wireframe mit einem realen Mitgliedsnamen wurde aus dem Repository entfernt.
- Die neutrale Fassung verwendet `Trainer A` und `Mitglied A` bis `Mitglied C`.
- Das eingebettete Wireframe in der Machbarkeitsstudie wurde ebenfalls ersetzt.
- Alle sechs Diagramme wurden visuell auf Personennamen geprueft.
- Der sichtbare DOCX-Text enthaelt keinen der entfernten Mocknamen.
- Die Autorenangabe in der als Planungsdokument gekennzeichneten Machbarkeitsstudie bleibt als Dokumentprovenienz erhalten.
- Ein read-only Word-PDF-Export der aktualisierten Studie ergab 25 Seiten; alle 25 Seiten wurden visuell geprueft. Der kanonische LibreOffice-Renderer war auf diesem Windows-System technisch blockiert.

## Annahmen

- Alle Zeitpunkte werden spaeter als ISO-8601-Zeitpunkte mit Zeitzonenbezug transportiert; die konkrete Dojo-Zeitzonenlogik folgt in Paket 3.
- `PREVIOUS_SESSION_SUGGESTION` ist nur eine unverbindliche Erfassungsquelle und erzeugt ohne Bestaetigung keine Anwesenheit.
- Ein anwesendes Mitglied besitzt genau eine heutige Funktion; eine abwesende Person besitzt keine.
- `DECLINED` bezeichnet eine ausdrueckliche Ablehnung; `WITHDRAWN` den spaeteren Widerruf einer zuvor erteilten biometrischen Einwilligung.

## Offene Punkte fuer spaetere Pakete

- Genaue Trainingsvorlagen, Dojos und Zeitfenster fuer die automatische Einheitenauswahl.
- Trainer-Korrekturfrist und Rollenmatrix fuer Vorstand/Administratoren.
- Aufbewahrungsfrist fuer bestaetigte Anwesenheitsdaten.
- Versionierter Einwilligungstext, DSFA und Verfahren fuer Nicht-Einwilligende.
- DynamoDB-Zugriffsmuster und atomare Persistenz der Invarianten.
- Rekognition-Schwellenwerte werden erst aus einem freigegebenen Erwachsenenpilot abgeleitet.

## Ausdruecklicher Stopp

Paket 1 ist nicht begonnen. Es gibt keine React-Oberflaeche, AWS-Ressource, Terraform-Ressource, Datenbankanbindung, Fotoverarbeitung, Rekognition-Integration oder Cloudbereitstellung.
