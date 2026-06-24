import { describe, expect, it } from "vitest";

import {
  CaptureSource,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  ValidationCode,
  assertValidTrainingSession,
  validateAttendanceRecords,
  validateTrainingSession,
  type AttendanceRecord,
  type TrainingSession,
} from "../src/index.js";

const completedSession: TrainingSession = {
  id: "session-example",
  templateId: "template-example",
  scheduledSlotId: "slot-example",
  name: "Fiktive Testeinheit",
  trainingType: "ALLGEMEINES_TRAINING",
  dojoId: "dojo-example",
  dojoNameSnapshot: "Test-Dojo",
  startsAt: "2026-06-20T16:00:00.000Z",
  endsAt: "2026-06-20T17:00:00.000Z",
  status: TrainingSessionStatus.COMPLETED,
  completedAt: "2026-06-20T17:05:00.000Z",
  completedByUserId: "user-example",
};

function attendance(
  memberId: string,
  sessionRole: AttendanceRecord["sessionRole"],
  presenceStatus: AttendanceRecord["presenceStatus"] = PresenceStatus.PRESENT,
): AttendanceRecord {
  return {
    sessionId: completedSession.id,
    memberId,
    presenceStatus,
    sessionRole,
    captureSource: CaptureSource.MANUAL,
  };
}

describe("fachliche Anwesenheitsvalidierung", () => {
  it("akzeptiert genau einen verantwortlichen Trainer und mehrere weitere Funktionen", () => {
    const issues = validateTrainingSession({
      session: completedSession,
      attendance: [
        attendance("member-alpha", SessionRole.RESPONSIBLE_TRAINER),
        attendance("member-beta", SessionRole.ASSISTANT_TRAINER),
        attendance("member-gamma", SessionRole.PARTICIPANT),
      ],
    });

    expect(issues).toEqual([]);
  });

  it.each([
    { label: "keinen", records: [attendance("member-alpha", SessionRole.PARTICIPANT)] },
    {
      label: "mehr als einen",
      records: [
        attendance("member-alpha", SessionRole.RESPONSIBLE_TRAINER),
        attendance("member-beta", SessionRole.RESPONSIBLE_TRAINER),
      ],
    },
  ])(
    "verhindert $label verantwortlichen Trainer in einer abgeschlossenen Einheit",
    ({ records }) => {
      const codes = validateTrainingSession({ session: completedSession, attendance: records }).map(
        (issue) => issue.code,
      );

      expect(codes).toContain(ValidationCode.COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER);
    },
  );

  it("verhindert eine Funktion fuer eine abwesende Person", () => {
    const issues = validateAttendanceRecords([
      attendance("member-alpha", SessionRole.PARTICIPANT, PresenceStatus.ABSENT),
    ]);

    expect(issues.map((issue) => issue.code)).toContain(ValidationCode.ABSENT_WITH_ROLE);
  });

  it.each([SessionRole.RESPONSIBLE_TRAINER, SessionRole.ASSISTANT_TRAINER])(
    "verlangt Anwesenheit fuer die Funktion %s",
    (sessionRole) => {
      const issues = validateAttendanceRecords([
        attendance("member-alpha", sessionRole, PresenceStatus.ABSENT),
      ]);

      expect(issues.map((issue) => issue.code)).toContain(ValidationCode.ROLE_REQUIRES_PRESENT);
    },
  );

  it("verhindert doppelte Anwesenheit derselben Person in derselben Einheit", () => {
    const issues = validateAttendanceRecords([
      attendance("member-alpha", SessionRole.RESPONSIBLE_TRAINER),
      attendance("member-alpha", SessionRole.PARTICIPANT),
    ]);

    expect(issues.map((issue) => issue.code)).toContain(ValidationCode.DUPLICATE_MEMBER_ATTENDANCE);
  });

  it("verhindert PRESENT ohne Funktion", () => {
    const issues = validateAttendanceRecords([attendance("member-alpha", null)]);

    expect(issues.map((issue) => issue.code)).toContain(ValidationCode.PRESENT_WITHOUT_ROLE);
  });

  it("verhindert einen Mitgliedsdatensatz aus einer anderen Einheit", () => {
    const mismatchedRecord = {
      ...attendance("member-beta", SessionRole.PARTICIPANT),
      sessionId: "session-other",
    };
    const issues = validateTrainingSession({
      session: completedSession,
      attendance: [attendance("member-alpha", SessionRole.RESPONSIBLE_TRAINER), mismatchedRecord],
    });

    expect(issues.map((issue) => issue.code)).toContain(ValidationCode.RECORD_SESSION_MISMATCH);
  });

  it("assertValidTrainingSession akzeptiert gueltige Daten", () => {
    expect(() =>
      assertValidTrainingSession({
        session: completedSession,
        attendance: [attendance("member-alpha", SessionRole.RESPONSIBLE_TRAINER)],
      }),
    ).not.toThrow();
  });

  it("assertValidTrainingSession verwirft ungueltige Daten", () => {
    expect(() =>
      assertValidTrainingSession({
        session: completedSession,
        attendance: [attendance("member-alpha", SessionRole.PARTICIPANT)],
      }),
    ).toThrow(ValidationCode.COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER);
  });
});
