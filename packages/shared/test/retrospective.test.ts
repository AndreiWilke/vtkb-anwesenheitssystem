import { describe, expect, it } from "vitest";
import {
  DemoRole,
  RetrospectiveValidationCode,
  SessionRole,
  canCreateRetrospectiveSession,
  createRetrospectiveSession,
  createRetrospectiveSessionIdGenerator,
  findRetrospectiveDuplicate,
  validateRetrospectiveSession,
  type RetrospectiveSessionInput,
} from "../src/index.js";

const validInput: RetrospectiveSessionInput = {
  date: "2026-06-20",
  startTime: "17:00",
  endTime: "18:30",
  name: "Fiktive Nachtragseinheit",
  trainingType: "GRUNDLAGENTRAINING",
  dojo: "Test-Dojo",
  responsibleTrainerId: "member-01",
  assistantTrainerIds: ["member-02"],
  participantIds: ["member-03", "trial-01"],
  reason: "Fiktiver Dokumentationsnachtrag",
  note: "Nur Testdaten",
  createdBy: "Vorstand Demo",
  createdAt: "2026-06-23T12:00:00.000Z",
};

describe("Nachtragseinheit", () => {
  it("akzeptiert ein vergangenes Datum und erstellt eine abgeschlossene Einheit samt Audit", () => {
    expect(validateRetrospectiveSession(validInput, "2026-06-23")).toEqual([]);
    const result = createRetrospectiveSession("retro-0001", validInput, "2026-06-23");
    expect(result.session.status).toBe("COMPLETED");
    expect(result.session.attendance).toHaveLength(4);
    expect(result.session.attendance[0]?.sessionRole).toBe(SessionRole.RESPONSIBLE_TRAINER);
    expect(result.auditEntry.action).toBe("RETROSPECTIVE_SESSION_CREATED");
  });

  it.each(["2026-06-23", "2026-06-24"])("blockiert heutiges oder zukünftiges Datum %s", (date) => {
    const codes = validateRetrospectiveSession({ ...validInput, date }, "2026-06-23").map(
      (issue) => issue.code,
    );
    expect(codes).toContain(RetrospectiveValidationCode.DATE_NOT_IN_PAST);
  });

  it("verlangt Grund und eine gültige Zeitspanne", () => {
    const codes = validateRetrospectiveSession(
      { ...validInput, reason: " ", startTime: "19:00", endTime: "18:00" },
      "2026-06-23",
    ).map((issue) => issue.code);
    expect(codes).toContain(RetrospectiveValidationCode.MISSING_REASON);
    expect(codes).toContain(RetrospectiveValidationCode.INVALID_TIME_RANGE);
  });

  it("verhindert doppelte Assistenz und doppelte Trainerrollen", () => {
    const codes = validateRetrospectiveSession(
      { ...validInput, assistantTrainerIds: ["member-01", "member-02", "member-02"] },
      "2026-06-23",
    ).map((issue) => issue.code);
    expect(codes).toContain(RetrospectiveValidationCode.DUPLICATE_ASSISTANT);
    expect(codes).toContain(RetrospectiveValidationCode.RESPONSIBLE_ALSO_ASSISTANT);
  });

  it("erzeugt eindeutige IDs auch bei verworfenen Entwürfen", () => {
    const nextId = createRetrospectiveSessionIdGenerator(["retro-0001"]);
    expect([nextId(), nextId()]).toEqual(["retro-0002", "retro-0003"]);
  });

  it("warnt bei identischem Datum, Zeit und Dojo", () => {
    const { session } = createRetrospectiveSession("retro-existing", validInput, "2026-06-23");
    expect(findRetrospectiveDuplicate(validInput, [session])).toBe("retro-existing");
  });

  it("setzt Rollenrechte korrekt um", () => {
    expect(canCreateRetrospectiveSession(DemoRole.BOARD)).toBe(true);
    expect(canCreateRetrospectiveSession("ADMIN")).toBe(true);
    expect(canCreateRetrospectiveSession(DemoRole.TRAINER)).toBe(false);
    expect(canCreateRetrospectiveSession(DemoRole.TRAINER, true)).toBe(true);
    expect(canCreateRetrospectiveSession(DemoRole.ASSISTANT_TRAINER)).toBe(false);
    expect(canCreateRetrospectiveSession(DemoRole.TREASURER)).toBe(false);
  });
});
