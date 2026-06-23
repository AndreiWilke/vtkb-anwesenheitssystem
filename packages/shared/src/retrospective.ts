import {
  CaptureSource,
  DemoRole,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  type AuditEntry,
  type DemoRole as DemoRoleValue,
} from "./domain.js";

export const RetrospectiveValidationCode = {
  DATE_NOT_IN_PAST: "DATE_NOT_IN_PAST",
  INVALID_TIME_RANGE: "INVALID_TIME_RANGE",
  MISSING_NAME: "MISSING_NAME",
  MISSING_TRAINING_TYPE: "MISSING_TRAINING_TYPE",
  MISSING_DOJO: "MISSING_DOJO",
  MISSING_RESPONSIBLE_TRAINER: "MISSING_RESPONSIBLE_TRAINER",
  MISSING_REASON: "MISSING_REASON",
  DUPLICATE_ASSISTANT: "DUPLICATE_ASSISTANT",
  RESPONSIBLE_ALSO_ASSISTANT: "RESPONSIBLE_ALSO_ASSISTANT",
} as const;

export type RetrospectiveValidationCode =
  (typeof RetrospectiveValidationCode)[keyof typeof RetrospectiveValidationCode];

export interface RetrospectiveValidationIssue {
  code: RetrospectiveValidationCode;
  message: string;
  field: string;
}

