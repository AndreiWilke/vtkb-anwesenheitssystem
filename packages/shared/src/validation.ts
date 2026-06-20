import {
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  type GuestAttendance,
  type TrainingSession,
} from "./domain.js";

export const ValidationCode = {
  ABSENT_WITH_ROLE: "ABSENT_WITH_ROLE",
  COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER:
    "COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER",
  DUPLICATE_GUEST_ATTENDANCE: "DUPLICATE_GUEST_ATTENDANCE",
  DUPLICATE_MEMBER_ATTENDANCE: "DUPLICATE_MEMBER_ATTENDANCE",
  GUEST_HAS_BIOMETRIC_ENROLLMENT: "GUEST_HAS_BIOMETRIC_ENROLLMENT",
  GUEST_SESSION_MISMATCH: "GUEST_SESSION_MISMATCH",
  PRESENT_WITHOUT_ROLE: "PRESENT_WITHOUT_ROLE",
  RECORD_SESSION_MISMATCH: "RECORD_SESSION_MISMATCH",
  ROLE_REQUIRES_PRESENT: "ROLE_REQUIRES_PRESENT",
} as const;

export type ValidationCode = (typeof ValidationCode)[keyof typeof ValidationCode];

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  path: string;
}

export interface SessionValidationInput {
  session: TrainingSession;
  attendance: readonly AttendanceRecord[];
  guests?: readonly GuestAttendance[];
}

export function validateAttendanceRecords(records: readonly AttendanceRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const uniqueKeys = new Set<string>();

  records.forEach((record, index) => {
    const path = `attendance[${index}]`;
    const uniqueKey = `${record.sessionId}:${record.memberId}`;

    if (uniqueKeys.has(uniqueKey)) {
      issues.push({
        code: ValidationCode.DUPLICATE_MEMBER_ATTENDANCE,
        message: "Eine Person darf je Einheit nur einen Anwesenheitsdatensatz besitzen.",
        path,
      });
    }
    uniqueKeys.add(uniqueKey);

    if (record.presenceStatus === PresenceStatus.ABSENT && record.sessionRole !== null) {
      issues.push({
        code: ValidationCode.ABSENT_WITH_ROLE,
        message: "Eine abwesende Person darf keine Funktion in der Einheit besitzen.",
        path: `${path}.sessionRole`,
      });
    }

    if (record.presenceStatus === PresenceStatus.PRESENT && record.sessionRole === null) {
      issues.push({
        code: ValidationCode.PRESENT_WITHOUT_ROLE,
        message: "Eine anwesende Person benoetigt genau eine Funktion in der Einheit.",
        path: `${path}.sessionRole`,
      });
    }

    const hasTrainerRole =
      record.sessionRole === SessionRole.RESPONSIBLE_TRAINER ||
      record.sessionRole === SessionRole.ASSISTANT_TRAINER;

    if (hasTrainerRole && record.presenceStatus !== PresenceStatus.PRESENT) {
      issues.push({
        code: ValidationCode.ROLE_REQUIRES_PRESENT,
        message: "Trainer- und Assistenzfunktionen setzen Anwesenheit voraus.",
        path: `${path}.presenceStatus`,
      });
    }
  });

  return issues;
}

export function validateGuestAttendance(
  guest: GuestAttendance | Record<string, unknown>,
  index = 0,
): ValidationIssue[] {
  const candidate = guest as Record<string, unknown>;

  if (candidate.biometricEnrollmentId === undefined) {
    return [];
  }

  return [
    {
      code: ValidationCode.GUEST_HAS_BIOMETRIC_ENROLLMENT,
      message: "Gaeste duerfen keine biometrische Enrollment-ID besitzen.",
      path: `guests[${index}].biometricEnrollmentId`,
    },
  ];
}

export function validateGuestAttendanceRecords(
  guests: readonly GuestAttendance[],
  expectedSessionId: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const uniqueKeys = new Set<string>();

  guests.forEach((guest, index) => {
    issues.push(...validateGuestAttendance(guest, index));

    const uniqueKey = `${guest.sessionId}:${guest.guestId}`;
    if (uniqueKeys.has(uniqueKey)) {
      issues.push({
        code: ValidationCode.DUPLICATE_GUEST_ATTENDANCE,
        message: "Ein Gast darf je Einheit nur einen Anwesenheitsdatensatz besitzen.",
        path: `guests[${index}]`,
      });
    }
    uniqueKeys.add(uniqueKey);

    if (guest.sessionId !== expectedSessionId) {
      issues.push({
        code: ValidationCode.GUEST_SESSION_MISMATCH,
        message: "Der Gastdatensatz gehoert nicht zu dieser Einheit.",
        path: `guests[${index}].sessionId`,
      });
    }
  });

  return issues;
}

export function validateTrainingSession(input: SessionValidationInput): ValidationIssue[] {
  const { session, attendance, guests = [] } = input;
  const issues = validateAttendanceRecords(attendance);

  attendance.forEach((record, index) => {
    if (record.sessionId !== session.id) {
      issues.push({
        code: ValidationCode.RECORD_SESSION_MISMATCH,
        message: "Der Anwesenheitsdatensatz gehoert nicht zu dieser Einheit.",
        path: `attendance[${index}].sessionId`,
      });
    }
  });

  issues.push(...validateGuestAttendanceRecords(guests, session.id));

  if (session.status === TrainingSessionStatus.COMPLETED) {
    const responsibleTrainerCount = attendance.filter(
      (record) =>
        record.presenceStatus === PresenceStatus.PRESENT &&
        record.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
    ).length;

    if (responsibleTrainerCount !== 1) {
      issues.push({
        code: ValidationCode.COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER,
        message: "Eine abgeschlossene Einheit benoetigt genau einen verantwortlichen Trainer.",
        path: "attendance",
      });
    }
  }

  return issues;
}

export function assertValidTrainingSession(input: SessionValidationInput): void {
  const issues = validateTrainingSession(input);

  if (issues.length > 0) {
    const summary = issues.map((issue) => `${issue.code} at ${issue.path}`).join(", ");
    throw new Error(`Ungueltige Trainingseinheit: ${summary}`);
  }
}
