import {
  CaptureSource,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  type AuditEntry,
  type TrainingSession,
  type PersonMembershipStatus,
} from "./domain.js";
import { isValidIsoDate } from "./date.js";
import { AppPermission, hasPermission } from "./permissions.js";
import { assertValidTrainingSession } from "./validation.js";
import { berlinClockFromIso, berlinLocalDateTimeToIso } from "./schedule.js";

export const RetrospectiveValidationCode = {
  INVALID_DATE: "INVALID_DATE",
  DATE_NOT_IN_PAST: "DATE_NOT_IN_PAST",
  INVALID_TIME_RANGE: "INVALID_TIME_RANGE",
  MISSING_NAME: "MISSING_NAME",
  MISSING_TRAINING_TYPE: "MISSING_TRAINING_TYPE",
  MISSING_DOJO: "MISSING_DOJO",
  MISSING_RESPONSIBLE_TRAINER: "MISSING_RESPONSIBLE_TRAINER",
  MISSING_REASON: "MISSING_REASON",
  DUPLICATE_ASSISTANT: "DUPLICATE_ASSISTANT",
  RESPONSIBLE_ALSO_ASSISTANT: "RESPONSIBLE_ALSO_ASSISTANT",
  DUPLICATE_PARTICIPANT: "DUPLICATE_PARTICIPANT",
  PARTICIPANT_ROLE_OVERLAP: "PARTICIPANT_ROLE_OVERLAP",
  INVALID_CREATED_BY_ROLE: "INVALID_CREATED_BY_ROLE",
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
  dojoId: string;
  dojo: string;
  responsibleTrainerId: string;
  assistantTrainerIds: readonly string[];
  participantIds: readonly string[];
  membershipStatusByPersonId: Readonly<Record<string, PersonMembershipStatus>>;
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
  scheduledSlotId: null;
  dojoId: string;
  dojoNameSnapshot: string;
  dojo: string;
  status: typeof TrainingSessionStatus.COMPLETED;
  attendance: readonly AttendanceRecord[];
  completedAt: string;
  completedBy: string;
  retrospectiveReason: string;
  internalNote: string | null;
}

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateRetrospectiveSession(
  input: RetrospectiveSessionInput,
  today: string,
): RetrospectiveValidationIssue[] {
  const issues: RetrospectiveValidationIssue[] = [];
  if (!isValidIsoDate(input.date)) {
    issues.push({
      code: RetrospectiveValidationCode.INVALID_DATE,
      message: "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.",
      field: "date",
    });
  } else if (!isValidIsoDate(today) || input.date >= today) {
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
  if (new Set(input.participantIds).size !== input.participantIds.length) {
    issues.push({
      code: RetrospectiveValidationCode.DUPLICATE_PARTICIPANT,
      message: "Teilnehmende dürfen nicht doppelt zugeordnet werden.",
      field: "participantIds",
    });
  }
  if (
    input.participantIds.includes(input.responsibleTrainerId) ||
    input.participantIds.some((id) => input.assistantTrainerIds.includes(id))
  ) {
    issues.push({
      code: RetrospectiveValidationCode.PARTICIPANT_ROLE_OVERLAP,
      message: "Eine Person darf je Einheit nur genau eine Rolle haben.",
      field: "participantIds",
    });
  }
  if (!canCreateRetrospectiveSession(input.createdBy)) {
    issues.push({
      code: RetrospectiveValidationCode.INVALID_CREATED_BY_ROLE,
      message: "Die Nachtragserfassung ist nur für eine definierte angemeldete Rolle erlaubt.",
      field: "createdBy",
    });
  }
  return issues;
}

export function canCreateRetrospectiveSession(role: string): boolean {
  return hasPermission(role, AppPermission.CREATE_RETROSPECTIVE_SESSION);
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
  input: Pick<RetrospectiveSessionInput, "date" | "startTime" | "endTime" | "dojoId">,
  sessions: readonly Pick<RetrospectiveSession, "id" | "date" | "startsAt" | "endsAt" | "dojoId">[],
): string | null {
  return (
    sessions.find(
      (session) =>
        session.date === input.date &&
        berlinClockFromIso(session.startsAt) === input.startTime &&
        berlinClockFromIso(session.endsAt) === input.endTime &&
        session.dojoId === input.dojoId,
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
  const membershipStatusFor = (personId: string): PersonMembershipStatus => {
    const status = input.membershipStatusByPersonId[personId];
    if (!status) throw new Error(`Mitgliedschaftsstatus für ${personId} fehlt.`);
    return status;
  };
  const attendance: AttendanceRecord[] = [
    {
      sessionId: id,
      memberId: input.responsibleTrainerId,
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.RESPONSIBLE_TRAINER,
      captureSource: CaptureSource.MANUAL,
      membershipStatusAtTime: membershipStatusFor(input.responsibleTrainerId),
    },
    ...input.assistantTrainerIds.map<AttendanceRecord>((memberId) => ({
      sessionId: id,
      memberId,
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.ASSISTANT_TRAINER,
      captureSource: CaptureSource.MANUAL,
      membershipStatusAtTime: membershipStatusFor(memberId),
    })),
    ...input.participantIds.map<AttendanceRecord>((memberId) => ({
      sessionId: id,
      memberId,
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.PARTICIPANT,
      captureSource: CaptureSource.MANUAL,
      membershipStatusAtTime: membershipStatusFor(memberId),
    })),
  ];
  const session: RetrospectiveSession = {
    id,
    date: input.date,
    startsAt: berlinLocalDateTimeToIso(input.date, input.startTime),
    endsAt: berlinLocalDateTimeToIso(input.date, input.endTime),
    timeZone: "Europe/Berlin",
    name: input.name.trim(),
    trainingType: input.trainingType.trim(),
    scheduledSlotId: null,
    dojoId: input.dojoId.trim(),
    dojoNameSnapshot: input.dojo.trim(),
    dojo: input.dojo.trim(),
    status: TrainingSessionStatus.COMPLETED,
    attendance,
    completedAt: input.createdAt,
    completedBy: input.createdBy,
    retrospectiveReason: input.reason.trim(),
    internalNote: input.note?.trim() || null,
  };
  const validationSession: TrainingSession = {
    id: session.id,
    templateId: null,
    scheduledSlotId: null,
    name: session.name,
    trainingType: session.trainingType,
    dojoId: session.dojoId,
    dojoNameSnapshot: session.dojoNameSnapshot,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    status: session.status,
    completedAt: session.completedAt,
    completedByUserId: session.completedBy,
  };
  assertValidTrainingSession({ session: validationSession, attendance });
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
