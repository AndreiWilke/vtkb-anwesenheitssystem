/**
 * Fachlogik fuer Guertelaenderungen, Guertelhistorie und Bildvorschlaege.
 *
 * Der BELT_CATALOG ist der fuer diesen Projektstand verbindliche fachliche
 * Katalog. Aenderungen erfolgen nur nach ausdruecklicher Freigabe des Vereins.
 *
 * Fachregeln (PROJECT_RULES):
 *   - Bildanalyse darf nur eine sichtbare Guertelfarbe als Pruefhinweis vorschlagen.
 *   - Bildanalyse darf niemals einen Kyu- oder Dan-Grad bestimmen.
 *   - Ohne ausdrueckliche Bestaetigung entsteht keine Aenderung.
 *   - Jede bestaetigte Aenderung erzeugt einen unveraenderlichen Historieneintrag.
 */

import {
  BeltChangeSource,
  BeltSuggestionStatus,
  type BeltChangeSource as BeltChangeSourceValue,
  type BeltHistoryEntry,
  type BeltSuggestion,
  type BeltSuggestionStatus as BeltSuggestionStatusValue,
} from "./domain.js";
import { isValidIsoDate } from "./date.js";

// ---------------------------------------------------------------------------
// Verbindlicher Guertelkatalog dieses Projektstands
// ---------------------------------------------------------------------------

export interface BeltLevel {
  color: string;
  grade: string;
  sortOrder: number;
}

/**
 * Verbindlicher Guertelkatalog des VTKB Berlin (inkl. Zwischenstufen).
 */
export const BELT_CATALOG: readonly BeltLevel[] = [
  { color: "WEISS", grade: "10. Kyu", sortOrder: 1 },
  { color: "WEISS_ROT", grade: "9. Kyu", sortOrder: 2 },
  { color: "WEISS_GELB", grade: "9a. Kyu", sortOrder: 3 },
  { color: "GELB", grade: "8. Kyu", sortOrder: 4 },
  { color: "GELB_ORANGE", grade: "8a. Kyu", sortOrder: 5 },
  { color: "ORANGE", grade: "7. Kyu", sortOrder: 6 },
  { color: "ORANGE_GRUEN", grade: "7a. Kyu", sortOrder: 7 },
  { color: "GRUEN", grade: "6. Kyu", sortOrder: 8 },
  { color: "GRUEN_BLAU", grade: "6a. Kyu", sortOrder: 9 },
  { color: "BLAU", grade: "5. Kyu", sortOrder: 10 },
  { color: "VIOLETT", grade: "4. Kyu", sortOrder: 11 },
  { color: "BRAUN", grade: "3. Kyu", sortOrder: 12 },
  { color: "BRAUN", grade: "2. Kyu", sortOrder: 13 },
  { color: "BRAUN", grade: "1. Kyu", sortOrder: 14 },
  ...Array.from({ length: 9 }, (_, index) => ({
    color: "SCHWARZ",
    grade: `${index + 1}. Dan`,
    sortOrder: index + 15,
  })),
] as const;

export const BELT_COLORS = [
  "WEISS",
  "WEISS_ROT",
  "WEISS_GELB",
  "GELB",
  "GELB_ORANGE",
  "ORANGE",
  "ORANGE_GRUEN",
  "GRUEN",
  "GRUEN_BLAU",
  "BLAU",
  "VIOLETT",
  "BRAUN",
  "SCHWARZ",
] as const;

export type BeltColor = (typeof BELT_COLORS)[number];

export const BELT_LABELS: Record<BeltColor, string> = {
  WEISS: "Weiß",
  WEISS_ROT: "Weiß-Rot",
  WEISS_GELB: "Weiß-Gelb",
  GELB: "Gelb",
  GELB_ORANGE: "Gelb-Orange",
  ORANGE: "Orange",
  ORANGE_GRUEN: "Orange-Grün",
  GRUEN: "Grün",
  GRUEN_BLAU: "Grün-Blau",
  BLAU: "Blau",
  VIOLETT: "Violett",
  BRAUN: "Braun",
  SCHWARZ: "Schwarz",
};

export function gradesForColor(color: string): string[] {
  return BELT_CATALOG.filter((level) => level.color === color).map((level) => level.grade);
}

// ---------------------------------------------------------------------------
// Guertelaenderung erstellen
// ---------------------------------------------------------------------------

export interface BeltChangeInput {
  personId: string;
  previousBeltColor: string | null;
  previousBeltGrade: string | null;
  newBeltColor: string;
  newBeltGrade: string;
  effectiveFrom?: string;
  examDate?: string;
  examiner?: string;
  recordedBy: string;
  recordedAt: string;
  note?: string;
  source: BeltChangeSourceValue;
}

