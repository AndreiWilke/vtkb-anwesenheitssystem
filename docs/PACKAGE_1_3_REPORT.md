# Paket 1.3 – Umwandlung zum Mitglied, Direktanlage, Vorstandsausnahme, Auswertungen

Stand: 2026-06-21 · Prototyp-Phase, keine Produktivdaten

---

## Überblick

Paket 1.3 baut auf Paket 1.2 auf und ergänzt folgende Bereiche:

- **Umwandlung TrialParticipant → Mitglied**: gesamte Anwesenheitshistorie bleibt erhalten
- **Direktanlage Mitglied**: ohne Probetraining, z. B. bei Vereinswechsel
- **Vorstandsausnahme erteilen**: Screen mit Begründungspflicht, Audit-Eintrag, nur DemoRole.BOARD
- **Probetraining-Auswertungsscreen**: Kennzahlen, Filterliste, CSV-Export

---

## Neue Dateien

| Datei | Beschreibung |
|---|---|
| `packages/shared/src/conversion.ts` | `convertTrialParticipantToMember`, `createDirectMember`, `grantBoardOverride`, `checkConversionEligibility` |
| `packages/shared/test/conversion.test.ts` | 24 Unit-Tests für Konvertierung, Direktanlage, Vorstandsausnahme |
| `apps/web/src/trialReportScreen.tsx` | `TrialReportScreen` mit Kennzahlen, Tabelle, Filter, CSV-Export |
| `docs/PACKAGE_1_3_REPORT.md` | Dieser Bericht |

---

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `packages/shared/src/index.ts` | + Re-Export `conversion.js` |
| `apps/web/src/types.ts` | + `AuditEntry`, `ConversionResult`, `DirectMemberResult` Re-Exports; + 4 neue AppScreens |
| `apps/web/src/trialScreens.tsx` | + `BoardOverrideScreen`, `TrialConversionScreen`, `DirectMemberNewScreen` |
| `apps/web/src/mockData.ts` | trial-005 als umgewandelt markiert; + `demoAuditEntries` |
| `apps/web/src/styles.css` | + Report-Screen CSS (MetricCard, ReportTable, SearchInput etc.) |
| `apps/web/src/workflow.test.ts` | + 7 neue Tests (Konvertierung, Direktanlage, Vorstandsausnahme, Audit) |

---

## Fachregeln (Ergänzungen zu Paket 1.2)

### Umwandlung Trial → Mitglied

- Voraussetzung: `contractStatus === RECEIVED` oder `MEMBERSHIP_ACTIVATED`
- `membershipStatus` wird auf `ACTIVE_MEMBER` gesetzt
- `contractStatus` wird auf `MEMBERSHIP_ACTIVATED` gesetzt
- `memberId` wird gesetzt (neue Mitglieds-ID)
- Anwesenheitshistorie bleibt vollständig erhalten (keine Datenmigration nötig)
- Jede Umwandlung erzeugt einen `AuditEntry` mit `TRIAL_CONVERTED_TO_MEMBER`
- TrialParticipant-Profil wird **nicht** gelöscht

### Direktanlage

- Nur für Personen ohne Probetraining (z. B. Vereinswechsel, Vorstandseinladung)
- Standardgürtel: WEISS / 9. Kyu (überschreibbar)
- Erzeugt `AuditEntry` mit `DIRECT_MEMBER_CREATED`

### Vorstandsausnahme

- Nur DemoRole.BOARD darf erteilen
- Begründung ist Pflichtfeld
- Pro Person maximal eine Ausnahme
- Erzeugt `AuditEntry` mit `BOARD_OVERRIDE_GRANTED`

---

## Demo-Datensätze (Paket 1.3 Ergänzungen)

- `trial-005` (Mia Probetraining): wurde in Demo zu `member-41` umgewandelt
- `demoAuditEntries`: 3 fiktive Audit-Einträge (Umwandlung, Vorstandsausnahme, Direktanlage)

---

## Offene Punkte (Paket 1.4)

- Gürtelhistorie-Screen (vollständige Ansicht je Mitglied)
- Simulierter Bildvorschlag-Demo (Kameraauslöser + Farbanalyse-Simulation)
- Gürtelauswertung (Übersicht nach Gürteln, Prüfungsplanung)
