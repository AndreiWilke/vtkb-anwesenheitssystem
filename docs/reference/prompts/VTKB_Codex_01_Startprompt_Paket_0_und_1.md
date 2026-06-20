# VTKB Digitales Anwesenheitssystem - Codex-Startprompt

## Verwendung

Der bestätigte lokale Projektordner ist `C:\Users\andre\OneDrive\Documents\Privat\VTKB\Anwesenheit`. Dieser Auftrag umfasst ausschließlich **Paket 0 (Projektgrundlage)** und nach einer ausdrücklich getrennten Freigabe **Paket 1 (klickbarer UX-Prototyp)**. Es werden noch keine AWS-Ressourcen bereitgestellt und keine echten Mitglieds-, Foto- oder biometrischen Daten verarbeitet.

---

Du arbeitest als Implementierungsagent für das Projekt **„VTKB Digitales Anwesenheitssystem“**.

## 1. Verbindlicher Arbeitsrahmen

1. Arbeite ausschließlich im vom Nutzer bestätigten Projektordner `C:\Users\andre\OneDrive\Documents\Privat\VTKB\Anwesenheit`.
2. Prüfe zuerst den vorhandenen Ordner- und Repository-Inhalt. Überschreibe keine bestehenden Dateien blind.
3. Lege vor jeder Änderung einen kurzen, konkreten Plan vor. Warte auf Freigabe, wenn vorhandene Dateien, Architekturentscheidungen oder Anforderungen unklar sind.
4. Führe niemals `terraform apply`, AWS-Deployments, Löschungen, Domainänderungen oder kostenpflichtige Cloudaktionen ohne ausdrückliche Freigabe aus.
5. Verwende keine echten Mitgliedsdaten, Namen realer Kinder, Kinderbilder oder biometrischen Daten. Nutze ausschließlich eindeutig fiktive Mockdaten und neutrale Platzhalterbilder.
6. Bearbeite pro Auftrag nur das ausdrücklich freigegebene Arbeitspaket.
7. Nach jedem Paket:
   - Tests ausführen,
   - geänderte und neue Dateien auflisten,
   - wichtige Architekturentscheidungen nennen,
   - Annahmen und offene Punkte dokumentieren,
   - danach **STOPPEN**.
8. Keine eigenständige Ausweitung des Funktionsumfangs.

## 2. Fachliche Regeln, die niemals verletzt werden dürfen

- Es gibt keinen festen Kader. Alle aktiven Mitglieder können grundsätzlich an allen Einheiten teilnehmen.
- Eine Trainingseinheit wird anhand von Datum, Uhrzeit und Dojo automatisch vorgeschlagen; die Auswahl bleibt änderbar.
- Es kann mehrere direkt aufeinanderfolgende Einheiten geben.
- Pro abgeschlossener Einheit gibt es **genau einen verantwortlichen Trainer**.
- Es kann null bis mehrere Assistenztrainer geben.
- Dauerhafte Qualifikation und Funktion in der konkreten Einheit sind getrennt.
- Ein qualifizierter Trainer kann heute verantwortlicher Trainer, Assistenztrainer oder normaler Teilnehmer sein.
- Ein Assistenztrainer kann heute Assistenztrainer oder normaler Teilnehmer sein.
- Pro Person und Einheit existiert genau **eine** Anwesenheit. Trainer- oder Assistenzfunktion bedeutet automatisch anwesend; keine Doppelzählung als zusätzlicher Teilnehmer.
- Dauerhafter Anwesenheitsstatus: `PRESENT` oder `ABSENT`.
- Gäste und Probetrainingsteilnehmer werden manuell erfasst und nicht biometrisch aufgenommen.
- Trainer und Assistenztrainer dürfen eine aktuelle Einheit erfassen und speichern.
- Ältere Korrekturen sind nur für besonders berechtigte Vorstand-/Administratorrollen zulässig und müssen protokolliert werden.
- Gesichtserkennung ist nur eine spätere Vorschlagsfunktion. Die endgültige Entscheidung trifft immer ein Trainer.
- Die manuelle Erfassung muss vollständig und gleichwertig funktionieren.
- Gürtelfarbe und Gürtelgrad stammen aus den Mitgliederstammdaten, nicht aus einer automatischen Bilderkennung.

## 3. Zielarchitektur für spätere Pakete

