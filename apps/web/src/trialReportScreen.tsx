/**
 * Paket 1.3 – Probetraining-Auswertungsscreen
 *
 * Zeigt aggregierte Kennzahlen (TrialDashboardMetrics), eine gefilterte
 * Teilnehmerliste mit Einheitenzaehlung und bietet CSV-Export.
 *
 * Keine Echtdaten, keine biometrischen Daten, keine Kinderbilder.
 */

import React, { useMemo, useState } from "react";

import type { HistoricalTrainingSession, TrialParticipant } from "./types";
import {
  buildTrialSummaries,
  trialCsv,
  trialDashboardMetrics,
  type TrialSummary,
} from "./reporting";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`metric-card${highlight ? " metric-card--warn" : ""}`}>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__label">{label}</div>
    </div>
  );
}

type FilterMode = "ALL" | "ACTIVE" | "BLOCKED" | "CONTRACT_PENDING" | "CONVERTED";

// ---------------------------------------------------------------------------
// TrialReportScreen
// ---------------------------------------------------------------------------

interface TrialReportScreenProps {
  participants: readonly TrialParticipant[];
  history: readonly HistoricalTrainingSession[];
  currentYear?: number;
  onSelectParticipant: (id: string) => void;
  onBack: () => void;
}

export function TrialReportScreen({
  participants,
  history,
  currentYear = new Date().getFullYear(),
  onSelectParticipant,
  onBack,
}: TrialReportScreenProps) {
  const [filter, setFilter] = useState<FilterMode>("ACTIVE");
  const [search, setSearch] = useState("");

  const summaries = useMemo(
    () => buildTrialSummaries(participants, history),
    [participants, history],
  );

  const metrics = useMemo(
    () => trialDashboardMetrics(summaries, currentYear),
    [summaries, currentYear],
  );

  const displayed = useMemo<TrialSummary[]>(() => {
    let filtered = summaries;

    switch (filter) {
      case "ACTIVE":
        filtered = summaries.filter(
          (s) => s.participant.active && s.participant.membershipStatus === "TRIAL",
        );
        break;
      case "BLOCKED":
        filtered = summaries.filter((s) => s.isBlocked);
        break;
      case "CONTRACT_PENDING":
        filtered = summaries.filter(
          (s) => s.participant.active && s.hasPendingContract && s.attended >= 3,
        );
        break;
      case "CONVERTED":
        filtered = summaries.filter((s) => s.participant.membershipStatus === "ACTIVE_MEMBER");
        break;
      default:
        break;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        s.participant.displayName.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [summaries, filter, search]);

  function handleExport() {
    const csv = trialCsv(displayed);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `probetraining-auswertung-${date}.csv`);
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>← Zurück</button>
        <h1>Probetraining-Auswertung</h1>
        <button className="btn-secondary btn-sm" onClick={handleExport}>
          CSV
        </button>
      </header>

      {/* Kennzahlen */}
      <div className="metrics-row">
        <MetricCard label="Aktive Probanden" value={metrics.totalActive} />
        <MetricCard label="Gesperrt" value={metrics.blocked} highlight={metrics.blocked > 0} />
        <MetricCard label="Vertrag ausstehend" value={metrics.contractPending} highlight={metrics.contractPending > 0} />
        <MetricCard label="Umgewandelt" value={metrics.convertedThisYear} />
      </div>

      {/* Filter + Suche */}
      <div className="report-controls">
        <div className="filter-tabs">
          {(["ACTIVE", "BLOCKED", "CONTRACT_PENDING", "CONVERTED", "ALL"] as FilterMode[]).map(
            (f) => (
              <button
                key={f}
                className={`filter-tab${filter === f ? " filter-tab--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "ACTIVE"
                  ? "Aktiv"
                  : f === "BLOCKED"
                  ? "Gesperrt"
                  : f === "CONTRACT_PENDING"
                  ? "Vertrag"
                  : f === "CONVERTED"
                  ? "Umgewandelt"
                  : "Alle"}
              </button>
            ),
          )}
        </div>

        <input
          className="search-input"
          type="search"
          placeholder="Name suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Teilnehmer suchen"
        />
      </div>

      {/* Tabelle */}
      <div className="report-table-wrapper">
        {displayed.length === 0 ? (
          <p className="trial-list__empty">Keine Einträge für diese Ansicht.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Geschlecht</th>
                <th>Einheiten</th>
                <th>Vertrag</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(({ participant, attended, remaining, isBlocked }) => (
                <tr
                  key={participant.id}
                  className={`report-table__row${isBlocked ? " report-table__row--blocked" : ""}`}
                  onClick={() => onSelectParticipant(participant.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="report-table__name">{participant.displayName}</td>
                  <td>{participant.gender === "WEIBLICH" ? "W" : "M"}</td>
                  <td>
                    <span
                      className={`trial-count${attended >= 4 ? " trial-count--full" : ""}`}
                      title={`${remaining} verbleibend`}
                    >
                      {attended}/4
                    </span>
                  </td>
                  <td className="report-table__contract">
                    {participant.contractStatus === "NOT_ISSUED" && "–"}
                    {participant.contractStatus === "ISSUED" && "Ausgestellt"}
                    {participant.contractStatus === "RECEIVED" && "✓ Eingegangen"}
                    {participant.contractStatus === "MEMBERSHIP_ACTIVATED" && "✓ Aktiviert"}
                  </td>
                  <td>
                    {participant.membershipStatus === "ACTIVE_MEMBER" ? (
                      <span className="badge badge--ok">Mitglied</span>
                    ) : isBlocked ? (
                      <span className="badge badge--error">Gesperrt</span>
                    ) : (
                      <span className="badge badge--neutral">Probe</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="report-count">{displayed.length} Einträge</p>
    </div>
  );
}
