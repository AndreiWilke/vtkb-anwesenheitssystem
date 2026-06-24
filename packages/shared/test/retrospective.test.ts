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
  date: "2026-06-22",
  scheduledSlotId: "mon-seikatsu-1700",
  startTime: "17:00",
  endTime: "18:00",
  name: "Training",
  trainingType: "ALLGEMEINES_TRAINING",
  dojoId: "dojo-seikatsu",
  dojo: "Seikatsu Dojo",
  responsibleTrainerId: "member-01",
  assistantTrainerIds: ["member-02"],
  participantIds: ["member-03", "trial-01"],
  membershipStatusByPersonId: {
    "member-01": "ACTIVE_MEMBER",
    "member-02": "ACTIVE_MEMBER",
    "member-03": "ACTIVE_MEMBER",
    "trial-01": "TRIAL",
  },
  note: "Nur Testdaten",
  createdBy: DemoRole.BOARD,
  createdAt: "2026-06-23T12:00:00.000Z",
};

describe("Nachtragseinheit", () => {
  it("akzeptiert ein vergangenes Datum und erstellt eine abgeschlossene Einheit samt Audit", () => {
    expect(validateRetrospectiveSession(validInput, "2026-06-23")).toEqual([]);
    const result = createRetrospectiveSession("retro-0001", validInput, "2026-06-23");
    expect(result.session.status).toBe("COMPLETED");
    expect(result.session).toMatchObject({
      scheduledSlotId: "mon-seikatsu-1700",
      dojoId: "dojo-seikatsu",
      dojoNameSnapshot: "Seikatsu Dojo",
      name: "Training",
      trainingType: "ALLGEMEINES_TRAINING",
    });
    expect(result.session.startsAt).toBe("2026-06-22T15:00:00.000Z");
    expect(result.session.endsAt).toBe("2026-06-22T16:00:00.000Z");
    expect(result.session.internalNote).toBe("Nur Testdaten");
    expect(result.session.attendance).toHaveLength(4);
    expect(result.session.attendance[0]?.sessionRole).toBe(SessionRole.RESPONSIBLE_TRAINER);
    expect(result.auditEntry.action).toBe("RETROSPECTIVE_SESSION_CREATED");
    expect(result.auditEntry.reason).toBeNull();
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
      "Bitte ein gültiges Datum auswählen.",
    );
  });

  it("verlangt weiterhin eine gültige Zeitspanne, aber keinen Freitextgrund", () => {
    const codes = validateRetrospectiveSession(
      { ...validInput, startTime: "19:00", endTime: "18:00" },
      "2026-06-23",
    ).map((issue) => issue.code);
    expect(codes).toContain(RetrospectiveValidationCode.INVALID_TIME_RANGE);
  });

  it("speichert eine fehlende interne Bemerkung als null und blockiert nicht", () => {
    const inputWithoutNote: RetrospectiveSessionInput = { ...validInput };
    delete inputWithoutNote.note;
    expect(validateRetrospectiveSession(inputWithoutNote, "2026-06-23")).toEqual([]);
    expect(
      createRetrospectiveSession("retro-without-note", inputWithoutNote, "2026-06-23").session
        .internalNote,
    ).toBeNull();
  });

  it("verlangt einen zentralen Wochenplan-Slot und lehnt manipulierte Slot-Daten ab", () => {
    expect(
      validateRetrospectiveSession({ ...validInput, scheduledSlotId: "" }, "2026-06-23").map(
        (issue) => issue.code,
      ),
    ).toContain(RetrospectiveValidationCode.MISSING_SCHEDULED_SLOT);
    expect(
      validateRetrospectiveSession({ ...validInput, endTime: "18:30" }, "2026-06-23").map(
        (issue) => issue.code,
      ),
    ).toContain(RetrospectiveValidationCode.SCHEDULE_SLOT_MISMATCH);
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

  it("warnt bei identischem Datum und Slot auch bei abweichenden Eingabezeiten", () => {
    const { session } = createRetrospectiveSession("retro-existing", validInput, "2026-06-23");
    expect(
      findRetrospectiveDuplicate({ ...validInput, startTime: "16:45", endTime: "18:15" }, [
        session,
      ]),
    ).toBe("retro-existing");
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
