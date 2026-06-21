/**
 * Paket 1.3 – Konvertierungslogik TrialParticipant → Mitglied
 *
 * Alle Funktionen sind zustandslos und rein berechenbar.
 *
 * Fachregeln:
 *   - Die gesamte Anwesenheitshistorie bleibt erhalten (memberId = neue Mitglieds-ID).
 *   - Ein TrialParticipant wird nicht geloescht, sondern erhaelt membershipStatus = ACTIVE_MEMBER.
 *   - Jede Umwandlung erzeugt einen AuditEntry.
 *   - Direktanlage eines Mitglieds ohne Probetraining ist ebenfalls moeglich.
 *   - Kein Force-Update: contractStatus muss RECEIVED oder MEMBERSHIP_ACTIVATED sein.
 */

import {
  ContractStatus,
  MemberQualification,
  PersonMembershipStatus,
  type AuditEntry,
  type MemberQualification as MemberQualificationValue,
  type TrialParticipant,
} from "./domain.js";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface ConversionInput {
  participant: TrialParticipant;
  newMemberId: string;
  memberNumber: string;
  qualification: MemberQualificationValue;
  convertedBy: string;
  convertedAt: string;
  note?: string;
}

export interface ConversionResult {
  updatedParticipant: TrialParticipant;
  auditEntry: AuditEntry;
  newMemberId: string;
  memberNumber: string;
}

export interface DirectMemberInput {
  id: string;
  firstName: string;
  lastName: string;
  ageGroup: "KIND" | "JUGEND" | "ERWACHSEN";
  birthYear: number;
  beltColor?: string;
  beltGrade?: string;
  qualification?: MemberQualificationValue;
  memberNumber: string;
  createdBy: string;
  createdAt: string;
  note?: string;
}

export interface DirectMemberResult {
  memberId: string;
  memberNumber: string;
  displayName: string;
  ageGroup: "KIND" | "JUGEND" | "ERWACHSEN";
  birthYear: number;
  beltColor: string;
  beltGrade: string;
  qualification: MemberQualificationValue;
  membershipStatus: typeof PersonMembershipStatus.ACTIVE_MEMBER;
  active: boolean;
  note?: string;
  auditEntry: AuditEntry;
}

// ---------------------------------------------------------------------------
// Vorbedingungspruefung
// ---------------------------------------------------------------------------

export interface ConversionEligibilityResult {
  eligible: boolean;
  reason: string | null;
}

/**
 * Prueft, ob ein TrialParticipant in ein regulaeres Mitglied umgewandelt werden darf.
 *
 * Voraussetzungen:
 *   - membershipStatus === TRIAL (noch kein Mitglied)
 *   - contractStatus === RECEIVED oder MEMBERSHIP_ACTIVATED
 *   - active === true
 *   - memberId noch nicht gesetzt (keine Doppelkonvertierung)
 */
export function checkConversionEligibility(
  participant: TrialParticipant,
): ConversionEligibilityResult {
  if (participant.membershipStatus !== PersonMembershipStatus.TRIAL) {
    return {
      eligible: false,
      reason: `Person ist bereits ${participant.membershipStatus === PersonMembershipStatus.ACTIVE_MEMBER ? "ein aktives Mitglied" : "ein inaktives Mitglied"}.`,
    };
  }
  if (participant.memberId) {
    return {
      eligible: false,
      reason: "Person wurde bereits umgewandelt (memberId gesetzt).",
    };
  }
  if (!participant.active) {
    return { eligible: false, reason: "Inaktive Profile koennen nicht umgewandelt werden." };
  }
  if (
    participant.contractStatus !== ContractStatus.RECEIVED &&
    participant.contractStatus !== ContractStatus.MEMBERSHIP_ACTIVATED
  ) {
    return {
      eligible: false,
      reason: `Vertragsstatus muss RECEIVED oder MEMBERSHIP_ACTIVATED sein (aktuell: ${participant.contractStatus}).`,
    };
  }
  return { eligible: true, reason: null };
}

// ---------------------------------------------------------------------------
// Umwandlung TrialParticipant → Mitglied
// ---------------------------------------------------------------------------

/**
 * Wandelt einen TrialParticipant in ein regulaeres Mitglied um.
 *
 * Die Funktion gibt den aktualisierten Teilnehmer zurueck (kein Loeschen),
 * sowie eine AuditEntry, die die Umwandlung dokumentiert.
 *
 * Die Anwesenheitshistorie bleibt implizit erhalten: Attendance-Records
 * mit memberId === participant.id werden nach der Konvertierung unter
 * der neuen memberId weitergefuehrt (ID ist unveraendert, wenn newMemberId === participant.id).
 */
