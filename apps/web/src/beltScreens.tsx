/**
 * Paket 1.4 – Gürtelhistorie, Gürtelanderung, simulierter Bildvorschlag-Demo
 *
 * Screens:
 *   - BeltHistoryScreen: vollständige Gürtelhistorie je Mitglied
 *   - BeltChangeDialog: Formular für manuelle Gürtelanderung
 *   - BeltSuggestionReviewScreen: Bildvorschläge prüfen und bestätigen/ablehnen
 *   - BeltSimulationDemoScreen: simulierter Bildvorschlag (Demo-only, keine echte KI)
 *
 * FACHREGELN (PROJECT_RULES):
 *   - Bildanalyse darf nur eine sichtbare Gürtelsarbe als Prüfhinweis vorschlagen.
 *   - Bildanalyse darf NIEMALS einen Kyu- oder Dan-Grad bestimmen.
 *   - Ohne ausdrückliche Bestätigung entsteht KEINE Änderung.
 *   - Jede bestätigte Änderung erzeugt einen unveränderlichen Historieneintrag.
 */

import React, { useState } from "react";

import {
  BeltChangeSource,
  BeltSuggestionStatus,
  BELT_COLORS,
  applyBeltSuggestionDecision,
  createBeltHistoryEntry,
  createBeltHistoryIdGenerator,
  gradesForColor,
  simulateBeltColorSuggestion,
  suggestNextBelt,
  validateBeltChange,
} from "@vtkb/shared";

import type {
  BeltHistoryEntry,
  BeltSuggestion,
  Member,
} from "./types";

// ---------------------------------------------------------------------------
// BeltHistoryScreen
// ---------------------------------------------------------------------------

export interface BeltHistoryScreenProps {
  member: Member;
  history: readonly BeltHistoryEntry[];
  onBack: () => void;
  onChangesBelt: () => void;
  canEdit: boolean;
}

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

function BeltBadge({ color, grade }: { color: string; grade: string }) {
  const bg = BELT_COLOR_CSS[color] ?? "#ccc";
  const fg = BELT_TEXT_COLOR[color] ?? "#333";
  return (
    <span
      className="belt-badge"
      style={{ backgroundColor: bg, color: fg }}
    >
      {color} – {grade}
    </span>
  );
}

