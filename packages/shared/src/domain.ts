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
  COMPLETED: "COMPLETED",
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
