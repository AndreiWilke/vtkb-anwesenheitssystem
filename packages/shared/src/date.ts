const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const GERMAN_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const daysPerMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (daysPerMonth[month - 1] ?? 0);
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  return isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatGermanDate(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function parseGermanDate(value: string): string | null {
  const match = GERMAN_DATE_PATTERN.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function isValidGermanDate(value: string): boolean {
  return parseGermanDate(value) !== null;
}
