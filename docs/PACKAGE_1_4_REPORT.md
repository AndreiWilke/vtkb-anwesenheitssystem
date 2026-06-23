# Paket 1.4 – Gürtelverwaltung, Gürtelhistorie, simulierter Bildvorschlag, Gürtelauswertung

Stand: 2026-06-21 · Prototyp-Phase, keine Produktivdaten

---

## Überblick

Paket 1.4 baut auf Paket 1.3 auf und ergänzt die vollständige Gürtelverwaltung:

- **Gürtelhistorie-Screen**: vollständige Änderungshistorie je Mitglied, Prüfungshinweis
- **Gürtelanderungs-Dialog**: manuelle Gürteleintragung mit Validierung
- **Bildvorschlag-Review**: offene simulierte Farbvorschläge prüfen, bestätigen, ablehnen
- **Bildvorschlag-Simulation (Demo)**: deterministischer Zufallsgenerator statt echter Kamera
- **Gürtelauswertungsscreen**: Verteilung, Prüfungshinweise, offene Vorschläge, CSV-Export

---

## Neue Dateien

| Datei                               | Beschreibung                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/shared/test/belt.test.ts` | 36 Unit-Tests für belt.ts (Katalog, Validierung, Prüfungshinweis, Verteilung, Simulation)         |
| `apps/web/src/beltScreens.tsx`      | `BeltHistoryScreen`, `BeltChangeDialog`, `BeltSuggestionReviewScreen`, `BeltSimulationDemoScreen` |
| `apps/web/src/beltReportScreen.tsx` | `BeltReportScreen` mit Verteilungsdiagramm, Filter, Prüfungshinweisen, CSV-Export                 |
| `docs/PACKAGE_1_4_REPORT.md`        | Dieser Bericht                                                                                    |

---

## Geänderte Dateien

| Datei                           | Änderung                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/belt.ts`   | + `validateBeltChange`, `suggestNextBelt`, `BeltExamHint`, `calculateBeltDistribution`, `simulateBeltColorSuggestion`          |
| `apps/web/src/types.ts`         | + 4 neue AppScreens (BELT_HISTORY, BELT_CHANGE, BELT_REPORT, BELT_SIM_DEMO); + ReportingViews BELT_REPORT, BELT_HISTORY_DETAIL |
| `apps/web/src/reporting.ts`     | + `beltReportCsv`                                                                                                              |
| `apps/web/src/mockData.ts`      | + `beltHistoryExtended` (3 weitere fiktive Einträge)                                                                           |
| `apps/web/src/workflow.test.ts` | + 8 Paket-1.4-Tests                                                                                                            |
| `apps/web/src/styles.css`       | + Belt-Screen CSS (BeltBadge, BeltBar, Dialog, Notice-Varianten, btn--danger)                                                  |

---

## Fachregeln (PROJECT_RULES)

### Bildanalyse-Invarianten (UNVERÄNDERLICH)

- Die Bildanalyse darf AUSSCHLIESSLICH eine sichtbare Gürtelfarbe als Prüfhinweis vorschlagen.
- Die Bildanalyse darf NIEMALS einen Kyu- oder Dan-Grad bestimmen.
- Ohne ausdrückliche manuelle Bestätigung entsteht KEINE Gürteländerung.
- Jede bestätigte Änderung erzeugt einen unveränderlichen `BeltHistoryEntry`.
- `BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED` wird ausschließlich nach manueller Gradeingabe gesetzt.

### Demo-Simulation

- `simulateBeltColorSuggestion` ist ein deterministischer Zufallsgenerator (kein Modell, keine Kamera).
- Ergebnisse sind unverbindliche Prüfhinweise.
- Die Funktion ist mit `seed`-Parameter deterministisch (reproduzierbar für Tests).

### Gürtelkatalog

- `BELT_CATALOG` bildet die verbindliche Vereinsvorgabe mit 23 Stufen und 13 Farben ab.
- Prüfungshinweise von `suggestNextBelt` sind unverbindlich.

---

## Demo-Datensätze (Paket 1.4 Ergänzungen)

`beltHistoryExtended` – 3 weitere fiktive Gürteländerungen:

- `belt-0004`: member-03, GRUEN → BLAU / 5. Kyu (manuell)
- `belt-0005`: member-04, GELB → ORANGE / 7. Kyu (Vorstandskorrektur)
- `belt-0006`: member-10, GELB → ORANGE / 7. Kyu (Bildvorschlag bestätigt)

---

## Offene Punkte (Paket 2)

- Echte Kamera-Integration (React Native / PWA Camera API)
- Echtes Bilderkennungsmodell (serverside, DSGVO-konform)
- Prüfungsordnung durch VTKB e.V. definieren und in BELT_CATALOG übernehmen
- Prüfungsvoraussetzungen (Mindesttrainingseinheiten, Mindestalter etc.)
