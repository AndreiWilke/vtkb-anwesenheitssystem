/**
 * Paket 1.4 – Gürtelauswertungsscreen
 *
 * Übersicht der Gürtelverteilung, Prüfungshinweise, offene Bildvorschläge,
 * und CSV-Export.
 */

import React, { useState } from "react";

import {
  BeltSuggestionStatus,
  BELT_COLORS,
  calculateBeltDistribution,
  openBeltSuggestions,
  suggestNextBelt,
} from "@vtkb/shared";

import type { BeltHistoryEntry, BeltSuggestion, Member } from "./types";
import { beltReportCsv } from "./reporting";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const BELT_COLOR_CSS: Record<string, string> = {
  WEISS: "#f5f5f5",
  GELB: "#f5e642",
  ORANGE: "#f5a623",
  GRUEN: "#4caf50",
  BLAU: "#2196f3",
  BRAUN: "#795548",
  SCHWARZ: "#212121",
};

const BELT_TEXT_COLOR: Record<string, string> = {
  WEISS: "#333",
  GELB: "#333",
  ORANGE: "#333",
  GRUEN: "#fff",
  BLAU: "#fff",
  BRAUN: "#fff",
  SCHWARZ: "#fff",
};

function BeltColorBar({ color, percent }: { color: string; percent: number }) {
  const bg = BELT_COLOR_CSS[color] ?? "#ccc";
  const fg = BELT_TEXT_COLOR[color] ?? "#333";
  return (
    <div className="belt-bar-row">
      <span className="belt-bar-label">{color}</span>
      <div className="belt-bar-track">
        <div
          className="belt-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: bg }}
        />
      </div>
      <span className="belt-bar-pct" style={{ color: fg !== "#fff" ? "#333" : undefined }}>
        {percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeltReportScreen
// ---------------------------------------------------------------------------

export interface BeltReportScreenProps {
  members: readonly Member[];
  beltHistory: readonly BeltHistoryEntry[];
  beltSuggestions: readonly BeltSuggestion[];
  onBack: () => void;
  onMemberSelect?: (memberId: string) => void;
}

type FilterMode = "ALL" | "EXAM_HINT" | "OPEN_SUGGESTIONS";

export function BeltReportScreen({
  members,
  beltHistory,
  beltSuggestions,
  onBack,
  onMemberSelect,
}: BeltReportScreenProps) {
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [searchText, setSearchText] = useState("");

  const activeMembers = members.filter((m) => m.active);

  // Gürtelverteilung
  const distribution = calculateBeltDistribution(activeMembers.map((m) => m.beltColor));

  // Prüfungshinweise
  const examHints = activeMembers
    .filter((m) => {
      const hint = suggestNextBelt(m.beltColor, m.beltGrade);
      return !hint.isHighest;
    })
    .map((m) => {
      const hint = suggestNextBelt(m.beltColor, m.beltGrade);
      return { member: m, nextLevel: hint.nextLevel };
    });

  // Offene Bildvorschläge
  const openSuggestions = openBeltSuggestions(beltSuggestions);
  const openMemberIds = new Set(openSuggestions.map((s) => s.memberId));

  // Letzte Gürteländerung je Mitglied
  const lastBeltChange = (memberId: string): string | null => {
    const entries = beltHistory
      .filter((e) => e.personId === memberId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return entries[0]?.effectiveFrom ?? null;
  };

  // Gefilterte + gesuchte Mitglieder
  const filteredMembers = activeMembers.filter((m) => {
    const search = searchText.toLowerCase();
    const matchesSearch = !search || m.name.toLowerCase().includes(search);
    if (!matchesSearch) return false;

    if (filter === "EXAM_HINT") {
      const hint = suggestNextBelt(m.beltColor, m.beltGrade);
      return !hint.isHighest;
    }
    if (filter === "OPEN_SUGGESTIONS") {
      return openMemberIds.has(m.id);
    }
    return true;
  });

  const handleDownloadCsv = () => {
    const csvContent = beltReportCsv(members, beltHistory, beltSuggestions);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guertel-auswertung-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen">
      <button className="btn-back" onClick={onBack}>← Zurück</button>
      <h2>Gürtelauswertung</h2>

      {/* Kennzahlen */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card__value">{activeMembers.length}</div>
          <div className="metric-card__label">Aktive Mitglieder</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__value">{openSuggestions.length}</div>
          <div className="metric-card__label">Offene Bildvorschläge</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__value">{examHints.length}</div>
          <div className="metric-card__label">Mitglieder mit Prüfungshinweis</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__value">
            {beltHistory.filter((e) => e.source === "IMAGE_SUGGESTION_CONFIRMED").length}
          </div>
          <div className="metric-card__label">Bildvorschläge bestätigt</div>
        </div>
      </div>

      {/* Gürtelverteilung */}
      <div className="detail-section">
        <h3>Gürtelverteilung (aktive Mitglieder)</h3>
        <div className="belt-distribution">
          {distribution.map((entry) => (
            <div key={entry.color} className="belt-dist-row">
              <BeltColorBar color={entry.color} percent={entry.percent} />
              <span className="belt-dist-count">{entry.count} Mitglieder</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Suche */}
      <div className="report-controls">
        <div className="filter-tabs">
          {(["ALL", "EXAM_HINT", "OPEN_SUGGESTIONS"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              className={`filter-tab ${filter === mode ? "filter-tab--active" : ""}`}
              onClick={() => setFilter(mode)}
            >
              {mode === "ALL" && `Alle (${activeMembers.length})`}
              {mode === "EXAM_HINT" && `Prüfungshinweis (${examHints.length})`}
              {mode === "OPEN_SUGGESTIONS" && `Offene Vorschläge (${openSuggestions.length})`}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Name suchen…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button className="btn btn--secondary btn-sm" onClick={handleDownloadCsv}>
          CSV exportieren
        </button>
      </div>

      {/* Tabelle */}
      <div className="report-count">
        {filteredMembers.length} Mitglieder angezeigt
      </div>

      {filteredMembers.length === 0 ? (
        <p className="notice">Keine Mitglieder für diese Filterauswahl.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Altersgruppe</th>
              <th>Gürtel</th>
              <th>Prüfungshinweis</th>
              <th>Letzter Wechsel</th>
              <th>Bildvorschlag</th>
              {onMemberSelect && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => {
              const hint = suggestNextBelt(m.beltColor, m.beltGrade);
              const hasOpenSuggestion = openMemberIds.has(m.id);
              const lastChange = lastBeltChange(m.id);
              return (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.gender === "WEIBLICH" ? "W" : "M"}</td>
                  <td>
                    <span
                      className="belt-badge"
                      style={{
                        backgroundColor: BELT_COLOR_CSS[m.beltColor] ?? "#ccc",
                        color: BELT_TEXT_COLOR[m.beltColor] ?? "#333",
                      }}
                    >
                      {m.beltColor} – {m.beltGrade}
                    </span>
                  </td>
                  <td>
                    {hint.isHighest ? (
                      <span className="badge badge--ok">Höchster Grad</span>
                    ) : hint.nextLevel ? (
                      <span className="badge badge--neutral">
                        → {hint.nextLevel.color} {hint.nextLevel.grade}
                      </span>
                    ) : (
                      <span className="badge">–</span>
                    )}
                  </td>
                  <td>{lastChange ?? "–"}</td>
                  <td>
                    {hasOpenSuggestion ? (
                      <span className="badge badge--warn">Offen</span>
                    ) : (
                      <span className="badge badge--ok">–</span>
                    )}
                  </td>
                  {onMemberSelect && (
                    <td>
                      <button
                        className="btn-sm btn--secondary"
                        onClick={() => onMemberSelect(m.id)}
                      >
                        Gürtelhistorie
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
