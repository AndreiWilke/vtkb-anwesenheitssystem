# Paket 1.2 – Personenmodell, Probetraining und Gürtelverwaltung

Stand: 2026-06-21 · Prototyp-Phase, keine Produktivdaten

---

## Überblick

Paket 1.2 erweitert das VTKB-Anwesenheitssystem um folgende Bereiche:

- **Personenmodell**: `TrialParticipant` als permanentes Profil
- **Probetraining-Workflow**: 4 kostenlose Einheiten, Vertragsstatus-Tracking, Vorstandsausnahme
- **Dubletten-Erkennung**: normalisierter Vergleich auf Vorname + Nachname + Geburtsjahr
- **4-Einheiten-Sperre**: Soft-Warnung bei Anwesenheits-Toggle, Hartsperre in `canCompleteSession`
- **Gürtelverwaltung**: unveränderliche `BeltHistoryEntry`-Einträge, Bildvorschläge mit Prüfhinweis

---

## Neue Dateien

| Datei                                 | Beschreibung                                                                |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `packages/shared/src/trial.ts`        | Zählung besuchter Einheiten, Berechtigungsprüfung, Vertragsstatus-Übergänge |
| `packages/shared/src/person.ts`       | Normalisierung, Dubletten-Check, ID-Generatoren                             |
| `packages/shared/src/belt.ts`         | Gürteldemo-Katalog, Änderungshistorie, Bildvorschlag-Entscheidungen         |
| `apps/web/src/trialWorkflow.ts`       | App-seitige Trial-Logik, Warnhinweise, Profil-Builder                       |
| `apps/web/src/trialScreens.tsx`       | TrialListScreen, TrialNewScreen, TrialProfileScreen, TrialContractScreen    |
| `packages/shared/test/trial.test.ts`  | 30 Unit-Tests für Probetraining-Kernlogik                                   |
| `packages/shared/test/person.test.ts` | 12 Unit-Tests für Normalisierung und Dubletten                              |
| `docs/PACKAGE_1_2_REPORT.md`          | Dieser Bericht                                                              |

---

## Geänderte Dateien

| Datei                           | Änderung                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `packages/shared/src/domain.ts` | + `DemoRole.ASSISTANT_TRAINER`, + 5 neue Const-Objekt-Enums, + 3 neue Interfaces |
| `packages/shared/src/index.ts`  | + Re-Exports für `trial.js`, `person.js`, `belt.js`                              |
| `apps/web/src/types.ts`         | Dauerhafte Probetrainingprofile, neue AppScreens und Re-Exports                  |
| `apps/web/src/mockData.ts`      | + 6 fiktive TrialParticipants, Gürtelhistorien, Bildvorschläge                   |
| `apps/web/src/workflow.ts`      | `canCompleteSession` nimmt optionalen `blockedTrialParticipants`-Parameter       |
| `apps/web/src/reporting.ts`     | + `buildTrialSummaries`, `trialDashboardMetrics`, `trialCsv`                     |
| `apps/web/src/styles.css`       | + Paket-1.2-CSS-Klassen (TrialList, Filter-Tabs, Fortschrittsbalken etc.)        |
| `apps/web/src/workflow.test.ts` | + 5 neue Tests für Trial-Sperrlogik und Demo-Daten                               |
| `PROJECT_RULES.md`              | + Paket-1.2-Fachregeln (Bildanalyse, Trial, Gürtelverwaltung)                    |

---

## Fachregeln (Auszug aus PROJECT_RULES.md)

### Probetraining

- Jeder Probetrainingsteilnehmer ist ein permanentes `TrialParticipant`-Profil.
- Maximal **4 kostenlose Einheiten** (gezählt aus der Anwesenheitshistorie, nicht als mutierbares Feld).
- Die 5. Teilnahme ist nur möglich bei: `ContractStatus.RECEIVED`, `ContractStatus.MEMBERSHIP_ACTIVATED`, oder genehmigter und noch nicht genutzter Vorstandsausnahme.
- **Vorstandsausnahme**: genau eine zusätzliche Einheit, Begründungspflicht, erzeugt Audit-Eintrag.
- Soft-Warnung im UI bei der 3. und 4. Einheit; Hartsperre in `canCompleteSession`.

### Bildanalyse / Gürtelverwaltung

- Bildanalyse darf ausschließlich die **sichtbare Gürtelfarbe** als unverbindlichen Prüfhinweis vorschlagen.
- **Kein Kyu- oder Dan-Grad** darf aus Bildern abgeleitet werden.
- Ohne ausdrückliche manuelle Bestätigung wird keine Stammdatenänderung erzeugt.
- Jede bestätigte Gürteländerung erzeugt einen unveränderlichen `BeltHistoryEntry`.

### Dubletten

- Normalisierter Vergleich: Kleinbuchstaben + Umlautkonvertierung + Trim + Geburtsjahr.
- Nur der Vorstand darf nach zusätzlicher Bestätigung eine bewusste Neuanlage trotz Dublette durchführen.

---

## Demo-Datensätze

Alle Testdaten sind **ausschließlich fiktiv**. Erkennungsmerkmale:

- Nachname enthält „Probetraining" oder „Beispiel-Probe"
- E-Mail-Adressen enden auf `@example.invalid`
- Telefonnummern im Format `030-555-01xx`
- Mitgliedsnamen enden auf „Beispiel" (bestehende 40 Mitglieder, unverändert)

---

## Offene Punkte (Paket 1.3 / 1.4)

- Umwandlung TrialParticipant → Mitglied (Paket 1.3)
- Direkte Mitgliedsanlage ohne Probetraining (Paket 1.3)
- Gürtelhistorie-Screen + simulierter Bildvorschlag-Demo (Paket 1.4)
- Auswertungen: Probetraining-Conversion-Rate, Vertragseingangs-Dashboard (Paket 1.3)

---

## Technische Hinweise

- Alle neuen Shared-Funktionen sind **zustandslos und rein berechenbar** (keine React-Abhängigkeit).
- Frühere kurzlebige Fremdpersonenmodelle wurden vollständig durch `TrialParticipant` ersetzt.
- Der Gürteldemo-Katalog (`BELT_CATALOG`) in `belt.ts` ist fiktiv und muss nach Paket 2 durch den VTKB e.V. bestätigt werden.
- Git-Operationen (Branch, Commit, Push, PR) werden manuell via PowerShell durchgeführt (siehe `scripts/git_package_1_2.ps1`).
