import { describe, expect, it } from "vitest";

import {
  formatGermanDate,
  isValidGermanDate,
  isValidIsoDate,
  parseGermanDate,
} from "../src/index.js";

describe("deutsche Datumswerte", () => {
  it.each([
    ["2026-06-23", "23.06.2026"],
    ["2024-02-29", "29.02.2024"],
  ])("formatiert %s als %s", (iso, german) => {
    expect(formatGermanDate(iso)).toBe(german);
  });

  it.each(["28.02.2026", "29.02.2024", "01.01.2026", "31.12.2026"])("akzeptiert %s", (value) => {
    expect(isValidGermanDate(value)).toBe(true);
    expect(parseGermanDate(value)).not.toBeNull();
  });

  it.each([
    "31.02.2026",
    "29.02.2025",
    "32.01.2026",
    "00.12.2026",
    "15.13.2026",
    "1.1.26",
    "2026-02-28",
    "abc",
  ])("lehnt %s ab", (value) => {
    expect(isValidGermanDate(value)).toBe(false);
    expect(parseGermanDate(value)).toBeNull();
  });

  it("prüft ISO-Werte ohne Date-Normalisierung", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2025-02-29")).toBe(false);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
  });
});