export function BeltHistoryScreen({
  member,
  history,
  onBack,
  onChangesBelt,
  canEdit,
}: BeltHistoryScreenProps) {
  const memberHistory = [...history]
    .filter((e) => e.personId === member.id)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  const hint = suggestNextBelt(member.beltColor, member.beltGrade);

  const sourceLabel: Record<string, string> = {
    MANUAL_CONFIRMED: "Manuell bestätigt",
    IMAGE_SUGGESTION_CONFIRMED: "Bildvorschlag bestätigt",
    BOARD_CORRECTION: "Vorstandskorrektur",
  };

  return (
    <div className="screen">
      <button className="btn-back" onClick={onBack}>← Zurück</button>
      <h2>Gürtelhistorie – {member.name}</h2>

      <div className="detail-section">
        <h3>Aktueller Gürtel</h3>
        <div className="belt-current">
          <BeltBadge color={member.beltColor} grade={member.beltGrade} />
        </div>
        {hint.isHighest ? (
          <p className="notice notice--success">
            Höchster Demo-Grad erreicht (3. Dan). Kein weiterer Prüfungshinweis verfügbar.
          </p>
        ) : hint.nextLevel ? (
          <p className="notice">
            Nächster Demo-Prüfungsschritt (unverbindlich):{" "}
            <strong>{hint.nextLevel.color} – {hint.nextLevel.grade}</strong>
          </p>
        ) : null}
      </div>

      {canEdit && (
        <div className="belt-actions">
          <button className="btn btn--primary" onClick={onChangesBelt}>
            Gürtel ändern
          </button>
        </div>
      )}

      <div className="detail-section">
        <h3>Änderungshistorie</h3>
        {memberHistory.length === 0 ? (
          <p className="notice">Noch keine Gürtelwechsel für dieses Mitglied gespeichert.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Vorher</th>
                <th>Nachher</th>
                <th>Quelle</th>
                <th>Prüfer</th>
                <th>Erfasst von</th>
              </tr>
            </thead>
            <tbody>
              {memberHistory.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.effectiveFrom}</td>
                  <td>
                    {entry.previousBeltColor ? (
                      <BeltBadge
                        color={entry.previousBeltColor}
                        grade={entry.previousBeltGrade ?? "–"}
                      />
                    ) : (
                      <span className="badge badge--neutral">Erstanlage</span>
                    )}
                  </td>
                  <td>
                    <BeltBadge color={entry.newBeltColor} grade={entry.newBeltGrade} />
                  </td>
                  <td>
                    <span className="badge">
                      {sourceLabel[entry.source] ?? entry.source}
                    </span>
                  </td>
                  <td>{entry.examiner ?? "–"}</td>
                  <td>{entry.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeltChangeDialog
// ---------------------------------------------------------------------------

export interface BeltChangeDialogProps {
  member: Member;
  existingHistoryIds: readonly string[];
  onConfirm: (entry: BeltHistoryEntry) => void;
  onCancel: () => void;
  actorName: string;
  suggestedColor?: string; // aus Bildvorschlag – Grad wird NIEMALS vorgegeben
}

export function BeltChangeDialog({
  member,
  existingHistoryIds,
  onConfirm,
  onCancel,
  actorName,
  suggestedColor,
}: BeltChangeDialogProps) {
  const [newColor, setNewColor] = useState(suggestedColor ?? member.beltColor);
  const [newGrade, setNewGrade] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [examDate, setExamDate] = useState("");
  const [examiner, setExaminer] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const availableGrades = gradesForColor(newColor);

  // Wenn Farbe wechselt, Grad zurücksetzen
  const handleColorChange = (color: string) => {
    setNewColor(color);
    setNewGrade("");
  };

  const handleSubmit = () => {
    const input = {
      personId: member.id,
      previousBeltColor: member.beltColor,
      previousBeltGrade: member.beltGrade,
      newBeltColor: newColor,
      newBeltGrade: newGrade,
      effectiveFrom,
      examDate: examDate || undefined,
      examiner: examiner.trim() || undefined,
      note: note.trim() || undefined,
      recordedBy: actorName,
      recordedAt: new Date().toISOString(),
      source: suggestedColor
        ? BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED
        : BeltChangeSource.MANUAL_CONFIRMED,
    };

    const validation = validateBeltChange(input);
    if (!validation.valid) {
      setErrors(validation.issues);
      return;
    }

    const nextId = createBeltHistoryIdGenerator([...existingHistoryIds]);
    const entry = createBeltHistoryEntry(nextId(), input);
    onConfirm(entry);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <h3>Gürtel ändern – {member.name}</h3>

        {suggestedColor && (
          <div className="notice notice--info">
            <strong>Hinweis:</strong> Diese Änderung basiert auf einem simulierten
            Bildvorschlag (Farbe: {suggestedColor}). Der Grad muss manuell bestätigt werden.
            Bildanalyse bestimmt niemals den Kyu-/Dan-Grad.
          </div>
        )}

        <div className="form-field">
          <label>Neue Farbe</label>
          <select value={newColor} onChange={(e) => handleColorChange(e.target.value)}>
            {BELT_COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Neuer Grad</label>
          {availableGrades.length === 0 ? (
            <p className="notice notice--warn">Unbekannte Farbe – keine Grade verfügbar.</p>
          ) : (
            <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
              <option value="">– bitte wählen –</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-field">
          <label>Gültig ab</label>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Prüfungsdatum (optional)</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Prüfer (optional)</label>
          <input
            type="text"
            value={examiner}
            placeholder="Name des Prüfers (fiktiv)"
            onChange={(e) => setExaminer(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Notiz (optional)</label>
          <textarea
            className="form-field__textarea"
            value={note}
            placeholder="Ergänzende Hinweise zur Änderung"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {errors.length > 0 && (
          <div className="notice notice--error">
            <strong>Fehler:</strong>
            <ul>
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn btn--secondary" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            Änderung speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeltSuggestionReviewScreen
// ---------------------------------------------------------------------------

export interface BeltSuggestionReviewScreenProps {
  suggestions: readonly BeltSuggestion[];
  members: readonly Member[];
  existingHistoryIds: readonly string[];
  onDecide: (
    updated: BeltSuggestion,
    newHistoryEntry: BeltHistoryEntry | null,
  ) => void;
  onBack: () => void;
  actorName: string;
  canEdit: boolean;
}

export function BeltSuggestionReviewScreen({
  suggestions,
  members,
  existingHistoryIds,
  onDecide,
  onBack,
  actorName,
  canEdit,
}: BeltSuggestionReviewScreenProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<BeltSuggestion | null>(null);
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  const openSuggestions = suggestions.filter(
    (s) => s.status === BeltSuggestionStatus.OPEN,
  );
  const closedSuggestions = suggestions.filter(
    (s) => s.status !== BeltSuggestionStatus.OPEN,
  );

  const memberById = (id: string) => members.find((m) => m.id === id);

  const handleDefer = (suggestion: BeltSuggestion) => {
    const updated = applyBeltSuggestionDecision(suggestion, {
      action: "DEFER",
      decidedBy: actorName,
      decidedAt: new Date().toISOString(),
    });
    onDecide(updated, null);
  };

  const handleReject = (suggestion: BeltSuggestion) => {
    const updated = applyBeltSuggestionDecision(suggestion, {
      action: "REJECT",
      decidedBy: actorName,
      decidedAt: new Date().toISOString(),
    });
    onDecide(updated, null);
  };

  const handleConfirmStart = (suggestion: BeltSuggestion) => {
    setActiveSuggestion(suggestion);
    setShowChangeDialog(true);
  };

  const handleBeltChangeConfirmed = (entry: BeltHistoryEntry) => {
    if (!activeSuggestion) return;
    const updated = applyBeltSuggestionDecision(activeSuggestion, {
      action: "CONFIRM",
      decidedBy: actorName,
      decidedAt: new Date().toISOString(),
      historyEntryId: entry.id,
    });
    onDecide(updated, entry);
    setShowChangeDialog(false);
    setActiveSuggestion(null);
  };

  const statusLabel: Record<string, string> = {
    OPEN: "Offen",
    CONFIRMED: "Bestätigt",
    REJECTED: "Abgelehnt",
    DEFERRED: "Zurückgestellt",
  };

  const confidenceClass = (pct: number) =>
    pct >= 75 ? "badge--ok" : pct >= 55 ? "badge--neutral" : "badge--warn";

  return (
    <div className="screen">
      <button className="btn-back" onClick={onBack}>← Zurück</button>
      <h2>Bildvorschläge Gürtelfarbe</h2>

      <div className="notice notice--info">
        <strong>Demo-Modus:</strong> Die folgenden Farbvorschläge stammen aus einem
        simulierten Bilderkennungs-Demo (keine echte KI). Kein Grad wird vorgeschlagen –
        das ist bewusste Fachlogik. Bestätigungen erfordern manuelle Gradeingabe.
      </div>

      <h3>Offene Vorschläge ({openSuggestions.length})</h3>
      {openSuggestions.length === 0 ? (
        <p className="notice">Keine offenen Bildvorschläge.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Mitglied</th>
              <th>Gespeichert</th>
              <th>Vorschlag</th>
              <th>Konfidenz</th>
              <th>Sitzung</th>
              {canEdit && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {openSuggestions.map((s) => {
              const m = memberById(s.memberId);
              return (
                <tr key={s.id}>
                  <td>{m?.name ?? s.memberId}</td>
                  <td>
                    <BeltBadge color={s.storedBeltColor} grade={m?.beltGrade ?? "–"} />
                  </td>
                  <td>
                    <BeltBadge color={s.suggestedBeltColor} grade="(Grad offen)" />
                  </td>
                  <td>
                    <span className={`badge ${confidenceClass(s.confidencePercent)}`}>
                      {s.confidencePercent}%
                    </span>
                  </td>
                  <td>{s.sessionDate}</td>
                  {canEdit && (
                    <td>
                      <div className="belt-suggestion-actions">
                        <button
                          className="btn-sm btn--primary"
                          onClick={() => handleConfirmStart(s)}
                        >
                          Bestätigen
                        </button>
                        <button
                          className="btn-sm btn--secondary"
                          onClick={() => handleDefer(s)}
                        >
                          Zurückstellen
                        </button>
                        <button
                          className="btn-sm btn--danger"
                          onClick={() => handleReject(s)}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3>Abgeschlossene Vorschläge ({closedSuggestions.length})</h3>
      {closedSuggestions.length === 0 ? (
        <p className="notice">Keine abgeschlossenen Bildvorschläge.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Mitglied</th>
              <th>Vorschlag</th>
              <th>Status</th>
              <th>Entschieden von</th>
              <th>Sitzung</th>
            </tr>
          </thead>
          <tbody>
            {closedSuggestions.map((s) => {
              const m = memberById(s.memberId);
              return (
                <tr key={s.id}>
                  <td>{m?.name ?? s.memberId}</td>
                  <td>
                    <BeltBadge color={s.suggestedBeltColor} grade="(Grad)" />
                  </td>
                  <td>
                    <span className="badge">{statusLabel[s.status] ?? s.status}</span>
                  </td>
                  <td>{s.decidedBy ?? "–"}</td>
                  <td>{s.sessionDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showChangeDialog && activeSuggestion && (
        <BeltChangeDialog
          member={
            memberById(activeSuggestion.memberId) ?? {
              id: activeSuggestion.memberId,
              name: activeSuggestion.memberId,
              initials: "?",
              ageGroup: "ERWACHSEN",
              beltColor: activeSuggestion.storedBeltColor as Member["beltColor"],
              beltGrade: "9. Kyu",
              qualification: "NONE",
              active: true,
              trainingsVisited: 0,
              responsibleAssignments: 0,
              assistantAssignments: 0,
            }
          }
          existingHistoryIds={existingHistoryIds}
          onConfirm={handleBeltChangeConfirmed}
          onCancel={() => {
            setShowChangeDialog(false);
            setActiveSuggestion(null);
          }}
          actorName={actorName}
          suggestedColor={activeSuggestion.suggestedBeltColor}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeltSimulationDemoScreen
// ---------------------------------------------------------------------------

export interface BeltSimulationDemoScreenProps {
  members: readonly Member[];
  onBack: () => void;
  onSuggestionCreated: (suggestion: BeltSuggestion) => void;
}

let demoSuggestionSeq = 100;

export function BeltSimulationDemoScreen({
  members,
  onBack,
  onSuggestionCreated,
}: BeltSimulationDemoScreenProps) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [simulationResult, setSimulationResult] = useState<{
    color: string;
    confidence: number;
  } | null>(null);
  const [suggestionCreated, setSuggestionCreated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleSimulate = () => {
    if (!selectedMember) return;
    setIsSimulating(true);
    setSuggestionCreated(false);

    // Kurzpause für Demo-Feedback (simuliert Analyse-Latenz)
    setTimeout(() => {
      const seed = Math.floor(Math.random() * 1000);
      const result = simulateBeltColorSuggestion(selectedMember.beltColor, seed);
      setSimulationResult(result);
      setIsSimulating(false);
    }, 600);
  };

  const handleCreateSuggestion = () => {
    if (!selectedMember || !simulationResult) return;
    demoSuggestionSeq += 1;
    const suggestion: BeltSuggestion = {
      id: `bsugg-demo-${demoSuggestionSeq}`,
      sessionId: "demo-session",
      sessionDate: new Date().toISOString().slice(0, 10),
      memberId: selectedMember.id,
      storedBeltColor: selectedMember.beltColor,
      suggestedBeltColor: simulationResult.color,
      confidencePercent: simulationResult.confidence,
      status: BeltSuggestionStatus.OPEN,
    };
    onSuggestionCreated(suggestion);
    setSuggestionCreated(true);
  };

  const confidenceClass = (pct: number) =>
    pct >= 75 ? "badge--ok" : pct >= 55 ? "badge--neutral" : "badge--warn";

  const isSameColor =
    simulationResult && selectedMember?.beltColor === simulationResult.color;

  return (
    <div className="screen">
      <button className="btn-back" onClick={onBack}>← Zurück</button>
      <h2>Bildvorschlag simulieren (Demo)</h2>

      <div className="notice notice--info">
        <strong>Demo-Erklärung:</strong> Dieser Screen simuliert eine Gürtelfarbanalyse
        aus Fotos. In einem echten System würde hier ein Kamerabild ausgewertet.
        Im Demo-Prototyp wird ein deterministischer Zufallswert erzeugt.{" "}
        <strong>Kein Grad wird vorgeschlagen</strong> – das ist eine unveränderliche
        Fachsregel. Bildanalyse liefert nur eine Farbhypothese.
      </div>

      <div className="form-field">
        <label>Mitglied auswählen</label>
        <select
          value={selectedMemberId}
          onChange={(e) => {
            setSelectedMemberId(e.target.value);
            setSimulationResult(null);
            setSuggestionCreated(false);
          }}
        >
          <option value="">– bitte wählen –</option>
          {members
            .filter((m) => m.active)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.beltColor} – {m.beltGrade})
              </option>
            ))}
        </select>
      </div>

      {selectedMember && (
        <div className="belt-sim-member">
          <p>
            Gespeicherter Gürtel:{" "}
            <BeltBadge color={selectedMember.beltColor} grade={selectedMember.beltGrade} />
          </p>
        </div>
      )}

      <div className="belt-actions">
        <button
          className="btn btn--primary"
          onClick={handleSimulate}
          disabled={!selectedMemberId || isSimulating}
        >
          {isSimulating ? "Analysiere (Demo)…" : "Farbanalyse starten (Demo)"}
        </button>
      </div>

      {simulationResult && selectedMember && (
        <div className="belt-sim-result">
          <h3>Analyse-Ergebnis</h3>
          <p>
            Erkannte Farbe:{" "}
            <BeltBadge color={simulationResult.color} grade="(Grad offen)" />
          </p>
          <p>
            Konfidenz:{" "}
            <span className={`badge ${confidenceClass(simulationResult.confidence)}`}>
              {simulationResult.confidence}%
            </span>
          </p>

          {isSameColor ? (
            <div className="notice notice--success">
              Vorschlag stimmt mit gespeicherter Farbe überein – kein Handlungsbedarf.
            </div>
          ) : (
            <div className="notice notice--warn">
              Abweichende Farbe erkannt. Manueller Prüfschritt erforderlich.
            </div>
          )}

          <p className="notice">
            <strong>Wichtig:</strong> Kein Grad wird aus der Bildanalyse abgeleitet.
            Bei Bestätigung muss der Grad manuell eingegeben werden.
          </p>

          {!suggestionCreated ? (
            <button
              className="btn btn--secondary"
              onClick={handleCreateSuggestion}
            >
              Als offenen Vorschlag speichern
            </button>
          ) : (
            <div className="notice notice--success">
              Vorschlag gespeichert – jetzt im Bildvorschlag-Review sichtbar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