Diese Architektur jetzt nur dokumentieren, noch nicht bereitstellen:

- Frontend: React + TypeScript + Vite als mobile PWA.
- Authentifizierung später: Amazon Cognito.
- Backend später: API Gateway HTTP API + AWS Lambda mit TypeScript.
- Datenhaltung später: DynamoDB On-Demand.
- Fotoanalyse später: privater temporärer S3-Bucket, SQS, Lambda Recognition Worker, Amazon Rekognition.
- Bildstrategie später: ein bis drei überlappende Teilbilder; bevorzugt links, Mitte, rechts.
- Nach Bestätigung: sofortige Löschung aller Gruppenbilder und temporären Gesichtsausschnitte; zusätzlicher Cleanup-Fallback für Abbrüche.
- Infrastruktur später: Terraform unter `infra/terraform`.
- AWS-Region: `eu-central-1`.
- Keine EC2-Instanz, kein NAT Gateway, keine Aurora-Dauerressource und keine SMS-Abhängigkeit.

# PAKET 0 - Projektgrundlage

## Ziel

Eine saubere, überprüfbare Monorepo-Grundlage ohne Cloudbereitstellung und ohne echte Gesichtserkennung.

## Aufgaben

1. Lege folgende Struktur an oder passe sie nachvollziehbar an eine bereits vorhandene Struktur an:

