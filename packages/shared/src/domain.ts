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
  ASSISTANT_TRAINER: "ASSISTANT_TRAINER",
  BOARD: "BOARD",
  TREASURER: "TREASURER",
} as const;

export type DemoRole = (typeof DemoRole)[keyof typeof DemoRole];

// ---------------------------------------------------------------------------
// Paket 1.2 – Personenmodell, Probetraining, Vertragsstatus
// ---------------------------------------------------------------------------

/**
 * Mitgliedschaftsstatus einer Person.
 * TRIAL            = Probetrainingsteilnehmer (dauerhaftes Profil, noch kein Mitglied)
 * ACTIVE_MEMBER    = regulaeres aktives Mitglied
 * INACTIVE_MEMBER  = inaktives Mitglied
 */
export const PersonMembershipStatus = {
  TRIAL: "TRIAL",
  ACTIVE_MEMBER: "ACTIVE_MEMBER",
  INACTIVE_MEMBER: "INACTIVE_MEMBER",
} as const;

export type PersonMembershipStatus =
  (typeof PersonMembershipStatus)[keyof typeof PersonMembershipStatus];

/**
 * Vertragsstatus eines Probetrainingsteilnehmers.
 * NOT_ISSUED            = Vertrag noch nicht ausgegeben
 * ISSUED                = Vertrag ausgegeben, noch nicht eingegangen
 * RECEIVED              = Vertrag eingegangen, Aktivierung ausstehend
 * MEMBERSHIP_ACTIVATED  = Mitglied aktiviert (Umwandlung abgeschlossen)
 */
export const ContractStatus = {
  NOT_ISSUED: "NOT_ISSUED",
  ISSUED: "ISSUED",
  RECEIVED: "RECEIVED",
  MEMBERSHIP_ACTIVATED: "MEMBERSHIP_ACTIVATED",
} as const;

export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

/**
 * Vorstandsausnahme fuer genau eine weitere Probetrainingseinheit nach Ausschoepfung der vier kostenlosen.
 * NONE                            = keine Ausnahme erteilt
 * ONE_ADDITIONAL_SESSION_APPROVED = genau eine zusaetzliche Einheit genehmigt
 */
export const TrialOverrideStatus = {
  NONE: "NONE",
  ONE_ADDITIONAL_SESSION_APPROVED: "ONE_ADDITIONAL_SESSION_APPROVED",
} as const;

export type TrialOverrideStatus =
  (typeof TrialOverrideStatus)[keyof typeof TrialOverrideStatus];

/** Quelle einer Guertelaenderung */
export const BeltChangeSource = {
  MANUAL_CONFIRMED: "MANUAL_CONFIRMED",
  IMAGE_SUGGESTION_CONFIRMED: "IMAGE_SUGGESTION_CONFIRMED",
  BOARD_CORRECTION: "BOARD_CORRECTION",
} as const;

export type BeltChangeSource = (typeof BeltChangeSource)[keyof typeof BeltChangeSource];

/** Status eines lokalen Gurtvorschlags aus der Foto-Demo */
export const BeltSuggestionStatus = {
  OPEN: "OPEN",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  DEFERRED: "DEFERRED",
} as const;

export type BeltSuggestionStatus =
  (typeof BeltSuggestionStatus)[keyof typeof BeltSuggestionStatus];

/** Dauerhaftes Profil eines Probetrainingsteilnehmers */
export interface TrialParticipant {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  ageGroup: "KIND" | "JUGEND" | "ERWACHSEN";
  birthYear: number;
  /** Fiktiver Ansprechpartner – nur bei Minderjaehrigen angeben */
  contactName?: string;
  /** Fiktive Telefonnummer */
  contactPhone?: string;
  /** Fiktive E-Mail-Adresse */
  contactEmail?: string;
  createdAt: string;
  firstTrialDate: string | null;
  lastTrialDate: string | null;
  contractStatus: ContractStatus;
  overrideStatus: TrialOverrideStatus;
  overrideGrantedBy?: string;
  overrideGrantedAt?: string;
  overrideReason?: string;
  overrideUsed: boolean;
  membershipStatus: PersonMembershipStatus;
  /** Gesetzt nach erfolgreicher Umwandlung zum regulaeren Mitglied */
  memberId?: string;
  beltColor?: string;
  beltGrade?: string;
  active: boolean;
  note?: string;
}

/** Unveraenderlicher Eintrag in der Guertelhistorie einer Person */
export interface BeltHistoryEntry {
  id: string;
  personId: string;
  previousBeltColor: string | null;
  previousBeltGrade: string | null;
  newBeltColor: string;
  newBeltGrade: string;
  effectiveFrom: string;
  examDate?: string;
  examiner?: string;
  recordedBy: string;
  recordedAt: string;
  note?: string;
  source: BeltChangeSource;
}

/** Lokaler Gurtvorschlag aus der Foto-Demo fuer ein Mitglied */
export interface BeltSuggestion {
  id: string;
  sessionId: string;
  sessionDate: string;
  memberId: string;
  storedBeltColor: string;
  suggestedBeltColor: string;
  confidencePercent: number;
  status: BeltSuggestionStatus;
  decidedBy?: string;
  decidedAt?: string;
  historyEntryId?: string;
}

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