export function createBeltHistoryEntry(id: string, input: BeltChangeInput): BeltHistoryEntry {
  if (!id.trim()) throw new Error("Historieneintrag benötigt eine ID.");
  const validation = validateBeltChange(input);
  if (!validation.valid) throw new Error(validation.issues.join(" "));
  if (!input.personId.trim()) throw new Error("Personen-ID ist Pflicht.");
  if (!input.recordedBy.trim()) throw new Error("Erfassende Person ist Pflicht.");
  if (Number.isNaN(Date.parse(input.recordedAt))) {
    throw new Error("Erfassungszeitpunkt ist ungültig.");
  }
  return {
    id,
    personId: input.personId,
    previousBeltColor: input.previousBeltColor,
    previousBeltGrade: input.previousBeltGrade,
    newBeltColor: input.newBeltColor,
    newBeltGrade: input.newBeltGrade,
    ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
    ...(input.examDate !== undefined ? { examDate: input.examDate } : {}),
    ...(input.examiner !== undefined ? { examiner: input.examiner } : {}),
    recordedBy: input.recordedBy,
    recordedAt: input.recordedAt,
    ...(input.note !== undefined ? { note: input.note } : {}),
    source: input.source,
  };
}

// ---------------------------------------------------------------------------
// Bildvorschlag-Entscheidungen
// ---------------------------------------------------------------------------

export interface BeltSuggestionDecision {
  action: "CONFIRM" | "REJECT" | "DEFER" | "KEEP_STORED";
  historyEntryId?: string;
  decidedBy: string;
  decidedAt: string;
}

export function applyBeltSuggestionDecision(
  suggestion: BeltSuggestion,
  decision: BeltSuggestionDecision,
  historyEntries: readonly BeltHistoryEntry[] = [],
): BeltSuggestion {
  const statusMap: Record<BeltSuggestionDecision["action"], BeltSuggestionStatusValue> = {
    CONFIRM: BeltSuggestionStatus.CONFIRMED,
    REJECT: BeltSuggestionStatus.REJECTED,
    DEFER: BeltSuggestionStatus.DEFERRED,
    KEEP_STORED: BeltSuggestionStatus.REJECTED,
  };

  if (decision.action === "CONFIRM") {
    const historyEntry = historyEntries.find((entry) => entry.id === decision.historyEntryId);
    if (!historyEntry || historyEntry.personId !== suggestion.memberId) {
      throw new Error("Ein bestätigter Gürtelvorschlag benötigt einen passenden Historieneintrag.");
    }
  }
  return {
    ...suggestion,
    status: statusMap[decision.action],
    decidedBy: decision.decidedBy,
    decidedAt: decision.decidedAt,
    ...(decision.historyEntryId !== undefined ? { historyEntryId: decision.historyEntryId } : {}),
  };
}

/**
 * Bildvorschlaege aendern keine Stammdaten automatisch.
 * "CONFIRM" oeffnet den Guertelaenderungsdialog; ohne Bestaetigung dort
 * entsteht kein Historieneintrag.
 *
 * Quelle bei Bestaetigung ist immer IMAGE_SUGGESTION_CONFIRMED.
 */
export function beltSuggestionChangeSource(): BeltChangeSourceValue {
  return BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED;
}

// ---------------------------------------------------------------------------
// Offene Gurthinweise filtern
// ---------------------------------------------------------------------------

