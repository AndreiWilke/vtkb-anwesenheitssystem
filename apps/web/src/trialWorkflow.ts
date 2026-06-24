/**
 * App-seitige Probetraining-Workflow-Logik.
 *
 * Verbindet shared/trial.ts mit dem bestehenden App-Zustand
 * (AttendanceState, TrainingSessionMock, HistoricalTrainingSession).
 * Keine direkten React-Imports – nur reine Funktionen.
 */

import {
  ContractStatus,
  PersonMembershipStatus,
  PresenceStatus,
  TrialOverrideStatus,
  checkTrialEligibility,
  countTrialSessionsAttended,
} from "@vtkb/shared";

import type { HistoricalTrainingSession, TrialParticipant } from "./types";

// ---------------------------------------------------------------------------
// Besuchte Probetraining-Einheiten aus Historien-Sessions zaehlen
// ---------------------------------------------------------------------------

export interface TrialSessionCount {
  attended: number;
  remaining: number;
}

export function computeTrialSessionCount(
  participantId: string,
  history: readonly HistoricalTrainingSession[],
): TrialSessionCount {
  const records = history.flatMap((session) =>
    session.attendance
      .filter(
        (record) =>
          record.memberId === participantId && record.presenceStatus === PresenceStatus.PRESENT,
      )
      .map((record) => ({
        sessionId: session.id,
        sessionDate: session.date,
        participantId,
        presenceStatus: record.presenceStatus,
        sessionStatus: session.status,
        membershipStatusAtTime:
          record.membershipStatusAtTime ?? PersonMembershipStatus.ACTIVE_MEMBER,
      })),
  );

  const attended = countTrialSessionsAttended(records);
  const MAX = 4;
  return { attended, remaining: Math.max(0, MAX - attended) };
}

// ---------------------------------------------------------------------------
// Anwesenheits-Sperre fuer canCompleteSession (Paket 1.2)
// ---------------------------------------------------------------------------

export interface TrialBlockEntry {
  participantId: string;
  displayName: string;
  reason: string;
}

/**
 * Gibt alle Probetrainingsteilnehmer zurueck, die in der aktuellen Sitzung
 * als PRESENT markiert sind, aber gemaess 4-Einheiten-Regel gesperrt sind.
 *
 * Wird von canCompleteSession verwendet, um die Sitzungsabschluss-Validierung
 * um Probetraining-Sperren zu erweitern.
 */
export function blockedTrialParticipantsInSession(
  presentTrialIds: readonly string[],
  participants: readonly TrialParticipant[],
  history: readonly HistoricalTrainingSession[],
): TrialBlockEntry[] {
  return presentTrialIds.flatMap((id) => {
    const participant = participants.find((p) => p.id === id);
    if (!participant) return [];

    const { attended } = computeTrialSessionCount(id, history);

    const eligibility = checkTrialEligibility({
      attendedCount: attended,
      contractStatus: participant.contractStatus,
      membershipStatus: participant.membershipStatus,
      overrideStatus: participant.overrideStatus,
      overrideUsed: participant.overrideUsed,
    });

    if (eligibility.allowed) return [];

    return [
      {
        participantId: id,
        displayName: participant.displayName,
        reason: eligibility.reason ?? "Probetraining-Sperre",
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Neue TrialParticipant-Vorlage erstellen
// ---------------------------------------------------------------------------

export function buildNewTrialParticipant(
  id: string,
  input: {
    firstName: string;
    lastName: string;
    gender: "MAENNLICH" | "WEIBLICH";
    birthDate: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    note?: string;
  },
  now: string,
): TrialParticipant {
  return {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: `${input.lastName.trim()}, ${input.firstName.trim()}`,
    gender: input.gender,
    birthDate: input.birthDate,
    contactName: input.contactName?.trim(),
    contactPhone: input.contactPhone?.trim(),
    contactEmail: input.contactEmail?.trim(),
    createdAt: now,
    firstTrialDate: null,
    lastTrialDate: null,
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    active: true,
    note: input.note?.trim(),
  };
}

// ---------------------------------------------------------------------------
// Warnhinweise fuer UI (Vorbereitung / Vertragsabschluss)
// ---------------------------------------------------------------------------

export interface TrialWarning {
  kind: "PREPARE" | "CONTRACT_NEEDED" | "BLOCKED";
  message: string;
}

export function getTrialWarning(
  participant: TrialParticipant,
  history: readonly HistoricalTrainingSession[],
): TrialWarning | null {
  const { attended } = computeTrialSessionCount(participant.id, history);

  const eligibility = checkTrialEligibility({
    attendedCount: attended,
    contractStatus: participant.contractStatus,
    membershipStatus: participant.membershipStatus,
    overrideStatus: participant.overrideStatus,
    overrideUsed: participant.overrideUsed,
  });

  if (!eligibility.allowed) {
    return {
      kind: "BLOCKED",
      message: eligibility.reason ?? "Weitere Teilnahme gesperrt. Bitte Vertragsstatus pruefen.",
    };
  }
  if (eligibility.showContractWarning) {
    return {
      kind: "CONTRACT_NEEDED",
      message:
        `${participant.displayName} nimmt heute an der 4. kostenlosen Probeeinheit teil. ` +
        "Bitte Mitgliedsvertrag vorbereiten.",
    };
  }
  if (eligibility.showPrepareWarning) {
    return {
      kind: "PREPARE",
      message:
        `${participant.displayName} nimmt heute an der 3. Probeeinheit teil. ` +
        "Beim naechsten Training Vertrag mitbringen.",
    };
  }
  return null;
}
