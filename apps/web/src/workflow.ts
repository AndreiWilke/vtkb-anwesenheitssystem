import {
  CaptureSource,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  validateTrainingSession,
  type AttendanceRecord,
  type GuestAttendance,
} from "@vtkb/shared";

import type {
  AttendanceState,
  LocalGuest,
  Member,
  SessionUiStatus,
  TrainingSessionMock,
} from "./types";

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
          }
        : { presenceStatus: PresenceStatus.ABSENT, sessionRole: null },
    ]),
  );
}

export function presentMemberIds(attendance: AttendanceState): string[] {
  return Object.entries(attendance)
    .filter(([, selection]) => selection.presenceStatus === PresenceStatus.PRESENT)
    .map(([memberId]) => memberId);
}

export function createLocalGuestIdFactory(prefix = "guest"): () => string {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `${prefix}-${String(nextId).padStart(3, "0")}`;
  };
}

export function canCompleteSession(
  session: TrainingSessionMock,
  attendance: AttendanceState,
  guests: readonly LocalGuest[],
  unresolvedProposalCount: number,
  blockedTrialParticipants: ReadonlyArray<{ displayName: string; reason: string }> = [],
): { allowed: boolean; messages: string[] } {
  const attendanceRecords: AttendanceRecord[] = Object.entries(attendance).map(
    ([memberId, selection]) => ({
      sessionId: session.id,
      memberId,
      presenceStatus: selection.presenceStatus,
      sessionRole: selection.sessionRole,
      captureSource: CaptureSource.MANUAL,
    }),
  );
  const guestRecords: GuestAttendance[] = guests.map((guest) => ({
    sessionId: session.id,
    guestId: guest.id,
    displayName: [guest.firstName, guest.lastName].filter(Boolean).join(" "),
    presenceStatus: PresenceStatus.PRESENT,
    sessionRole: SessionRole.PARTICIPANT,
    captureSource: CaptureSource.MANUAL,
  }));
  const issues = validateTrainingSession({
    session: {
      id: session.id,
      templateId: null,
      name: session.name,
      dojo: session.dojo,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      status: TrainingSessionStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      completedByUserId: "demo-user",
    },
    attendance: attendanceRecords,
    guests: guestRecords,
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
