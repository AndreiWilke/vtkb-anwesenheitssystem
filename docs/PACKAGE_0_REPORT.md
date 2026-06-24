# Paket 0 - Abnahmebericht

- Datum des aktuellen Korrekturstands: 2026-06-24
- Status: Paket-0-Grundlage abgeschlossen; Repository inzwischen bis zum lokalen Paket-1.7-Prototyp erweitert
- Projektordner: `D:\Anwesenheit`
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

## Historische Paket-0-Verifikation

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
- Probetrainingsteilnehmer werden als dauerhafte Profile manuell erfasst. Eine allgemeine Gastfunktion existiert nicht.
- Anwesenheitsdatensätze beziehen sich ausschließlich auf Mitglieder oder dauerhafte Probetrainingprofile.
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

## In späteren lokalen Paketen konkretisiert

- Alle fachlichen Zeitpunkte verwenden `Europe/Berlin`; vier Dojos und elf Wochenzeiten sind als getrennte Stammdaten umgesetzt.
- `PREVIOUS_SESSION_SUGGESTION` ist nur eine unverbindliche Erfassungsquelle und erzeugt ohne Bestaetigung keine Anwesenheit.
- Ein anwesendes Mitglied besitzt genau eine heutige Funktion; eine abwesende Person besitzt keine.
- `DECLINED` bezeichnet eine ausdrueckliche Ablehnung; `WITHDRAWN` den spaeteren Widerruf einer zuvor erteilten biometrischen Einwilligung.

## Weiterhin offene Punkte fuer spaetere Produktivpakete

- Trainer-Korrekturfrist und Rollenmatrix fuer Vorstand/Administratoren.
- Aufbewahrungsfrist fuer bestaetigte Anwesenheitsdaten.
- Versionierter Einwilligungstext, DSFA und Verfahren fuer Nicht-Einwilligende.
- DynamoDB-Zugriffsmuster und atomare Persistenz der Invarianten.
- Rekognition-Schwellenwerte werden erst aus einem freigegebenen Erwachsenenpilot abgeleitet.

## Aktuelle Abgrenzung

Der lokale React-Prototyp ist inzwischen vorhanden. Weiterhin existieren keine produktive AWS-Ressource, Datenbankanbindung, echte Fotoverarbeitung, Rekognition-Integration oder Cloudbereitstellung.
