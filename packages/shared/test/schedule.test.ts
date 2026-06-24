import { describe, expect, it } from "vitest";

import {
  DOJOS,
  SCHEDULED_TRAINING_SLOTS,
  scheduledSlotsOverlap,
  slotsForWeekday,
  validateScheduledTrainingSlots,
} from "../src/index.js";

describe("Dojo- und Trainingszeit-Stammdaten", () => {
  it("enthält genau vier aktive Dojos mit stabilen IDs", () => {
    expect(DOJOS).toEqual([
      { id: "dojo-seikatsu", name: "Seikatsu Dojo", active: true },
      { id: "dojo-ebereschen", name: "Ebereschen Dojo", active: true },
      { id: "dojo-senshi", name: "Senshi Dojo", active: true },
      { id: "dojo-musashi", name: "Musashi Dojo", active: true },
    ]);
  });

  it("enthält genau die elf verbindlichen Wochenzeiten", () => {
    expect(SCHEDULED_TRAINING_SLOTS).toHaveLength(11);
    expect(SCHEDULED_TRAINING_SLOTS.every(({ name }) => name === "Training")).toBe(true);
    expect(SCHEDULED_TRAINING_SLOTS.map(({ trainingType }) => trainingType)).toEqual(
      Array.from({ length: 11 }, () => "ALLGEMEINES_TRAINING"),
    );
    expect(validateScheduledTrainingSlots(SCHEDULED_TRAINING_SLOTS)).toEqual([]);
    expect(new Set(SCHEDULED_TRAINING_SLOTS.map((slot) => slot.id)).size).toBe(11);
  });

  it("erlaubt parallele Einheiten in verschiedenen Dojos", () => {
    const [ebereschen, senshi] = slotsForWeekday(3);
    expect(ebereschen?.startTime).toBe("16:00");
    expect(senshi?.startTime).toBe("16:00");
    expect(scheduledSlotsOverlap(ebereschen!, senshi!)).toBe(false);
  });

  it.each([4, 5])(
    "bildet am Wochentag %s drei lückenlos angrenzende Einheiten ohne Überlappung",
    (weekday) => {
      const sessions = slotsForWeekday(weekday);
      expect(sessions).toHaveLength(3);
      expect(sessions[0]?.endTime).toBe(sessions[1]?.startTime);
      expect(sessions[1]?.endTime).toBe(sessions[2]?.startTime);
      expect(scheduledSlotsOverlap(sessions[0]!, sessions[1]!)).toBe(false);
      expect(scheduledSlotsOverlap(sessions[1]!, sessions[2]!)).toBe(false);
    },
  );

  it("lehnt echte Überlappungen im selben Dojo und Wochentag ab", () => {
    const existing = slotsForWeekday(4)[0]!;
    const overlapping = { ...existing, id: "overlap", startTime: "17:30", endTime: "18:30" };
    expect(validateScheduledTrainingSlots([existing, overlapping])).toContain(
      `Trainingszeiten ${existing.id} und overlap ueberlappen im selben Dojo.`,
    );
  });
});