export function convertTrialParticipantToMember(
  input: ConversionInput,
): ConversionResult {
  const eligibility = checkConversionEligibility(input.participant);
  if (!eligibility.eligible) {
    throw new Error(`Umwandlung nicht moeglich: ${eligibility.reason}`);
  }

  const updatedParticipant: TrialParticipant = {
    ...input.participant,
    membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER,
    contractStatus: ContractStatus.MEMBERSHIP_ACTIVATED,
    memberId: input.newMemberId,
    note: input.note
      ? `${input.participant.note ? input.participant.note + " | " : ""}${input.note}`
      : input.participant.note,
  };

  const auditEntry: AuditEntry = {
    id: `audit-conv-${input.newMemberId}`,
    occurredAt: input.convertedAt,
    actor: input.convertedBy,
    action: "TRIAL_CONVERTED_TO_MEMBER",
    object: `TrialParticipant:${input.participant.id}`,
    previousValue: PersonMembershipStatus.TRIAL,
    newValue: `${PersonMembershipStatus.ACTIVE_MEMBER}:${input.newMemberId}`,
    reason: input.note ?? null,
  };

  return {
    updatedParticipant,
    auditEntry,
    newMemberId: input.newMemberId,
    memberNumber: input.memberNumber,
  };
}

// ---------------------------------------------------------------------------
// Direkte Mitgliedsanlage (ohne Probetraining)
// ---------------------------------------------------------------------------

/**
 * Legt ein Mitglied direkt an, ohne Probetraining-Vorgeschichte.
 * Wird verwendet, wenn jemand sofort Mitglied werden moechte (z.B. nach
 * Vereinswechsel oder auf Vorstandseinladung).
 */
export function createDirectMember(input: DirectMemberInput): DirectMemberResult {
  if (!input.firstName.trim()) throw new Error("Vorname darf nicht leer sein.");
  if (!input.lastName.trim()) throw new Error("Nachname darf nicht leer sein.");
  if (!input.memberNumber.trim()) throw new Error("Mitgliedsnummer darf nicht leer sein.");

  const displayName = `${input.lastName.trim()}, ${input.firstName.trim()}`;
  const beltColor = input.beltColor ?? "WEISS";
  const beltGrade = input.beltGrade ?? "9. Kyu";
  const qualification = input.qualification ?? MemberQualification.NONE;

  const auditEntry: AuditEntry = {
    id: `audit-direct-${input.id}`,
    occurredAt: input.createdAt,
    actor: input.createdBy,
    action: "DIRECT_MEMBER_CREATED",
    object: `Member:${input.id}`,
    previousValue: null,
    newValue: `${displayName}:${input.memberNumber}`,
    reason: input.note ?? null,
  };

  return {
    memberId: input.id,
    memberNumber: input.memberNumber,
    displayName,
    ageGroup: input.ageGroup,
    birthYear: input.birthYear,
    beltColor,
    beltGrade,
    qualification,
    membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER,
    active: true,
    note: input.note,
    auditEntry,
  };
}

// ---------------------------------------------------------------------------
// Vorstandsausnahme erteilen
// ---------------------------------------------------------------------------

export interface BoardOverrideInput {
  participant: TrialParticipant;
  grantedBy: string;
  grantedAt: string;
  reason: string;
}

export interface BoardOverrideResult {
  updatedParticipant: TrialParticipant;
  auditEntry: AuditEntry;
}

/**
 * Erteilt einem Probetrainingsteilnehmer genau eine zusaetzliche Einheit
 * als Vorstandsausnahme.
 *
 * Vorbedingungen:
 *   - overrideStatus === NONE (noch keine Ausnahme erteilt)
 *   - membershipStatus === TRIAL
 *   - reason nicht leer (Begruendungspflicht)
 */
export function grantBoardOverride(input: BoardOverrideInput): BoardOverrideResult {
  const { participant, grantedBy, grantedAt, reason } = input;

  if (!reason.trim()) {
    throw new Error("Begruendung fuer Vorstandsausnahme ist Pflicht.");
  }
  if (participant.membershipStatus !== PersonMembershipStatus.TRIAL) {
    throw new Error("Vorstandsausnahme nur fuer Probetrainingsteilnehmer moeglich.");
  }
  if (participant.overrideStatus !== "NONE") {
    throw new Error("Eine Vorstandsausnahme wurde bereits erteilt.");
  }

  const updatedParticipant: TrialParticipant = {
    ...participant,
    overrideStatus: "ONE_ADDITIONAL_SESSION_APPROVED",
    overrideGrantedBy: grantedBy,
    overrideGrantedAt: grantedAt,
    overrideReason: reason.trim(),
    overrideUsed: false,
  };

  const auditEntry: AuditEntry = {
    id: `audit-override-${participant.id}-${grantedAt}`,
    occurredAt: grantedAt,
    actor: grantedBy,
    action: "BOARD_OVERRIDE_GRANTED",
    object: `TrialParticipant:${participant.id}`,
    previousValue: "NONE",
    newValue: "ONE_ADDITIONAL_SESSION_APPROVED",
    reason: reason.trim(),
  };

  return { updatedParticipant, auditEntry };
}
