# VTKB Digitales Anwesenheitssystem - Aufgaben- und Steuerungsplan

## Grundregel

Jedes Paket wird einzeln freigegeben. Codex plant, implementiert, testet, dokumentiert und stoppt. ChatGPT prüft das Ergebnis und formuliert erst danach den nächsten Auftrag. `terraform apply`, Deployment, Löschung und kostenpflichtige Cloudaktionen benötigen immer eine gesonderte ausdrückliche Freigabe.

| Paket | Zielergebnis | Codex-Rolle | Freigabe danach |
|---|---|---|---|
| 0 | Repository, Regeln, ADRs, gemeinsame Typen und Tests | Codex 1 implementiert | ChatGPT-Strukturreview |
| 1 | Lokaler klickbarer Smartphone-Prototyp mit Mockdaten | Codex 1 implementiert | Andrei prüft Ablauf und Design |
| 2 | Terraform-Code für serverlose AWS-Struktur, nur validate/plan | Codex 1 implementiert, Codex 2 prüft | Kosten-/Security-Freigabe |
| 3 | Manuelles Backend-MVP | Codex 1 implementiert | API-/Rollenreview |
| 4 | Produktives manuelles PWA-Frontend | Codex 1 implementiert | Hallentest ohne Biometrie |
| 5 | Consent- und Enrollment-Modul | Codex 1 implementiert | Datenschutzreview |
| 6 | Asynchrone KI-Analyse-Pipeline mit Sofortlöschung | Codex 1 implementiert, Codex 2 prüft | Technischer Erwachsenenpilot |
| 7 | Pilotmetriken und Qualitätsauswertung ohne unnötige Personendaten | Codex 1 implementiert | GO/NO-GO-Auswertung |
| 8 | Produktivhärtung, CI/CD, Monitoring und Runbooks | Codex 1 implementiert | formale Produktivfreigabe |

## Paket 2 - Terraform-Plan

**Ergebnis:** Terraform-Struktur für CloudFront, private S3-Buckets, Cognito, API Gateway HTTP API, Lambda, DynamoDB On-Demand, SQS, EventBridge-Cleanup, CloudWatch und AWS Budgets.

**Grenzen:** nur `fmt`, `validate`, statische Prüfungen und `plan` nach ausdrücklicher Freigabe; kein `apply`. Kein NAT Gateway, keine EC2-Instanz, keine Aurora-Datenbank, kein SMS-MFA.

**Tests:** Terraform-Validierung, Policy-Prüfung, Kostenfallen-Check, getrennte `dev`- und `prod`-Variablen, private Buckets und Least Privilege.

## Paket 3 - Manuelles Backend-MVP

**Ergebnis:** APIs und Datenmodell für Mitglieder, dauerhafte Probetrainingprofile, Qualifikationen, Gürtelgrade, Trainingsvorlagen, Einheiten, einen verantwortlichen Trainer, mehrere Assistenztrainer, Anwesenheit, Audit und berechtigte Korrekturen.

**Pflichttests:** genau ein Verantwortlicher, keine Doppelanwesenheit, abwesend ohne Funktion, Trainer-/Assistenzfunktion impliziert anwesend, ältere Korrektur nur durch berechtigte Rolle.

## Paket 4 - Produktives manuelles Frontend

**Ergebnis:** Cognito-Login, automatische Einheitenauswahl, aufeinanderfolgende Einheiten, Rollenwahl, manuelles Bilderraster, Suche, dauerhafte Probetrainingprofile, Bestätigung, Historie, Statistik und Offline-Zwischenspeicherung der manuellen Erfassung.

**Pilot:** 4-6 Wochen realer Hallentest ohne Gesichtserkennung.

## Paket 5 - Consent und Enrollment

**Ergebnis:** versionierter Einwilligungsstatus, Widerruf, kontrollierte Referenzaufnahme, sichtbares Profilbild, Rekognition-User-Zuordnung, vollständige Löschung bei Widerruf.

**Voraussetzung:** freigegebene Einwilligung, Datenschutzhinweise und DSFA-Entwurf. Keine Kinderreferenzen vor Freigabe.

## Paket 6 - KI-Analyse-Pipeline

**Ergebnis:** kurzlebige Presigned Uploads, privater S3-Temp-Bucket, SQS, Lambda Worker, `DetectFaces`, temporäre Ausschnitte, `SearchUsersByImage`, Kandidatenabstand, Dubletten, Ergebnisprüfung, Sofortlöschung und Cleanup-Fallback.

**Pflichttests:** Löschung nach Bestätigung, Löschung nach Abbruch, unbekannte Gesichter nicht dauerhaft gespeichert, Fehler/Wiederholung ohne Datenverlust, keine Bildbytes in Logs, begrenzte Parallelität.

## Paket 7 - Pilotinstrumentierung

**Ergebnis:** Erfassungszeit, Recall, Fehlidentifikationen, manuelle Korrekturen, unbekannte Gesichter, Dubletten, Löschtests, Rollenfehler, Kosten und Trainerfeedback. Keine dauerhafte Speicherung unnötiger biometrischer Rohdaten.

## Paket 8 - Produktion

**Ergebnis:** CI/CD mit manueller Freigabe, Monitoring, Kostenalarme, Backup-/Restore-Tests, Sicherheitsrunbooks, Datenschutzvorfall-Runbook, Widerrufs-/Löschrunbook, Betriebsdokumentation und formale Release-Checkliste.

**Go-Live nur nach:** Vorstandsbeschluss, ausdrücklicher biometrischer Einwilligung, DSFA, Verfahren für Nicht-Einwilligende, AWS-Vertragsprüfung, aktueller AI-Act-Klassifizierung, Erwachsenenpilot, bestandenen Löschtests, manuellem Fallback und Trainerschulung.
