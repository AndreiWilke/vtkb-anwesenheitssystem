import {
  DemoRole,
  SessionRole,
  SettlementStatus,
  TrainingSessionStatus,
  type CompensationCorrection,
  type CompensationRate,
  type DemoRole as DemoRoleValue,
  type SettlementLine,
  type SettlementSnapshot,
  type SettlementStatus as SettlementStatusValue,
} from "@vtkb/shared";

import type { HistoricalTrainingSession, Member, TrainingType } from "./types";

export type PeriodFilter =
  | { mode: "MONTH"; month: string }
  | { mode: "YEAR"; year: number }
  | { mode: "RANGE"; from: string; until: string };

export interface ReportingFilters {
  personId?: string;
  ageGroup?: Member["ageGroup"];
  trainingType?: TrainingType;
  dojo?: string;
  beltColor?: Member["beltColor"];
  activeOnly?: boolean;
  qualification?: Member["qualification"];
  role?: typeof SessionRole.RESPONSIBLE_TRAINER | typeof SessionRole.ASSISTANT_TRAINER;
}

export interface MemberAttendanceSummary {
  member: Member;
  total: number;
  participant: number;
  responsible: number;
  assistant: number;
  lastAttendance: string | null;
}

export interface SettlementCalculation {
  memberId: string;
  month: string;
  lines: SettlementLine[];
  responsibleCount: number;
  assistantCount: number;
  responsibleCents: number;
  assistantCents: number;
  correctionCents: number;
  totalCents: number;
  reviewNotes: string[];
}

export function filterSessionsByPeriod(
  sessions: readonly HistoricalTrainingSession[],
  period: PeriodFilter,
): HistoricalTrainingSession[] {
  return sessions.filter((session) => {
    if (period.mode === "MONTH") return session.date.startsWith(period.month);
    if (period.mode === "YEAR") return session.date.startsWith(`${period.year}-`);
    return session.date >= period.from && session.date <= period.until;
  });
}

export function aggregateAttendance(
  members: readonly Member[],
  sessions: readonly HistoricalTrainingSession[],
  period: PeriodFilter,
  filters: ReportingFilters = {},
): MemberAttendanceSummary[] {
  const relevantSessions = filterSessionsByPeriod(sessions, period).filter(
    (session) =>
      session.status === TrainingSessionStatus.COMPLETED &&
      (!filters.trainingType || session.trainingType === filters.trainingType) &&
      (!filters.dojo || session.dojo === filters.dojo),
  );
  return members
    .filter(
      (member) =>
        (!filters.personId || member.id === filters.personId) &&
        (!filters.ageGroup || member.ageGroup === filters.ageGroup) &&
        (!filters.beltColor || member.beltColor === filters.beltColor) &&
        (!filters.activeOnly || member.active) &&
        (!filters.qualification || member.qualification === filters.qualification),
    )
    .map((member) => {
      const records = relevantSessions.flatMap((session) =>
        session.attendance
          .filter(
            (record) =>
              record.memberId === member.id &&
              (!filters.role || record.sessionRole === filters.role),
          )
          .map((record) => ({ record, date: session.date })),
      );
      const participant = records.filter(
        ({ record }) => record.sessionRole === SessionRole.PARTICIPANT,
      ).length;
      const responsible = records.filter(
        ({ record }) => record.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
      ).length;
      const assistant = records.filter(
        ({ record }) => record.sessionRole === SessionRole.ASSISTANT_TRAINER,
      ).length;
      return {
        member,
        total: participant + responsible + assistant,
        participant,
        responsible,
        assistant,
        lastAttendance: records.reduce<string | null>(
          (latest, item) => (!latest || item.date > latest ? item.date : latest),
          null,
        ),
      };
    });
}

