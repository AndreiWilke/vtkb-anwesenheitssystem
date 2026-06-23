/**
 * Fachlogik fuer Probetraining, Teilnahme-Zaehlung, Sperren und Vorstandsausnahmen.
 *
 * Alle Funktionen sind zustandslos und rein berechenbar – keine React-Abhaengigkeit.
 *
 * Fiktiver Demo-Katalog. Die VTKB-Pruefungsordnung wird erst in Paket 3+
 * durch den Verein bestaetigt.
 */

import {
  ContractStatus,
  PersonMembershipStatus,
  PresenceStatus,
  TrainingSessionStatus,
  TrialOverrideStatus,
  type AttendanceRecord,
  type ContractStatus as ContractStatusValue,
  type PersonMembershipStatus as PersonMembershipStatusValue,
  type TrialOverrideStatus as TrialOverrideStatusValue,
  type TrialParticipant,
} from "./domain.js";

export const MAX_FREE_TRIAL_SESSIONS = 4;

// ---------------------------------------------------------------------------
// Erlaubte Vertragsstatus-Uebergaenge
// ---------------------------------------------------------------------------

const allowedContractTransitions: Record<ContractStatusValue, readonly ContractStatusValue[]> = {
  NOT_ISSUED: [ContractStatus.ISSUED],
  ISSUED: [ContractStatus.RECEIVED, ContractStatus.NOT_ISSUED],
  RECEIVED: [ContractStatus.MEMBERSHIP_ACTIVATED],
  MEMBERSHIP_ACTIVATED: [],
};

export function canTransitionContract(from: ContractStatusValue, to: ContractStatusValue): boolean {
  return allowedContractTransitions[from].includes(to);
}

export function transitionContract(
  from: ContractStatusValue,
  to: ContractStatusValue,
): ContractStatusValue {
  if (!canTransitionContract(from, to)) {
    throw new Error(`Vertragsstatusuebergang von ${from} nach ${to} ist nicht zulaessig.`);
  }
  return to;
}

// ---------------------------------------------------------------------------
// Probetraining-Zaehlung (aus Anwesenheitshistorie)
// ---------------------------------------------------------------------------

export interface TrialSessionRecord {
  sessionId: string;
  sessionDate: string;
  sessionStatus: string;
  participantId: string;
  presenceStatus: string;
  membershipStatusAtTime: PersonMembershipStatusValue;
}

/**
 * Zaehlt die tatsaechlich besuchten kostenlosen Probetrainings einer Person.
 *
 * Es zaehlt ausschliesslich:
 *   - membershipStatusAtTime === TRIAL
 *   - presenceStatus === PRESENT
 *   - sessionStatus === COMPLETED
 *   - keine doppelten sessionIds
 */
export function countTrialSessionsAttended(records: readonly TrialSessionRecord[]): number {
  const seen = new Set<string>();
  let count = 0;
  for (const record of records) {
    if (
      record.membershipStatusAtTime === PersonMembershipStatus.TRIAL &&
      record.presenceStatus === PresenceStatus.PRESENT &&
      record.sessionStatus === TrainingSessionStatus.COMPLETED &&
      !seen.has(record.sessionId)
    ) {
      seen.add(record.sessionId);
      count += 1;
    }
  }
  return count;
}

export function remainingFreeTrialSessions(attendedCount: number): number {
  return Math.max(0, MAX_FREE_TRIAL_SESSIONS - attendedCount);
}

// ---------------------------------------------------------------------------
// Teilnahme-Berechtigung
// ---------------------------------------------------------------------------

export interface TrialEligibilityInput {
  attendedCount: number;
  contractStatus: ContractStatusValue;
  membershipStatus: PersonMembershipStatusValue;
  overrideStatus: TrialOverrideStatusValue;
  overrideUsed: boolean;
}

export interface TrialEligibilityResult {
  allowed: boolean;
  reason: string | null;
  /** true = vierte Einheit, Vertragshinweis anzeigen */
  showContractWarning: boolean;
  /** true = dritte Einheit, Vorbereitungshinweis anzeigen */
  showPrepareWarning: boolean;
}

