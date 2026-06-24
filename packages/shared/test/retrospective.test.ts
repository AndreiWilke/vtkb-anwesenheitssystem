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
  dojoId: "dojo-seikatsu",
  dojo: "Test-Dojo",
  responsibleTrainerId: "member-01",
  assistantTrainerIds: ["member-02"],
  participantIds: ["member-03", "trial-01"],
  membershipStatusByPersonId: {
    "member-01": "ACTIVE_MEMBER",
    "member-02": "ACTIVE_MEMBER",
    "member-03": "ACTIVE_MEMBER",
    "trial-01": "TRIAL",
  },
  reason: "Fiktiver Dokumentationsnachtrag",
  note: "Nur Testdaten",
  createdBy: DemoRole.BOARD,
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

  it("lehnt ein normalisiertes, aber tatsächlich unmögliches Datum ab", () => {
    const issues = validateRetrospectiveSession(
      { ...validInput, date: "2026-02-31" },
      "2026-06-23",
    );
    expect(issues.map((issue) => issue.code)).toContain(RetrospectiveValidationCode.INVALID_DATE);
    expect(issues.find((issue) => issue.field === "date")?.message).toBe(
      "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.",
    );
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

  it.each([DemoRole.BOARD, DemoRole.TRAINER, DemoRole.ASSISTANT_TRAINER, DemoRole.TREASURER])(
    "erlaubt der angemeldeten Rolle %s die Nachtragserfassung",
    (role) => {
      expect(canCreateRetrospectiveSession(role)).toBe(true);
    },
  );

  it("weist einen leeren Rollenwert ab", () => {
    expect(canCreateRetrospectiveSession(" ")).toBe(false);
  });

  it.each(["ADMIN", "FUTURE_AUTHENTICATED_ROLE", " "])(
    "weist die nicht definierte Rolle %s ab",
    (role) => {
      expect(canCreateRetrospectiveSession(role)).toBe(false);
    },
  );

  it("lehnt doppelte Teilnehmende und Rollenüberschneidungen ab", () => {
    const codes = validateRetrospectiveSession(
      {
        ...validInput,
        participantIds: ["member-01", "member-02", "member-03", "member-03"],
      },
      "2026-06-23",
    ).map((issue) => issue.code);
    expect(codes).toContain(RetrospectiveValidationCode.DUPLICATE_PARTICIPANT);
    expect(codes).toContain(RetrospectiveValidationCode.PARTICIPANT_ROLE_OVERLAP);
  });

  it("übernimmt die tatsächlich aktive Rolle in Abschluss und Audit", () => {
    const result = createRetrospectiveSession(
      "retro-role",
      { ...validInput, createdBy: DemoRole.TREASURER },
      "2026-06-23",
    );
    expect(result.session.completedBy).toBe(DemoRole.TREASURER);
    expect(result.auditEntry.actor).toBe(DemoRole.TREASURER);
  });
});