export function monthlyAttendance(
  memberId: string,
  sessions: readonly HistoricalTrainingSession[],
): Array<{ month: string; count: number }> {
  const counts = new Map<string, number>();
  sessions.forEach((session) => {
    if (
      session.status === TrainingSessionStatus.COMPLETED &&
      session.attendance.some((record) => record.memberId === memberId)
    ) {
      const month = session.date.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
  });
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export function findCompensationRate(
  rates: readonly CompensationRate[],
  role: CompensationRate["role"],
  date: string,
): CompensationRate | null {
  return (
    rates
      .filter(
        (rate) =>
          rate.active &&
          rate.role === role &&
          rate.validFrom <= date &&
          (rate.validUntil === null || rate.validUntil >= date),
      )
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null
  );
}

export function calculateSettlement(
  memberId: string,
  month: string,
  sessions: readonly HistoricalTrainingSession[],
  rates: readonly CompensationRate[],
  corrections: readonly CompensationCorrection[] = [],
): SettlementCalculation {
  const lines = filterSessionsByPeriod(sessions, { mode: "MONTH", month })
    .filter((session) => session.status === TrainingSessionStatus.COMPLETED)
    .flatMap((session) => {
      const record = session.attendance.find((item) => item.memberId === memberId);
      if (
        record?.sessionRole !== SessionRole.RESPONSIBLE_TRAINER &&
        record?.sessionRole !== SessionRole.ASSISTANT_TRAINER
      ) {
        return [];
      }
      const rate = findCompensationRate(rates, record.sessionRole, session.date);
      const reviewNote = rate ? null : `Kein aktiver Vergütungssatz für ${session.date}`;
      return [
        {
          sessionId: session.id,
          date: session.date,
          startsAt: session.startsAt,
          trainingName: session.name,
          dojo: session.dojo,
          role: record.sessionRole,
          rateId: rate?.id ?? null,
          rateCents: rate?.amountCents ?? null,
          amountCents: rate?.amountCents ?? null,
          reviewNote,
        },
      ];
    });
  const responsibleLines = lines.filter((line) => line.role === SessionRole.RESPONSIBLE_TRAINER);
  const assistantLines = lines.filter((line) => line.role === SessionRole.ASSISTANT_TRAINER);
  const sum = (values: readonly SettlementLine[]) =>
    values.reduce((total, line) => total + (line.amountCents ?? 0), 0);
  const responsibleCents = sum(responsibleLines);
  const assistantCents = sum(assistantLines);
  const correctionCents = corrections.reduce(
    (total, correction) => total + correction.amountCents,
    0,
  );
  return {
    memberId,
    month,
    lines,
    responsibleCount: responsibleLines.length,
    assistantCount: assistantLines.length,
    responsibleCents,
    assistantCents,
    correctionCents,
    totalCents: responsibleCents + assistantCents + correctionCents,
    reviewNotes: lines.flatMap((line) => line.reviewNote ?? []),
  };
}

const allowedTransitions: Record<SettlementStatusValue, readonly SettlementStatusValue[]> = {
  DRAFT: [SettlementStatus.REVIEWED, SettlementStatus.CANCELLED],
  REVIEWED: [SettlementStatus.DRAFT, SettlementStatus.APPROVED, SettlementStatus.CANCELLED],
  APPROVED: [SettlementStatus.PAID, SettlementStatus.CANCELLED],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionSettlement(
  from: SettlementStatusValue,
  to: SettlementStatusValue,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function createSettlementSnapshot(
  calculation: SettlementCalculation,
  corrections: readonly CompensationCorrection[],
  approvedBy: string,
  approvedAt: string,
): SettlementSnapshot {
  return Object.freeze({
    month: calculation.month,
    memberId: calculation.memberId,
    lines: Object.freeze(calculation.lines.map((line) => Object.freeze({ ...line }))),
    corrections: Object.freeze(corrections.map((correction) => Object.freeze({ ...correction }))),
    totalCents: calculation.totalCents,
    approvedAt,
    approvedBy,
  });
}

export function createCorrection(
  input: Omit<CompensationCorrection, "reason"> & { reason: string },
): CompensationCorrection {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Eine Korrektur benötigt eine Begründung.");
  if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
    throw new Error("Der Korrekturbetrag muss eine positive oder negative ganze Centzahl sein.");
  }
  return { ...input, reason };
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function roleCan(
  role: DemoRoleValue,
  action: "VIEW_ALL" | "EDIT_RATES" | "APPROVE" | "MARK_PAID" | "EXPORT",
): boolean {
  if (role === DemoRole.BOARD) return true;
  if (role === DemoRole.TREASURER) return action === "MARK_PAID" || action === "EXPORT";
  return false;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: ReadonlyArray<readonly (string | number)[]>): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

export function attendanceCsv(
  summaries: readonly MemberAttendanceSummary[],
  periodLabel: string,
): string {
  return csv([
    [
      "Mitglied",
      "Altersgruppe",
      "Gürtelfarbe",
      "Gürtelgrad",
      "Zeitraum",
      "Gesamtanwesenheiten",
      "Teilnehmer-Einsätze",
      "verantwortliche Trainer-Einsätze",
      "Assistenz-Einsätze",
      "letzte Teilnahme",
    ],
    ...summaries.map((item) => [
      item.member.name,
      item.member.ageGroup,
      item.member.beltColor,
      item.member.beltGrade,
      periodLabel,
      item.total,
      item.participant,
      item.responsible,
      item.assistant,
      item.lastAttendance ?? "",
    ]),
  ]);
}

export function compensationCsv(
  month: string,
  rows: ReadonlyArray<{
    member: Member;
    calculation: SettlementCalculation;
    status: SettlementStatusValue;
  }>,
): string {
  return csv([
    [
      "Monat",
      "Person",
      "Trainer-Einsätze",
      "Assistenz-Einsätze",
      "Trainerbetrag",
      "Assistenzbetrag",
      "Korrekturen",
      "Gesamtbetrag",
      "Status",
    ],
    ...rows.map(({ member, calculation, status }) => [
      month,
      member.name,
      calculation.responsibleCount,
      calculation.assistantCount,
      formatEuro(calculation.responsibleCents),
      formatEuro(calculation.assistantCents),
      formatEuro(calculation.correctionCents),
      formatEuro(calculation.totalCents),
      status,
    ]),
  ]);
}

export function paymentCsv(
  month: string,
  rows: ReadonlyArray<{ member: Member; totalCents: number; status: SettlementStatusValue }>,
): string {
  return csv([
    ["Person", "Abrechnungsmonat", "freigegebener Betrag", "Zahlungsstatus"],
    ...rows.map(({ member, totalCents, status }) => [
      member.name,
      month,
      formatEuro(totalCents),
      status,
    ]),
  ]);
}