/**
 * Prueft, ob ein Probetrainingsteilnehmer an einer weiteren Einheit teilnehmen darf.
 *
 * Erlaubt, wenn mindestens eine Bedingung gilt:
 *   1. attendedCount < MAX_FREE_TRIAL_SESSIONS
 *   2. contractStatus ist RECEIVED oder MEMBERSHIP_ACTIVATED
 *   3. Vorstandsausnahme genehmigt und noch nicht verwendet
 */
export function checkTrialEligibility(input: TrialEligibilityInput): TrialEligibilityResult {
  const { attendedCount, contractStatus, membershipStatus, overrideStatus, overrideUsed } = input;

  // Aktive Mitglieder sind immer berechtigt
  if (
    membershipStatus === PersonMembershipStatus.ACTIVE_MEMBER ||
    contractStatus === ContractStatus.MEMBERSHIP_ACTIVATED
  ) {
    return {
      allowed: true,
      reason: null,
      showContractWarning: false,
      showPrepareWarning: false,
    };
  }

  // MEMBERSHIP_ACTIVATED wurde oben bereits als early-return behandelt;
  // hier kann contractStatus nur noch NOT_ISSUED, ISSUED oder RECEIVED sein.
  const hasContract = contractStatus === ContractStatus.RECEIVED;

  const hasUnusedOverride =
    overrideStatus === TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED && !overrideUsed;

  if (attendedCount < MAX_FREE_TRIAL_SESSIONS) {
    return {
      allowed: true,
      reason: null,
      showContractWarning: attendedCount === MAX_FREE_TRIAL_SESSIONS - 1,
      showPrepareWarning: attendedCount === MAX_FREE_TRIAL_SESSIONS - 2,
    };
  }

  // attendedCount >= 4: ohne Vertrag oder Ausnahme gesperrt
  if (hasContract) {
    return {
      allowed: true,
      reason: null,
      showContractWarning: false,
      showPrepareWarning: false,
    };
  }

  if (hasUnusedOverride) {
    return {
      allowed: true,
      reason: null,
      showContractWarning: false,
      showPrepareWarning: false,
    };
  }

  return {
    allowed: false,
    reason:
      "Vier kostenlose Probetrainings wurden bereits genutzt. " +
      "Vertrag bestaetigen oder Vorstandsausnahme erfassen.",
    showContractWarning: true,
    showPrepareWarning: false,
  };
}

// ---------------------------------------------------------------------------
// Vorstandsausnahme verwenden
// ---------------------------------------------------------------------------

export function useTrialOverride(participant: TrialParticipant): TrialParticipant {
  if (participant.overrideStatus !== TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED) {
    throw new Error("Keine genehmigte Vorstandsausnahme vorhanden.");
  }
  if (participant.overrideUsed) {
    throw new Error("Die Vorstandsausnahme wurde bereits verwendet.");
  }
  return { ...participant, overrideUsed: true };
}

// ---------------------------------------------------------------------------
// AttendanceRecord-basierte Zaehlung (fuer App-interne Nutzung)
// ---------------------------------------------------------------------------

/**
 * Berechnet die Anzahl besuchter Probetrainings direkt aus Attendance-Datensaetzen.
 * Verwendet, wenn keine TrialSessionRecord-Struktur vorliegt, sondern rohe
 * AttendanceRecords und Session-Metadaten zusammengefuehrt werden.
 */
export function countTrialAttendancesFromRecords(
  participantId: string,
  attendanceRecords: ReadonlyArray<
    AttendanceRecord & {
      sessionStatus: string;
      membershipStatusAtTime: PersonMembershipStatusValue;
    }
  >,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const record of attendanceRecords) {
    if (
      record.memberId === participantId &&
      record.membershipStatusAtTime === PersonMembershipStatus.TRIAL &&
      record.presenceStatus === PresenceStatus.PRESENT &&
      record.sessionStatus === TrainingSessionStatus.COMPLETED &&
      !seen.has(record.sessionId)
    ) {
      seen.add(record.sessionId);
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// ID-Generator fuer TrialParticipant
// ---------------------------------------------------------------------------

export function createTrialParticipantIdGenerator(existingIds: readonly string[]): () => string {
  const issued = new Set(existingIds);
  let seq = 1;
  return () => {
    let candidate = `trial-${String(seq).padStart(3, "0")}`;
    while (issued.has(candidate)) {
      seq += 1;
      candidate = `trial-${String(seq).padStart(3, "0")}`;
    }
    issued.add(candidate);
    seq += 1;
    return candidate;
  };
}
