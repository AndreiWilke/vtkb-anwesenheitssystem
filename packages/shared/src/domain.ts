export const MemberQualification = {
  NONE: "NONE",
  ASSISTANT_TRAINER: "ASSISTANT_TRAINER",
  TRAINER: "TRAINER",
} as const;

export type MemberQualification = (typeof MemberQualification)[keyof typeof MemberQualification];

export const SessionRole = {
  RESPONSIBLE_TRAINER: "RESPONSIBLE_TRAINER",
  ASSISTANT_TRAINER: "ASSISTANT_TRAINER",
  PARTICIPANT: "PARTICIPANT",
} as const;

export type SessionRole = (typeof SessionRole)[keyof typeof SessionRole];

export const PresenceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
} as const;

export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

export const CaptureSource = {
  MANUAL: "MANUAL",
  PHOTO_ASSISTED: "PHOTO_ASSISTED",
  PREVIOUS_SESSION_SUGGESTION: "PREVIOUS_SESSION_SUGGESTION",
} as const;

export type CaptureSource = (typeof CaptureSource)[keyof typeof CaptureSource];

export const ConsentStatus = {
  NOT_REQUESTED: "NOT_REQUESTED",
  GRANTED: "GRANTED",
  DECLINED: "DECLINED",
  WITHDRAWN: "WITHDRAWN",
  EXPIRED: "EXPIRED",
} as const;

export type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

export const ConsentPurpose = {
  BIOMETRIC_ATTENDANCE_IDENTIFICATION: "BIOMETRIC_ATTENDANCE_IDENTIFICATION",
} as const;

export type ConsentPurpose = (typeof ConsentPurpose)[keyof typeof ConsentPurpose];

export const TrainingSessionStatus = {
  DRAFT: "DRAFT",
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ABORTED: "ABORTED",
  CANCELLED: "CANCELLED",
} as const;

export type TrainingSessionStatus =
  (typeof TrainingSessionStatus)[keyof typeof TrainingSessionStatus];

export interface TrainingTemplate {
  id: string;
  name: string;
  dojo: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  defaultResponsibleTrainerId: string;
  defaultAssistantTrainerIds: readonly string[];
}

export interface TrainingSession {
  id: string;
  templateId: string | null;
  name: string;
  dojo: string;
  startsAt: string;
  endsAt: string;
  status: TrainingSessionStatus;
  completedAt: string | null;
  completedByUserId: string | null;
}

export const CompensationBillingType = {
  PER_COMPLETED_SESSION: "PER_COMPLETED_SESSION",
} as const;

export type CompensationBillingType =
  (typeof CompensationBillingType)[keyof typeof CompensationBillingType];

export const SettlementStatus = {
  DRAFT: "DRAFT",
  REVIEWED: "REVIEWED",
  APPROVED: "APPROVED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];

export const DemoRole = {
  TRAINER: "TRAINER",
  BOARD: "BOARD",
  TREASURER: "TREASURER",
} as const;

export type DemoRole = (typeof DemoRole)[keyof typeof DemoRole];

export interface CompensationRate {
  id: string;
  label: string;
  role: typeof SessionRole.RESPONSIBLE_TRAINER | typeof SessionRole.ASSISTANT_TRAINER;
  billingType: typeof CompensationBillingType.PER_COMPLETED_SESSION;
  amountCents: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
}

export interface CompensationCorrection {
  id: string;
  amountCents: number;
  reason: string;
  editedBy: string;
  editedAt: string;
}

export interface SettlementLine {
  sessionId: string;
  date: string;
  startsAt: string;
  trainingName: string;
  dojo: string;
  role: typeof SessionRole.RESPONSIBLE_TRAINER | typeof SessionRole.ASSISTANT_TRAINER;
  rateId: string | null;
  rateCents: number | null;
  amountCents: number | null;
  reviewNote: string | null;
}

export interface SettlementSnapshot {
  month: string;
  memberId: string;
  lines: readonly SettlementLine[];
  corrections: readonly CompensationCorrection[];
  totalCents: number;
  snapshotKind: "APPROVAL" | "CANCELLATION";
  capturedAt: string;
  capturedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  object: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
}

export interface AttendanceRecord {
  sessionId: string;
  memberId: string;
  presenceStatus: PresenceStatus;
  sessionRole: SessionRole | null;
  captureSource: CaptureSource;
}

export interface GuestAttendance {
  sessionId: string;
  guestId: string;
  displayName: string;
  presenceStatus: typeof PresenceStatus.PRESENT;
  sessionRole: typeof SessionRole.PARTICIPANT;
  captureSource: typeof CaptureSource.MANUAL;
  biometricEnrollmentId?: never;
}

/**
 * Einwilligungsstatus ausschliesslich fuer die biometrische Identifizierung zur
 * Anwesenheitserfassung. Eine allgemeine Fotoerlaubnis ist davon getrennt.
 */
export interface BiometricConsent {
  memberId: string;
  purpose: typeof ConsentPurpose.BIOMETRIC_ATTENDANCE_IDENTIFICATION;
  status: ConsentStatus;
  policyVersion: string | null;
  decidedAt: string | null;
}
