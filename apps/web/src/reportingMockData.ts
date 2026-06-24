import {
  CaptureSource,
  CompensationBillingType,
  SessionRole,
  TrainingSessionStatus,
  PersonMembershipStatus,
  SCHEDULED_TRAINING_SLOTS,
  dojoById,
  type AttendanceRecord,
  type CompensationRate,
} from "@vtkb/shared";

import { members } from "./mockData";
import { createClubDateFromIso } from "./time";
import type { HistoricalTrainingSession } from "./types";

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function firstDateForWeekday(year: number, month: number, weekday: number): string {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() || 7;
  const day = 1 + ((weekday - firstWeekday + 7) % 7);
  return dateKey(year, month, day);
}

function attendanceFor(sessionId: string, sequence: number): AttendanceRecord[] {
  const responsibleId = sequence % 11 === 0 ? "member-05" : `member-0${(sequence % 4) + 1}`;
  const assistantCount = sequence % 4 === 0 ? 0 : sequence % 3 === 0 ? 2 : 1;
  const assistantCandidates = ["member-05", "member-06", "member-07", "member-08"].filter(
    (id) => id !== responsibleId,
  );
  const roleByMember = new Map<string, AttendanceRecord["sessionRole"]>([
    [responsibleId, SessionRole.RESPONSIBLE_TRAINER],
  ]);
  assistantCandidates.slice(0, assistantCount).forEach((id) => {
    roleByMember.set(id, SessionRole.ASSISTANT_TRAINER);
  });
  const participantCount = 8 + (sequence % 8);
  for (let offset = 0; offset < participantCount; offset += 1) {
    const member = members[(sequence * 3 + offset) % members.length];
    if (member && !roleByMember.has(member.id))
      roleByMember.set(member.id, SessionRole.PARTICIPANT);
  }
  return [...roleByMember].map(([memberId, sessionRole]) => ({
    sessionId,
    memberId,
    presenceStatus: "PRESENT",
    sessionRole,
    captureSource: CaptureSource.MANUAL,
    membershipStatusAtTime: PersonMembershipStatus.ACTIVE_MEMBER,
  }));
}

const generatedHistoricalSessions: HistoricalTrainingSession[] = Array.from(
  { length: 6 },
  (_, monthIndex) =>
    SCHEDULED_TRAINING_SLOTS.map((slot, scheduleIndex) => {
      const month = monthIndex + 1;
      const sequence = monthIndex * SCHEDULED_TRAINING_SLOTS.length + scheduleIndex;
      const date = firstDateForWeekday(2026, month, slot.weekday);
      const startsAt = createClubDateFromIso(date, slot.startTime);
      const endsAt = createClubDateFromIso(date, slot.endTime);
      const dojo = dojoById(slot.dojoId);
      const id = `history-2026-${String(month).padStart(2, "0")}-${String(scheduleIndex + 1).padStart(2, "0")}`;
      return {
        id,
        date,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timeZone: "Europe/Berlin" as const,
        name: slot.name,
        trainingType: slot.trainingType,
        scheduledSlotId: slot.id,
        dojoId: dojo.id,
        dojoNameSnapshot: dojo.name,
        dojo: dojo.name,
        status: TrainingSessionStatus.COMPLETED,
        attendance: attendanceFor(id, sequence),
        completedAt: new Date(endsAt.getTime() + 5 * 60_000).toISOString(),
        completedBy: sequence % 2 === 0 ? "Vorstand Demo A" : "Trainer Demo B",
      };
    }),
).flat();

const trialVisits: Readonly<Record<string, number>> = {
  "trial-001": 0,
  "trial-002": 1,
  "trial-003": 2,
  "trial-004": 3,
  "trial-005": 4,
  "trial-006": 5,
  "trial-007": 4,
};

Object.entries(trialVisits).forEach(([participantId, count]) => {
  generatedHistoricalSessions.slice(0, count).forEach((session) => {
    session.attendance = [
      ...session.attendance,
      {
        sessionId: session.id,
        memberId: participantId,
        presenceStatus: "PRESENT",
        sessionRole: SessionRole.PARTICIPANT,
        captureSource: CaptureSource.MANUAL,
        membershipStatusAtTime: PersonMembershipStatus.TRIAL,
      },
    ];
  });
});

export const initialHistoricalSessions: readonly HistoricalTrainingSession[] = Object.freeze(
  generatedHistoricalSessions.map((session) =>
    Object.freeze({ ...session, attendance: Object.freeze([...session.attendance]) }),
  ),
);

export const initialCompensationRates: CompensationRate[] = [
  {
    id: "rate-responsible-2025",
    label: "Verantwortlicher Trainer · Beispielsatz",
    role: SessionRole.RESPONSIBLE_TRAINER,
    billingType: CompensationBillingType.PER_COMPLETED_SESSION,
    amountCents: 2_000,
    validFrom: "2025-01-01",
    validUntil: null,
    active: true,
  },
  {
    id: "rate-assistant-2025",
    label: "Assistenztrainer · Beispielsatz",
    role: SessionRole.ASSISTANT_TRAINER,
    billingType: CompensationBillingType.PER_COMPLETED_SESSION,
    amountCents: 1_000,
    validFrom: "2025-01-01",
    validUntil: null,
    active: true,
  },
];
