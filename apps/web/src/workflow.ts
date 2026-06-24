import {
  CaptureSource,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  validateTrainingSession,
  type AttendanceRecord,
} from "@vtkb/shared";

import type { AttendanceState, Member, SessionUiStatus, TrainingSessionMock } from "./types";

export function sessionUiStatus(session: TrainingSessionMock, now = new Date()): SessionUiStatus {
  if (now < session.startsAt) return "BEVORSTEHEND";
  if (now < session.endsAt) return "LAEUFT";
  return "BEENDET";
}

export function suggestSession(
  sessions: readonly TrainingSessionMock[],
  now = new Date(),
): TrainingSessionMock {
  const running = sessions.find((session) => sessionUiStatus(session, now) === "LAEUFT");
  if (running) return running;
  const upcoming = sessions.find((session) => session.startsAt > now);
  return upcoming ?? sessions.at(-1) ?? sessions[0]!;
}

export function hasParallelSessionChoice(
  sessions: readonly TrainingSessionMock[],
  selected: TrainingSessionMock,
): boolean {
  return sessions.some(
    (session) =>
      session.id !== selected.id &&
      session.startsAt.getTime() === selected.startsAt.getTime() &&
      session.dojoId !== selected.dojoId,
  );
}

export function createInitialAttendance(
  members: readonly Member[],
  session: TrainingSessionMock,
): AttendanceState {
  return Object.fromEntries(
    members.map((member) => [
      member.id,
      member.id === session.responsibleTrainerId
        ? {
            presenceStatus: PresenceStatus.PRESENT,
            sessionRole: SessionRole.RESPONSIBLE_TRAINER,
            captureSource: CaptureSource.PREVIOUS_SESSION_SUGGESTION,
          }
        : session.assistantTrainerIds.includes(member.id)
          ? {
              presenceStatus: PresenceStatus.PRESENT,
              sessionRole: SessionRole.ASSISTANT_TRAINER,
              captureSource: CaptureSource.PREVIOUS_SESSION_SUGGESTION,
            }
          : {
              presenceStatus: PresenceStatus.ABSENT,
              sessionRole: null,
              captureSource: CaptureSource.MANUAL,
            },
    ]),
  );
}

export function presentMemberIds(attendance: AttendanceState): string[] {
  return Object.entries(attendance)
    .filter(([, selection]) => selection.presenceStatus === PresenceStatus.PRESENT)
    .map(([memberId]) => memberId);
}

export function attendanceRecordsForSession(
  session: TrainingSessionMock,
  attendance: AttendanceState,
): AttendanceRecord[] {
  return Object.entries(attendance)
    .filter(([, selection]) => selection.presenceStatus === PresenceStatus.PRESENT)
    .map(([memberId, selection]) => ({
      sessionId: session.id,
      memberId,
      presenceStatus: selection.presenceStatus,
      sessionRole: selection.sessionRole,
      captureSource: selection.captureSource,
    }));
}

export function canCompleteSession(
  session: TrainingSessionMock,
  attendance: AttendanceState,
  unresolvedProposalCount: number,
  blockedTrialParticipants: ReadonlyArray<{ displayName: string; reason: string }> = [],
): { allowed: boolean; messages: string[] } {
  const attendanceRecords: AttendanceRecord[] = Object.entries(attendance).map(
    ([memberId, selection]) => ({
      sessionId: session.id,
      memberId,
      presenceStatus: selection.presenceStatus,
      sessionRole: selection.sessionRole,
      captureSource: selection.captureSource,
    }),
  );
  const issues = validateTrainingSession({
    session: {
      id: session.id,
      templateId: null,
      scheduledSlotId: session.scheduledSlotId,
      name: session.name,
      trainingType: session.trainingType,
      dojoId: session.dojoId,
      dojoNameSnapshot: session.dojoNameSnapshot,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      status: TrainingSessionStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      completedByUserId: "demo-user",
    },
    attendance: attendanceRecords,
  });
  const messages = issues.map((issue) => issue.message);
  if (unresolvedProposalCount > 0) {
    messages.push(
      `${unresolvedProposalCount} Foto-Demovorschlag/-vorschlaege sind noch ungeklaert.`,
    );
  }
  for (const blocked of blockedTrialParticipants) {
    messages.push(`Probetraining gesperrt – ${blocked.displayName}: ${blocked.reason}`);
  }
  return { allowed: messages.length === 0, messages };
}
