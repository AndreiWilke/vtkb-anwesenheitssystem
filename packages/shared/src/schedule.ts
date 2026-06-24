export const CLUB_TIME_ZONE = "Europe/Berlin" as const;

const berlinPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface BerlinDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function berlinParts(value: Date): BerlinDateTimeParts {
  return Object.fromEntries(
    berlinPartsFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as unknown as BerlinDateTimeParts;
}

export function berlinLocalDateTimeToIso(date: string, time: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) throw new Error("Ungültiges Berlin-Datum oder ungültige Uhrzeit.");
  const wallAsUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  let instant = wallAsUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const represented = berlinParts(new Date(instant));
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    instant += wallAsUtc - representedAsUtc;
  }
  return new Date(instant).toISOString();
}

export function berlinClockFromIso(instant: string): string {
  const parts = berlinParts(new Date(instant));
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export interface DojoMasterData {
  id: string;
  name: string;
  active: boolean;
}

export interface ScheduledTrainingSlot {
  id: string;
  dojoId: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
  name: string;
  trainingType: "ALLGEMEINES_TRAINING";
  timeZone: typeof CLUB_TIME_ZONE;
}

export const DOJOS: readonly DojoMasterData[] = [
  { id: "dojo-seikatsu", name: "Seikatsu Dojo", active: true },
  { id: "dojo-ebereschen", name: "Ebereschen Dojo", active: true },
  { id: "dojo-senshi", name: "Senshi Dojo", active: true },
  { id: "dojo-musashi", name: "Musashi Dojo", active: true },
] as const;

export const SCHEDULED_TRAINING_SLOTS: readonly ScheduledTrainingSlot[] = [
  slot("mon-ebereschen-1600", "dojo-ebereschen", 1, "16:00", "17:00"),
  slot("mon-seikatsu-1700", "dojo-seikatsu", 1, "17:00", "18:00"),
  slot("mon-seikatsu-1800", "dojo-seikatsu", 1, "18:00", "19:30"),
  slot("wed-ebereschen-1600", "dojo-ebereschen", 3, "16:00", "17:00"),
  slot("wed-senshi-1600", "dojo-senshi", 3, "16:00", "18:00"),
  slot("thu-musashi-1700", "dojo-musashi", 4, "17:00", "18:00"),
  slot("thu-musashi-1800", "dojo-musashi", 4, "18:00", "19:00"),
  slot("thu-musashi-1900", "dojo-musashi", 4, "19:00", "20:00"),
  slot("fri-seikatsu-1730", "dojo-seikatsu", 5, "17:30", "18:15"),
  slot("fri-seikatsu-1815", "dojo-seikatsu", 5, "18:15", "19:00"),
  slot("fri-seikatsu-1900", "dojo-seikatsu", 5, "19:00", "20:00"),
] as const;

function slot(
  id: string,
  dojoId: string,
  weekday: ScheduledTrainingSlot["weekday"],
  startTime: string,
  endTime: string,
): ScheduledTrainingSlot {
  return {
    id,
    dojoId,
    weekday,
    startTime,
    endTime,
    name: "Training",
    trainingType: "ALLGEMEINES_TRAINING",
    timeZone: CLUB_TIME_ZONE,
  };
}

export function dojoById(dojoId: string): DojoMasterData {
  const dojo = DOJOS.find((candidate) => candidate.id === dojoId);
  if (!dojo) throw new Error(`Unbekanntes Dojo: ${dojoId}.`);
  return dojo;
}

export function slotsForWeekday(weekday: number): ScheduledTrainingSlot[] {
  return SCHEDULED_TRAINING_SLOTS.filter((slot) => slot.weekday === weekday).sort(
    (left, right) =>
      left.startTime.localeCompare(right.startTime) ||
      dojoById(left.dojoId).name.localeCompare(dojoById(right.dojoId).name, "de"),
  );
}

export function scheduledSlotsOverlap(
  left: Pick<ScheduledTrainingSlot, "dojoId" | "weekday" | "startTime" | "endTime">,
  right: Pick<ScheduledTrainingSlot, "dojoId" | "weekday" | "startTime" | "endTime">,
): boolean {
  return (
    left.dojoId === right.dojoId &&
    left.weekday === right.weekday &&
    left.startTime < right.endTime &&
    right.startTime < left.endTime
  );
}

export function validateScheduledTrainingSlots(slots: readonly ScheduledTrainingSlot[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  slots.forEach((slot, index) => {
    if (ids.has(slot.id)) issues.push(`Doppelte Trainingszeit-ID: ${slot.id}.`);
    ids.add(slot.id);
    if (!DOJOS.some((dojo) => dojo.id === slot.dojoId && dojo.active)) {
      issues.push(`Trainingszeit ${slot.id} verweist auf ein unbekanntes oder inaktives Dojo.`);
    }
    slots.slice(index + 1).forEach((other) => {
      if (scheduledSlotsOverlap(slot, other)) {
        issues.push(`Trainingszeiten ${slot.id} und ${other.id} ueberlappen im selben Dojo.`);
      }
    });
  });
  return issues;
}
