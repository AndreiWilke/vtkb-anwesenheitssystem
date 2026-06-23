import {
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  type TrainingSession,
} from "./domain.js";

export const ValidationCode = {
  ABSENT_WITH_ROLE: "ABSENT_WITH_ROLE",
  COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER:
    "COMPLETED_SESSION_REQUIRES_ONE_RESPONSIBLE_TRAINER",
  DUPLICATE_MEMBER_ATTENDANCE: "DUPLICATE_MEMBER_ATTENDANCE",
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

export function validateTrainingSession(input: SessionValidationInput): ValidationIssue[] {
  const { session, attendance } = input;
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
