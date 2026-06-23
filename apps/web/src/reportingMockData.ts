import {
  CaptureSource,
  CompensationBillingType,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  type CompensationRate,
} from "@vtkb/shared";

import { members } from "./mockData";
import { createClubDateAtTime } from "./time";
import type { HistoricalTrainingSession, TrainingType } from "./types";

const schedules: ReadonlyArray<{
  day: number;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  name: string;
  trainingType: TrainingType;
  dojo: string;
}> = [
  {
    day: 3,
    startHour: 16,
    startMinute: 0,
    durationMinutes: 75,
    name: "Kindertraining",
    trainingType: "KINDERTRAINING",
    dojo: "Dojo Nord",
  },
  {
    day: 6,
    startHour: 17,
    startMinute: 30,
    durationMinutes: 90,
    name: "Grundlagentraining",
    trainingType: "GRUNDLAGENTRAINING",
    dojo: "Dojo VTKB Berlin",
  },
  {
    day: 8,
    startHour: 19,
    startMinute: 0,
    durationMinutes: 90,
    name: "Fortgeschrittenentraining",
    trainingType: "FORTGESCHRITTENENTRAINING",
    dojo: "Dojo VTKB Berlin",
  },
  {
    day: 11,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 75,
    name: "Jugendtraining",
    trainingType: "JUGENDTRAINING",
    dojo: "Dojo Nord",
  },
  {
    day: 14,
    startHour: 18,
    startMinute: 30,
    durationMinutes: 90,
    name: "Erwachsenentraining",
    trainingType: "ERWACHSENENTRAINING",
    dojo: "Dojo Süd",
  },
  {
    day: 17,
    startHour: 16,
    startMinute: 30,
    durationMinutes: 75,
    name: "Kindertraining",
    trainingType: "KINDERTRAINING",
    dojo: "Dojo Süd",
  },
  {
    day: 20,
    startHour: 17,
    startMinute: 30,
    durationMinutes: 90,
    name: "Grundlagentraining",
    trainingType: "GRUNDLAGENTRAINING",
    dojo: "Dojo VTKB Berlin",
  },
  {
    day: 20,
    startHour: 19,
    startMinute: 0,
    durationMinutes: 90,
    name: "Fortgeschrittenentraining",
    trainingType: "FORTGESCHRITTENENTRAINING",
    dojo: "Dojo VTKB Berlin",
  },
  {
    day: 24,
    startHour: 18,
    startMinute: 0,
    durationMinutes: 90,
    name: "Erwachsenentraining",
    trainingType: "ERWACHSENENTRAINING",
    dojo: "Dojo Nord",
  },
  {
    day: 27,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 75,
    name: "Jugendtraining",
    trainingType: "JUGENDTRAINING",
    dojo: "Dojo Süd",
  },
];

function plusMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  }));
}

export const historicalSessions: HistoricalTrainingSession[] = Array.from(
  { length: 6 },
  (_, monthIndex) =>
    schedules.map((schedule, scheduleIndex) => {
      const month = monthIndex + 1;
      const sequence = monthIndex * schedules.length + scheduleIndex;
      const date = dateKey(2026, month, schedule.day);
      const reference = new Date(`${date}T12:00:00.000Z`);
      const startsAt = createClubDateAtTime(reference, schedule.startHour, schedule.startMinute);
      const endsAt = plusMinutes(startsAt, schedule.durationMinutes);
      const id = `history-2026-${String(month).padStart(2, "0")}-${String(scheduleIndex + 1).padStart(2, "0")}`;
      return {
        id,
        date,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timeZone: "Europe/Berlin" as const,
        name: schedule.name,
        trainingType: schedule.trainingType,
        dojo: schedule.dojo,
        status: TrainingSessionStatus.COMPLETED,
        attendance: attendanceFor(id, sequence),
        completedAt: plusMinutes(endsAt, 5).toISOString(),
        completedBy: sequence % 2 === 0 ? "Vorstand Demo A" : "Trainer Demo B",
      };
    }),
).flat();

export function recordHistoricalSession(session: HistoricalTrainingSession): void {
  if (!historicalSessions.some((existing) => existing.id === session.id)) {
    historicalSessions.push(session);
  }
}

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