```text
VTKB-Anwesenheitssystem/
|-- apps/
|   `-- web/
|-- services/
|   |-- api/
|   `-- recognition-worker/
|-- packages/
|   `-- shared/
|-- infra/
|   `-- terraform/
|-- tests/
|   |-- integration/
|   |-- e2e/
|   `-- deletion/
|-- docs/
|   |-- adr/
|   |-- privacy/
|   |-- runbooks/
|   `-- api/
|-- PROJECT_RULES.md
|-- README.md
`-- package.json
```

2. Erstelle `README.md` mit:
   - Projektziel,
   - fachlichem Kernprozess,
   - Rollenlogik,
   - Zielarchitektur,
   - Entwicklungsphasen,
   - lokalen Befehlen,
   - Sicherheits- und Datenschutzregeln,
   - ausdrücklichem Hinweis, dass noch keine Produktivfreigabe besteht.
3. Erstelle `PROJECT_RULES.md` mit allen Stop-, Freigabe-, Datenschutz- und Cloudregeln dieses Prompts.
4. Erstelle Architecture Decision Records mindestens für:
   - PWA statt App-Store-App,
   - serverlose AWS-Architektur,
   - DynamoDB statt relationaler Datenbank,
   - manuelle Erfassung als vollständige Pflichtbasis,
   - Amazon Rekognition nur als optionale Assistenz,
   - eine Anwesenheit je Person und Funktion je Einheit,
   - temporäre Bilder mit Sofort- und Fallback-Löschung.
5. Konfiguriere eine moderne, zueinander kompatible TypeScript-Monorepo-Grundlage mit:
   - Linting,
   - Formatierung,
   - Typecheck,
   - Testgrundgerüst,
   - reproduzierbaren lokalen Befehlen.
6. Erstelle zentrale fachliche Typen und Validierungsregeln in `packages/shared`, aber noch ohne Datenbankanbindung:
   - `MemberQualification`,
   - `SessionRole`,
   - `PresenceStatus`,
   - `CaptureSource`,
   - `TrainingTemplate`,
   - `TrainingSession`,
   - `AttendanceRecord`,
   - `GuestAttendance`,
   - `ConsentStatus`.
7. Implementiere Validierungstests für:
   - genau einen verantwortlichen Trainer je abgeschlossener Einheit,
   - keine Funktion für abwesende Personen,
   - keine doppelte Anwesenheit derselben Person in derselben Einheit,
   - Trainer-/Assistenzfunktion setzt Anwesenheit voraus,
   - Gäste besitzen keine biometrische Enrollment-ID.
8. Noch nicht implementieren:
   - echte AWS-Ressourcen,
   - Terraform-Ressourcen mit Deploymentabsicht,
   - Cognito-Login,
   - Datenbankzugriff,
   - Foto-Upload,
   - Rekognition,
   - echte Offline-Synchronisation.

## Abnahme Paket 0

- Installation und alle dokumentierten Befehle funktionieren.
- Lint, Typecheck und Tests sind erfolgreich.
- Keine Geheimnisse, Zugangsdaten oder echten Personendaten im Repository.
- Bericht mit Plan, Dateien, Tests, Annahmen und offenen Fragen.
- Danach **STOPPEN** und auf Freigabe von Paket 1 warten.

# PAKET 1 - Klickbarer UX-Prototyp

Dieses Paket erst nach ausdrücklicher Freigabe beginnen.

## Ziel

Eine lokale, responsive PWA mit fiktiven Mockdaten, die den vollständigen Trainerablauf auf einem Smartphone demonstriert. Noch keine echte Kameraübertragung, AWS-Verbindung oder Gesichtserkennung.

## Pflichtansichten und Abläufe

1. Login-Mockup.
2. Startseite mit automatisch vorgeschlagener heutiger Einheit.
3. Auswahl zwischen zwei direkt aufeinanderfolgenden Einheiten.
4. Bestätigung oder Änderung des verantwortlichen Trainers:
   - genau eine Person,
   - Standardwert aus Trainingsvorlage,
   - Vertretung änderbar.
5. Auswahl mehrerer Assistenztrainer.
6. Möglichkeit, qualifizierte Trainer oder Assistenztrainer heute als normale Teilnehmer zu führen.
7. Auswahl der Erfassungsart:
   - Fotoerfassung,
   - manuelle Schnellerfassung.
8. Kamera-Mockup für bis zu drei überlappende Teilbilder:
   - links,
   - Mitte,
   - rechts,
   - Qualitätsmeldung je Bild,
   - Anzahl gefundener Gesichter als fiktiver Wert.
9. Analysefortschritt als Mockup.
10. Ergebnisprüfung in den Bereichen:
    - eindeutiger Vorschlag,
    - bitte prüfen,
    - unbekannt,
    - manuell ergänzen.
11. Gesamtübersicht mit genau einer Anwesenheit pro Person und einer Funktion:
    - `RESPONSIBLE_TRAINER`,
    - `ASSISTANT_TRAINER`,
    - `PARTICIPANT`.
12. Gäste und Probetrainingsteilnehmer manuell ergänzen.
13. Manuelle Schnellerfassung:
    - alle zunächst abwesend,
    - Bild-/Namensraster,
    - Suche,
    - Filter,
    - Antippen setzt anwesend.
14. Mitgliederübersicht mit:
    - Name,
    - Profilbild-Platzhalter,
    - Gürtelgrad,
    - dauerhafter Qualifikation,
    - fiktivem Einwilligungsstatus.
15. Statistik-Mockup:
    - Anzahl besuchter Einheiten,
    - Einsätze nach Funktion,
    - Gürtelverteilung,
    - keine öffentliche Kinder-Rangliste.
16. Bei fehlender biometrischer Freigabe muss die Foto-KI-Funktion deaktivierbar sein; die manuelle Erfassung bleibt nutzbar.

## Design

- modern, klar und karatebezogen, aber nicht verspielt,
- VTKB-Farbwelt: dunkles Anthrazit, Weiß und zurückhaltendes Rot,
- Smartphone-first,
- große Touchflächen,
- hohe Kontraste,
- keine Information ausschließlich über Farbe,
- keine dominanten Prozentwerte als Scheinsicherheit,
- stattdessen klare Zustände: „eindeutiger Vorschlag“, „bitte prüfen“, „keine sichere Zuordnung“.

## Technische Grenzen Paket 1

- Nur lokale Mockdaten.
- Keine echten Uploads.
- Keine externe Gesichtserkennung.
- Keine echten Kinderbilder.
- Keine Cloudbereitstellung.
- Keine Speicherung sensibler Daten im Browser.

## Abnahme Paket 1

- `npm install` und die dokumentierten Startbefehle funktionieren.
- Lint, Typecheck und Tests sind erfolgreich.
- Die Kernabläufe sind durch Komponenten- oder E2E-Tests abgedeckt.
- Erstelle Screenshots oder eine kurze visuelle Dokumentation aller Ansichten.
- Prüfe die Darstellung mindestens in Smartphone-Breiten für iPhone und Android.
- Berichte danach: Plan, Dateien, Tests, Annahmen, Abweichungen und offene Fragen.
- Danach **STOPPEN**.