export function openBeltSuggestions(suggestions: readonly BeltSuggestion[]): BeltSuggestion[] {
  return suggestions.filter((suggestion) => suggestion.status === BeltSuggestionStatus.OPEN);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface BeltChangeValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Prueft eine Guertelaenderung auf fachliche Konsistenz.
 *
 * Regeln:
 *   - Neue Farbe und Grad muessen im verbindlichen BELT_CATALOG enthalten sein.
 *   - Grad muss zur Farbe passen.
 *   - Bildanalyse darf niemals einen Grad vorgeben (wird hier nicht geprueft –
 *     das ist eine UI-seitige Invariante).
 *   - effectiveFrom muss ein gueltiges ISO-Datum sein.
 */
export function validateBeltChange(input: BeltChangeInput): BeltChangeValidationResult {
  const issues: string[] = [];

  if (!input.newBeltColor.trim()) {
    issues.push("Guertelfarbe ist Pflicht.");
  }
  if (!input.newBeltGrade.trim()) {
    issues.push("Guertelgrad ist Pflicht.");
  }

  if (input.newBeltColor.trim() && input.newBeltGrade.trim()) {
    const validGrades = gradesForColor(input.newBeltColor);
    if (validGrades.length === 0) {
      issues.push(`Unbekannte Guertelfarbe: ${input.newBeltColor}.`);
    } else if (!validGrades.includes(input.newBeltGrade)) {
      issues.push(
        `Guertelgrad "${input.newBeltGrade}" passt nicht zu Farbe "${input.newBeltColor}". ` +
          `Gueltige Grade: ${validGrades.join(", ")}.`,
      );
    }
  }

  if (input.effectiveFrom && !isValidIsoDate(input.effectiveFrom)) {
    issues.push("Gueltig-ab-Datum muss ein gültiges Datum im Format JJJJ-MM-TT sein.");
  }
  if (input.examDate && !isValidIsoDate(input.examDate)) {
    issues.push("Prüfungsdatum muss ein gültiges Datum im Format JJJJ-MM-TT sein.");
  }

  if (
    input.newBeltColor === input.previousBeltColor &&
    input.newBeltGrade === input.previousBeltGrade
  ) {
    issues.push("Neue Farbe und Grad sind identisch mit den gespeicherten Werten.");
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Naechster Guertel (Pruefungshinweis)
// ---------------------------------------------------------------------------

export interface BeltExamHint {
  /** Aktueller Sortierindex im Katalog */
  currentSortOrder: number | null;
  /** Naechster Guertelschritt im verbindlichen Katalog */
  nextLevel: BeltLevel | null;
  /** true = hoechster bekannter Grad im verbindlichen Katalog */
  isHighest: boolean;
}

/**
 * Gibt einen unverbindlichen Pruefungshinweis auf den naechsten Gurt.
 * Der Hinweis basiert auf dem verbindlichen Katalog; die Pruefungsentscheidung
 * bleibt eine manuell zu bestaetigende Vereinsentscheidung.
 * Pruefungsvoraussetzungen (Trainingseinheiten, Mindestalter etc.) werden
 * in Paket 2+ durch den Verein definiert.
 */
export function suggestNextBelt(currentColor: string, currentGrade: string): BeltExamHint {
  const current = BELT_CATALOG.find(
    (level) => level.color === currentColor && level.grade === currentGrade,
  );
  if (!current) {
    return { currentSortOrder: null, nextLevel: null, isHighest: false };
  }
  const sorted = [...BELT_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextLevel = sorted.find((level) => level.sortOrder > current.sortOrder) ?? null;
  return {
    currentSortOrder: current.sortOrder,
    nextLevel,
    isHighest: nextLevel === null,
  };
}

// ---------------------------------------------------------------------------
// Gurtverteilung berechnen (fuer Auswertungen)
// ---------------------------------------------------------------------------

export interface BeltDistributionEntry {
  color: string;
  count: number;
  percent: number;
}

/**
 * Berechnet die Verteilung der Guertelfarben ueber eine Liste von Personen.
 * Gibt alle bekannten Farben zurueck, auch wenn count === 0.
 */
export function calculateBeltDistribution(beltColors: readonly string[]): BeltDistributionEntry[] {
  const total = beltColors.length;
  const counts = new Map<string, number>();
  for (const color of BELT_COLORS) counts.set(color, 0);
  for (const color of beltColors) {
    if (counts.has(color)) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return BELT_COLORS.map((color) => {
    const count = counts.get(color) ?? 0;
    return {
      color,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Simulierter Bildvorschlag (Demo-only)
// ---------------------------------------------------------------------------

/**
 * Simuliert eine Farbanalyse aus einem Demo-Bild.
 *
 * WICHTIG: Dies ist ein reiner Demo-Zufallsgenerator.
 * Kein echtes Modell, keine Kamera, keine biometrischen Daten.
 * Der zurueckgegebene Vorschlag ist immer als unverbindlicher Pruefhinweis
 * zu behandeln und benoetigt manuelle Bestaetigung.
 *
 * Grad wird NIEMALS vorgeschlagen (PROJECT_RULES).
 */
export function simulateBeltColorSuggestion(
  storedBeltColor: string,
  seed?: number,
): { suggestedColor: string; confidencePercent: number } {
  // Deterministisch wenn seed angegeben, sonst zufaellig
  const rng = seed !== undefined ? seed : Math.floor(Math.random() * 1000);

  // Mit ~60% Wahrscheinlichkeit "gleiche Farbe erkannt" (kein echter Vorschlag)
  // Mit ~30% "naechste Farbe" (echte Abweichung), ~10% "andere Farbe"
  const roll = rng % 10;

  const currentIdx = BELT_COLORS.indexOf(storedBeltColor as (typeof BELT_COLORS)[number]);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  let suggestedColor: string;
  let confidencePercent: number;

  if (roll < 6) {
    suggestedColor = storedBeltColor;
    confidencePercent = 75 + (rng % 20);
  } else if (roll < 9 && safeIdx < BELT_COLORS.length - 1) {
    suggestedColor = BELT_COLORS[safeIdx + 1]!;
    confidencePercent = 55 + (rng % 30);
  } else {
    suggestedColor = BELT_COLORS[(safeIdx + 2) % BELT_COLORS.length]!;
    confidencePercent = 35 + (rng % 25);
  }

  return { suggestedColor, confidencePercent };
}

// ---------------------------------------------------------------------------
// ID-Generator fuer Guertelhistorie
// ---------------------------------------------------------------------------

export function createBeltHistoryIdGenerator(existingIds: readonly string[]): () => string {
  const issued = new Set(existingIds);
  let seq = 1;
  return () => {
    let candidate = `belt-${String(seq).padStart(4, "0")}`;
    while (issued.has(candidate)) {
      seq += 1;
      candidate = `belt-${String(seq).padStart(4, "0")}`;
    }
    issued.add(candidate);
    seq += 1;
    return candidate;
  };
}