export interface RetrospectiveSessionInput {
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  trainingType: string;
  dojo: string;
  responsibleTrainerId: string;
  assistantTrainerIds: readonly string[];
  participantIds: readonly string[];
  reason: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface RetrospectiveSession {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  timeZone: "Europe/Berlin";
  name: string;
  trainingType: string;
  dojo: string;
  status: typeof TrainingSessionStatus.COMPLETED;
  attendance: readonly AttendanceRecord[];
  completedAt: string;
  completedBy: string;
  retrospectiveReason: string;
  internalNote: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateRetrospectiveSession(
  input: RetrospectiveSessionInput,
  today: string,
): RetrospectiveValidationIssue[] {
  const issues: RetrospectiveValidationIssue[] = [];
  if (!ISO_DATE.test(input.date) || input.date >= today) {
    issues.push({
      code: RetrospectiveValidationCode.DATE_NOT_IN_PAST,
      message: "Das Datum muss vor dem heutigen Tag liegen.",
      field: "date",
    });
  }
  if (
    !CLOCK_TIME.test(input.startTime) ||
    !CLOCK_TIME.test(input.endTime) ||
    input.startTime >= input.endTime
  ) {
    issues.push({
      code: RetrospectiveValidationCode.INVALID_TIME_RANGE,
      message: "Der Beginn muss vor dem Ende liegen.",
      field: "endTime",
    });
  }
  const required: Array<[string, string, RetrospectiveValidationCode]> = [
    [input.name, "name", RetrospectiveValidationCode.MISSING_NAME],
    [input.trainingType, "trainingType", RetrospectiveValidationCode.MISSING_TRAINING_TYPE],
    [input.dojo, "dojo", RetrospectiveValidationCode.MISSING_DOJO],
    [
      input.responsibleTrainerId,
      "responsibleTrainerId",
      RetrospectiveValidationCode.MISSING_RESPONSIBLE_TRAINER,
    ],
    [input.reason, "reason", RetrospectiveValidationCode.MISSING_REASON],
  ];
  for (const [value, field, code] of required) {
    if (!value.trim()) issues.push({ code, message: `${field} ist ein Pflichtfeld.`, field });
  }
  if (new Set(input.assistantTrainerIds).size !== input.assistantTrainerIds.length) {
    issues.push({
      code: RetrospectiveValidationCode.DUPLICATE_ASSISTANT,
      message: "Assistenztrainer dürfen nicht doppelt zugeordnet werden.",
      field: "assistantTrainerIds",
    });
  }
  if (input.assistantTrainerIds.includes(input.responsibleTrainerId)) {
    issues.push({
      code: RetrospectiveValidationCode.RESPONSIBLE_ALSO_ASSISTANT,
      message: "Der verantwortliche Trainer darf nicht zugleich Assistenztrainer sein.",
      field: "assistantTrainerIds",
    });
  }
  return issues;
}

export function canCreateRetrospectiveSession(
  role: DemoRoleValue | "ADMIN",
  hasSpecialPermission = false,
): boolean {
  return (
    role === DemoRole.BOARD ||
    role === "ADMIN" ||
    (role === DemoRole.TRAINER && hasSpecialPermission)
  );
}

export function createRetrospectiveSessionIdGenerator(
  existingIds: readonly string[],
): () => string {
  const issued = new Set(existingIds);
  let sequence = 1;
  return () => {
    let id = `retro-${String(sequence).padStart(4, "0")}`;
    while (issued.has(id)) {
      sequence += 1;
      id = `retro-${String(sequence).padStart(4, "0")}`;
    }
    issued.add(id);
    sequence += 1;
    return id;
  };
}

export function findRetrospectiveDuplicate(
  input: Pick<RetrospectiveSessionInput, "date" | "startTime" | "endTime" | "dojo">,
  sessions: readonly Pick<RetrospectiveSession, "id" | "date" | "startsAt" | "endsAt" | "dojo">[],
): string | null {
  return (
    sessions.find(
      (session) =>
        session.date === input.date &&
        session.startsAt.slice(11, 16) === input.startTime &&
        session.endsAt.slice(11, 16) === input.endTime &&
        session.dojo.trim().toLocaleLowerCase("de") === input.dojo.trim().toLocaleLowerCase("de"),
    )?.id ?? null
  );
}

export function createRetrospectiveSession(
  id: string,
  input: RetrospectiveSessionInput,
  today: string,
): { session: RetrospectiveSession; auditEntry: AuditEntry } {
  const issues = validateRetrospectiveSession(input, today);
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(" "));
  const attendance: AttendanceRecord[] = [
    {
      sessionId: id,
      memberId: input.responsibleTrainerId,
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.RESPONSIBLE_TRAINER,
      captureSource: CaptureSource.MANUAL,
    },
    ...input.assistantTrainerIds.map<AttendanceRecord>((memberId) => ({
      sessionId: id,
      memberId,
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.ASSISTANT_TRAINER,
      captureSource: CaptureSource.MANUAL,
    })),
    ...input.participantIds
      .filter(
        (memberId) =>
          memberId !== input.responsibleTrainerId && !input.assistantTrainerIds.includes(memberId),
      )
      .map<AttendanceRecord>((memberId) => ({
        sessionId: id,
        memberId,
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: SessionRole.PARTICIPANT,
        captureSource: CaptureSource.MANUAL,
      })),
  ];
  const session: RetrospectiveSession = {
    id,
    date: input.date,
    startsAt: `${input.date}T${input.startTime}:00`,
    endsAt: `${input.date}T${input.endTime}:00`,
    timeZone: "Europe/Berlin",
    name: input.name.trim(),
    trainingType: input.trainingType.trim(),
    dojo: input.dojo.trim(),
    status: TrainingSessionStatus.COMPLETED,
    attendance,
    completedAt: input.createdAt,
    completedBy: input.createdBy,
    retrospectiveReason: input.reason.trim(),
    internalNote: input.note?.trim() || null,
  };
  return {
    session,
    auditEntry: {
      id: `audit-${id}`,
      occurredAt: input.createdAt,
      actor: input.createdBy,
      action: "RETROSPECTIVE_SESSION_CREATED",
      object: `TrainingSession:${id}`,
      previousValue: null,
      newValue: `${input.date}:${input.startTime}-${input.endTime}:${input.dojo.trim()}`,
      reason: input.reason.trim(),
    },
  };
}
