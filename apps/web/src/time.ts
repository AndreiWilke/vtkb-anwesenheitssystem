export const CLUB_TIME_ZONE = "Europe/Berlin";

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const clubPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const clubDateFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: CLUB_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export const clubTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: CLUB_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function clubDateParts(value: Date): DateParts {
  const parts = Object.fromEntries(
    clubPartsFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts as unknown as DateParts;
}

function clubWallTimeToInstant(parts: DateParts): Date {
  const wallTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let instant = wallTimeAsUtc;

  // Intl liefert den realen Berlin-Offset inklusive Sommerzeit. Zwei Iterationen
  // gleichen die UTC-Annahme ohne fest codierten Offset an die Vereinszeit an.
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const represented = clubDateParts(new Date(instant));
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    instant += wallTimeAsUtc - representedAsUtc;
  }

  return new Date(instant);
}

export function createClubDateAtTime(reference: Date, hour: number, minute: number): Date {
  const date = clubDateParts(reference);
  return clubWallTimeToInstant({ ...date, hour, minute, second: 0 });
}
