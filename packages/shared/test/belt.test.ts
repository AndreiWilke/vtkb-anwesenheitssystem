import { describe, expect, it } from "vitest";

import { BeltChangeSource, BeltSuggestionStatus } from "../src/index.js";
import {
  BELT_CATALOG,
  BELT_COLORS,
  applyBeltSuggestionDecision,
  calculateBeltDistribution,
  createBeltHistoryEntry,
  createBeltHistoryIdGenerator,
  gradesForColor,
  openBeltSuggestions,
  simulateBeltColorSuggestion,
  suggestNextBelt,
  validateBeltChange,
} from "../src/belt.js";

// ---------------------------------------------------------------------------
// BELT_CATALOG
// ---------------------------------------------------------------------------

describe("BELT_CATALOG", () => {
  it("enthaelt exakt 23 Vereinsstufen", () => {
    expect(BELT_CATALOG).toHaveLength(23);
  });

  it("hat aufsteigende sortOrder-Werte", () => {
    const orders = [...BELT_CATALOG].map((level) => level.sortOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]!).toBeGreaterThan(orders[i - 1]!);
    }
  });

  it("enthaelt exakt 13 Guertelfarben", () => {
    expect(BELT_COLORS).toHaveLength(13);
    const colors = new Set(BELT_CATALOG.map((level) => level.color));
    for (const color of BELT_COLORS) {
      expect(colors.has(color)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// gradesForColor
// ---------------------------------------------------------------------------

describe("gradesForColor", () => {
  it("gibt einen Grad fuer WEISS zurueck", () => {
    expect(gradesForColor("WEISS")).toEqual(["10. Kyu"]);
  });

  it("gibt drei Grade fuer BRAUN zurueck", () => {
    expect(gradesForColor("BRAUN")).toEqual(["3. Kyu", "2. Kyu", "1. Kyu"]);
  });

  it("bildet die Vereinsvorgaben an den Übergängen exakt ab", () => {
    expect(BELT_CATALOG.slice(0, 11).map(({ color, grade }) => [color, grade])).toEqual([
      ["WEISS", "10. Kyu"],
      ["WEISS_ROT", "9. Kyu"],
      ["WEISS_GELB", "9a. Kyu"],
      ["GELB", "8. Kyu"],
      ["GELB_ORANGE", "8a. Kyu"],
      ["ORANGE", "7. Kyu"],
      ["ORANGE_GRUEN", "7a. Kyu"],
      ["GRUEN", "6. Kyu"],
      ["GRUEN_BLAU", "6a. Kyu"],
      ["BLAU", "5. Kyu"],
      ["VIOLETT", "4. Kyu"],
    ]);
    expect(gradesForColor("SCHWARZ")).toEqual(
      Array.from({ length: 9 }, (_, index) => `${index + 1}. Dan`),
    );
  });

  it("gibt leeres Array fuer unbekannte Farbe", () => {
    expect(gradesForColor("LILA")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateBeltChange
// ---------------------------------------------------------------------------

describe("validateBeltChange", () => {
  const baseInput = {
    personId: "member-01",
    previousBeltColor: "ORANGE",
    previousBeltGrade: "7. Kyu",
    newBeltColor: "GRUEN",
    newBeltGrade: "6. Kyu",
    effectiveFrom: "2026-06-21",
    recordedBy: "Trainer Demo",
    recordedAt: "2026-06-21T19:00:00.000Z",
    source: BeltChangeSource.MANUAL_CONFIRMED,
  };

  it("akzeptiert eine gueltige Aenderung", () => {
    const result = validateBeltChange(baseInput);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("lehnt leere Guertelfarbe ab", () => {
    const result = validateBeltChange({ ...baseInput, newBeltColor: "" });
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("Pflicht");
  });

  it("lehnt leeren Guertelgrad ab", () => {
    const result = validateBeltChange({ ...baseInput, newBeltGrade: "" });
    expect(result.valid).toBe(false);
  });

  it("lehnt unbekannte Guertelfarbe ab", () => {
    const result = validateBeltChange({ ...baseInput, newBeltColor: "LILA" });
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("LILA");
  });

  it("lehnt Grad ab der nicht zur Farbe passt", () => {
    const result = validateBeltChange({
      ...baseInput,
      newBeltColor: "WEISS",
      newBeltGrade: "5. Kyu",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("passt nicht");
  });

  it("lehnt ungültiges Datum ab", () => {
    const result = validateBeltChange({ ...baseInput, effectiveFrom: "21.06.2026" });
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("JJJJ-MM-TT");
  });

  it("lehnt identische Farbe und Grad ab", () => {
    const result = validateBeltChange({
      ...baseInput,
      newBeltColor: "ORANGE",
      newBeltGrade: "7. Kyu",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("identisch");
  });
});

// ---------------------------------------------------------------------------
// createBeltHistoryEntry
// ---------------------------------------------------------------------------

describe("createBeltHistoryEntry", () => {
  it("erstellt einen korrekten Historieneintrag", () => {
    const entry = createBeltHistoryEntry("belt-0001", {
      personId: "member-01",
      previousBeltColor: "GRUEN",
      previousBeltGrade: "7. Kyu",
      newBeltColor: "BLAU",
      newBeltGrade: "6. Kyu",
      effectiveFrom: "2026-06-21",
      recordedBy: "Trainer Demo",
      recordedAt: "2026-06-21T19:00:00.000Z",
      source: BeltChangeSource.MANUAL_CONFIRMED,
    });
    expect(entry.id).toBe("belt-0001");
    expect(entry.newBeltColor).toBe("BLAU");
    expect(entry.previousBeltColor).toBe("GRUEN");
  });

  it("wirft bei leerer Guertelfarbe", () => {
    expect(() =>
      createBeltHistoryEntry("x", {
        personId: "p1",
        previousBeltColor: null,
        previousBeltGrade: null,
        newBeltColor: "",
        newBeltGrade: "9. Kyu",
        effectiveFrom: "2026-01-01",
        recordedBy: "x",
        recordedAt: "2026-01-01T00:00:00.000Z",
        source: BeltChangeSource.MANUAL_CONFIRMED,
      }),
    ).toThrow("Guertelfarbe");
  });

  it("wirft bei leerem Guertelgrad", () => {
    expect(() =>
      createBeltHistoryEntry("x", {
        personId: "p1",
        previousBeltColor: null,
        previousBeltGrade: null,
        newBeltColor: "WEISS",
        newBeltGrade: "",
        effectiveFrom: "2026-01-01",
        recordedBy: "x",
        recordedAt: "2026-01-01T00:00:00.000Z",
        source: BeltChangeSource.MANUAL_CONFIRMED,
      }),
    ).toThrow("Guertelgrad");
  });
});

// ---------------------------------------------------------------------------
// suggestNextBelt
// ---------------------------------------------------------------------------

describe("suggestNextBelt", () => {
  it("schlaegt WEISS_ROT nach WEISS vor", () => {
    const hint = suggestNextBelt("WEISS", "10. Kyu");
    expect(hint.nextLevel?.color).toBe("WEISS_ROT");
    expect(hint.isHighest).toBe(false);
  });

  it("markiert 9. Dan als hoechsten Grad", () => {
    const hint = suggestNextBelt("SCHWARZ", "9. Dan");
    expect(hint.nextLevel).toBeNull();
    expect(hint.isHighest).toBe(true);
  });

  it("gibt null zurueck bei unbekannter Farbe/Grad-Kombination", () => {
    const hint = suggestNextBelt("LILA", "99. Kyu");
    expect(hint.currentSortOrder).toBeNull();
    expect(hint.nextLevel).toBeNull();
  });

  it("schlaegt nach VIOLETT den naechsten BRAUN-Grad vor", () => {
    const hint = suggestNextBelt("VIOLETT", "4. Kyu");
    expect(hint.nextLevel?.grade).toBe("3. Kyu");
    expect(hint.nextLevel?.color).toBe("BRAUN");
  });
});

// ---------------------------------------------------------------------------
// calculateBeltDistribution
// ---------------------------------------------------------------------------

describe("calculateBeltDistribution", () => {
  it("gibt 0% fuer alle Farben bei leerer Liste", () => {
    const dist = calculateBeltDistribution([]);
    expect(dist.every((e) => e.count === 0 && e.percent === 0)).toBe(true);
  });

  it("berechnet korrekte Prozentangaben", () => {
    const colors = ["WEISS", "WEISS", "GELB", "BLAU"];
    const dist = calculateBeltDistribution(colors);
    const weiss = dist.find((e) => e.color === "WEISS")!;
    const gelb = dist.find((e) => e.color === "GELB")!;
    expect(weiss.count).toBe(2);
    expect(weiss.percent).toBe(50);
    expect(gelb.count).toBe(1);
    expect(gelb.percent).toBe(25);
  });

  it("gibt alle dreizehn Farben zurueck auch wenn count 0", () => {
    const dist = calculateBeltDistribution(["WEISS"]);
    expect(dist).toHaveLength(13);
    expect(dist.find((e) => e.color === "SCHWARZ")!.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyBeltSuggestionDecision
// ---------------------------------------------------------------------------

describe("applyBeltSuggestionDecision", () => {
  const baseSuggestion = {
    id: "bsugg-001",
    sessionId: "s1",
    sessionDate: "2026-06-20",
    memberId: "member-01",
    storedBeltColor: "GRUEN",
    suggestedBeltColor: "BLAU",
    confidencePercent: 82,
    status: BeltSuggestionStatus.OPEN,
  };

  it("setzt Status auf CONFIRMED bei CONFIRM-Action", () => {
    const result = applyBeltSuggestionDecision(baseSuggestion, {
      action: "CONFIRM",
      decidedBy: "Trainer Demo",
      decidedAt: "2026-06-20T19:30:00.000Z",
      historyEntryId: "belt-0001",
    });
    expect(result.status).toBe(BeltSuggestionStatus.CONFIRMED);
    expect(result.historyEntryId).toBe("belt-0001");
  });

  it("setzt Status auf REJECTED bei REJECT-Action", () => {
    const result = applyBeltSuggestionDecision(baseSuggestion, {
      action: "REJECT",
      decidedBy: "Trainer Demo",
      decidedAt: "2026-06-20T19:30:00.000Z",
    });
    expect(result.status).toBe(BeltSuggestionStatus.REJECTED);
  });

  it("setzt Status auf DEFERRED bei DEFER-Action", () => {
    const result = applyBeltSuggestionDecision(baseSuggestion, {
      action: "DEFER",
      decidedBy: "Trainer Demo",
      decidedAt: "2026-06-20T19:30:00.000Z",
    });
    expect(result.status).toBe(BeltSuggestionStatus.DEFERRED);
  });

  it("veraendert das Original nicht (Immutabilitaet)", () => {
    applyBeltSuggestionDecision(baseSuggestion, {
      action: "CONFIRM",
      decidedBy: "x",
      decidedAt: "2026-06-20T19:30:00.000Z",
    });
    expect(baseSuggestion.status).toBe(BeltSuggestionStatus.OPEN);
  });
});

// ---------------------------------------------------------------------------
// openBeltSuggestions
// ---------------------------------------------------------------------------

describe("openBeltSuggestions", () => {
  it("filtert nur OPEN-Vorschlaege", () => {
    const suggestions = [
      {
        id: "1",
        status: BeltSuggestionStatus.OPEN,
        sessionId: "s",
        sessionDate: "2026-01-01",
        memberId: "m1",
        storedBeltColor: "WEISS",
        suggestedBeltColor: "GELB",
        confidencePercent: 70,
      },
      {
        id: "2",
        status: BeltSuggestionStatus.CONFIRMED,
        sessionId: "s",
        sessionDate: "2026-01-01",
        memberId: "m2",
        storedBeltColor: "GELB",
        suggestedBeltColor: "ORANGE",
        confidencePercent: 80,
      },
      {
        id: "3",
        status: BeltSuggestionStatus.REJECTED,
        sessionId: "s",
        sessionDate: "2026-01-01",
        memberId: "m3",
        storedBeltColor: "BLAU",
        suggestedBeltColor: "BRAUN",
        confidencePercent: 60,
      },
    ];
    const open = openBeltSuggestions(suggestions);
    expect(open).toHaveLength(1);
    expect(open[0]!.id).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// simulateBeltColorSuggestion (Demo-only)
// ---------------------------------------------------------------------------

describe("simulateBeltColorSuggestion", () => {
  it("gibt eine bekannte Guertelfarbe zurueck", () => {
    const result = simulateBeltColorSuggestion("WEISS", 0);
    expect(BELT_COLORS).toContain(result.suggestedColor as (typeof BELT_COLORS)[number]);
  });

  it("gibt eine Konfidenz zwischen 35 und 94 zurueck", () => {
    for (let seed = 0; seed < 20; seed++) {
      const result = simulateBeltColorSuggestion("BLAU", seed);
      expect(result.confidencePercent).toBeGreaterThanOrEqual(35);
      expect(result.confidencePercent).toBeLessThanOrEqual(94);
    }
  });

  it("ist deterministisch bei gleichem Seed", () => {
    const a = simulateBeltColorSuggestion("GRUEN", 42);
    const b = simulateBeltColorSuggestion("GRUEN", 42);
    expect(a.suggestedColor).toBe(b.suggestedColor);
    expect(a.confidencePercent).toBe(b.confidencePercent);
  });
});

// ---------------------------------------------------------------------------
// createBeltHistoryIdGenerator
// ---------------------------------------------------------------------------

describe("createBeltHistoryIdGenerator", () => {
  it("erzeugt IDs ab belt-0001", () => {
    const nextId = createBeltHistoryIdGenerator([]);
    expect(nextId()).toBe("belt-0001");
    expect(nextId()).toBe("belt-0002");
  });

  it("umgeht bestehende IDs kollisionsfrei", () => {
    const nextId = createBeltHistoryIdGenerator(["belt-0001", "belt-0002"]);
    expect(nextId()).toBe("belt-0003");
  });
});
