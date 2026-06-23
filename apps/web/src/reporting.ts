import {
  BELT_LABELS,
  DemoRole,
  PresenceStatus,
  SessionRole,
  SettlementStatus,
  TrainingSessionStatus,
  type AttendanceRecord,
  type CompensationCorrection,
  type CompensationRate,
  type DemoRole as DemoRoleValue,
  type SettlementLine,
  type SettlementSnapshot,
  type SettlementStatus as SettlementStatusValue,
} from "@vtkb/shared";

import type { HistoricalTrainingSession, Member, TrainingType, TrialParticipant } from "./types";
import { ContractStatus, PersonMembershipStatus } from "@vtkb/shared";
import { computeTrialSessionCount } from "./trialWorkflow";

export type PeriodFilter =
  | { mode: "MONTH"; month: string }
  | { mode: "YEAR"; year: number }
  | { mode: "RANGE"; from: string; until: string };

export interface ReportingFilters {
  personId?: string;
  gender?: Member["gender"];
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

export interface SettlementView {
  memberId: string;
  month: string;
  lines: readonly SettlementLine[];
  corrections: readonly CompensationCorrection[];
  responsibleCount: number;
  assistantCount: number;
  responsibleCents: number;
  assistantCents: number;
  correctionCents: number;
  totalCents: number;
  reviewNotes: readonly string[];
  source: "CALCULATION" | "SNAPSHOT";
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface CompensationRateValidationIssue {
  rateId: string;
  message: string;
}

export interface EuroParseResult {
  ok: boolean;
  cents?: number;
  error?: string;
}

export interface MemberAttendanceEntry {
  session: HistoricalTrainingSession;
  record: AttendanceRecord;
}

export interface DashboardMetrics {
  completedSessions: number;
  uniquePresentMembers: number;
  totalAttendances: number;
  responsibleAssignments: number;
  assistantAssignments: number;
  totalCompensationCents: number;
  draftSettlements: number;
  reviewedSettlements: number;
  approvedSettlements: number;
  paidSettlements: number;
  openReviewNotes: number;
}

const MAX_MONEY_CENTS = 100_000_000;

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

export function completedPresentAttendance(
  sessions: readonly HistoricalTrainingSession[],
): AttendanceRecord[] {
  return sessions
    .filter((session) => session.status === TrainingSessionStatus.COMPLETED)
    .flatMap((session) => session.attendance)
    .filter((record) => record.presenceStatus === PresenceStatus.PRESENT);
}

export function memberAttendanceEntries(
  memberId: string,
  sessions: readonly HistoricalTrainingSession[],
  filters: { month?: string; year?: string; trainingType?: string; role?: string } = {},
): MemberAttendanceEntry[] {
  return sessions
    .filter((session) => session.status === TrainingSessionStatus.COMPLETED)
    .flatMap((session) =>
      session.attendance
        .filter(
          (record) =>
            record.memberId === memberId &&
            record.presenceStatus === PresenceStatus.PRESENT &&
            (!filters.month || session.date.startsWith(filters.month)) &&
            (!filters.year || session.date.startsWith(`${filters.year}-`)) &&
            (!filters.trainingType || session.trainingType === filters.trainingType) &&
            (!filters.role || record.sessionRole === filters.role),
        )
        .map((record) => ({ session, record })),
    );
}

export function membersWithTrainerActivity(
  members: readonly Member[],
  sessions: readonly HistoricalTrainingSession[],
): Member[] {
  const trainerIds = new Set(
    sessions
      .filter((session) => session.status === TrainingSessionStatus.COMPLETED)
      .flatMap((session) => session.attendance)
      .filter(
        (record) =>
          record.presenceStatus === PresenceStatus.PRESENT &&
          (record.sessionRole === SessionRole.RESPONSIBLE_TRAINER ||
            record.sessionRole === SessionRole.ASSISTANT_TRAINER),
      )
      .map((record) => record.memberId),
  );
  return members.filter((member) => trainerIds.has(member.id));
}

export function calculateDashboardMetrics(
  sessions: readonly HistoricalTrainingSession[],
  settlements: ReadonlyArray<{ status: SettlementStatusValue; view: SettlementView }>,
): DashboardMetrics {
  // completedPresentAttendance filtert selbst nach COMPLETED – kein vorheriges Filtern nötig
  const records = completedPresentAttendance(sessions);
  const completedSessionCount = sessions.filter(
    (session) => session.status === TrainingSessionStatus.COMPLETED,
  ).length;

  // Alle Settlement-Kennzahlen in einem einzigen Durchlauf
  const settlementTotals = settlements.reduce<{
    totalCents: number;
    openReviewNotes: number;
    counts: Partial<Record<SettlementStatusValue, number>>;
  }>(
    (acc, item) => {
      if (item.status !== SettlementStatus.CANCELLED) {
        acc.totalCents += item.view.totalCents;
        acc.openReviewNotes += item.view.reviewNotes.length;
      }
      acc.counts[item.status] = (acc.counts[item.status] ?? 0) + 1;
      return acc;
    },
    {
      totalCents: 0,
      openReviewNotes: 0,
      counts: {},
    },
  );

  return {
    completedSessions: completedSessionCount,
    uniquePresentMembers: new Set(records.map((record) => record.memberId)).size,
    totalAttendances: records.length,
    responsibleAssignments: records.filter(
      (record) => record.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
    ).length,
    assistantAssignments: records.filter(
      (record) => record.sessionRole === SessionRole.ASSISTANT_TRAINER,
    ).length,
    totalCompensationCents: settlementTotals.totalCents,
    draftSettlements: settlementTotals.counts[SettlementStatus.DRAFT] ?? 0,
    reviewedSettlements: settlementTotals.counts[SettlementStatus.REVIEWED] ?? 0,
    approvedSettlements: settlementTotals.counts[SettlementStatus.APPROVED] ?? 0,
    paidSettlements: settlementTotals.counts[SettlementStatus.PAID] ?? 0,
    openReviewNotes: settlementTotals.openReviewNotes,
  };
}

export interface SettlementAccessItem {
  memberId: string;
  status: SettlementStatusValue;
}

export function filterSettlementsForRole<T extends SettlementAccessItem>(
  settlements: readonly T[],
  role: DemoRoleValue,
  ownMemberId: string,
): T[] {
  if (role === DemoRole.BOARD) return [...settlements];
  if (role === DemoRole.TREASURER) {
    return settlements.filter(
      (settlement) =>
        settlement.status === SettlementStatus.APPROVED ||
        settlement.status === SettlementStatus.PAID,
    );
  }
  return settlements.filter((settlement) => settlement.memberId === ownMemberId);
}

export function canRoleViewSettlement(
  role: DemoRoleValue,
  memberId: string,
  status: SettlementStatusValue,
  ownMemberId: string,
): boolean {
  return filterSettlementsForRole([{ memberId, status }], role, ownMemberId).length === 1;
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
        (!filters.gender || member.gender === filters.gender) &&
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
              record.presenceStatus === PresenceStatus.PRESENT &&
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
      session.attendance.some(
        (record) =>
          record.memberId === memberId && record.presenceStatus === PresenceStatus.PRESENT,
      )
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
  const matches = rates.filter(
    (rate) =>
      rate.active &&
      rate.role === role &&
      rate.validFrom <= date &&
      (rate.validUntil === null || rate.validUntil >= date),
  );
  if (matches.length > 1) {
    throw new Error(`Mehrere aktive Vergütungssätze überschneiden sich für ${role} am ${date}.`);
  }
  return matches[0] ?? null;
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
      const record = session.attendance.find(
        (item) => item.memberId === memberId && item.presenceStatus === PresenceStatus.PRESENT,
      );
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

function settlementViewFromLines(
  memberId: string,
  month: string,
  lines: readonly SettlementLine[],
  corrections: readonly CompensationCorrection[],
  totalCents: number,
  source: SettlementView["source"],
): SettlementView {
  const responsibleLines = lines.filter((line) => line.role === SessionRole.RESPONSIBLE_TRAINER);
  const assistantLines = lines.filter((line) => line.role === SessionRole.ASSISTANT_TRAINER);
  const lineTotal = (items: readonly SettlementLine[]) =>
    items.reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
  return {
    memberId,
    month,
    lines,
    corrections,
    responsibleCount: responsibleLines.length,
    assistantCount: assistantLines.length,
    responsibleCents: lineTotal(responsibleLines),
    assistantCents: lineTotal(assistantLines),
    correctionCents: corrections.reduce((sum, correction) => sum + correction.amountCents, 0),
    totalCents,
    reviewNotes: lines.flatMap((line) => line.reviewNote ?? []),
    source,
  };
}

export function resolveSettlementView(
  status: SettlementStatusValue,
  calculation: SettlementCalculation,
  snapshot: SettlementSnapshot | undefined,
  corrections: readonly CompensationCorrection[] = [],
): SettlementView {
  const snapshotIsBinding =
    snapshot !== undefined &&
    (status === SettlementStatus.APPROVED ||
      status === SettlementStatus.PAID ||
      status === SettlementStatus.CANCELLED);
  if (snapshotIsBinding) {
    return settlementViewFromLines(
      snapshot.memberId,
      snapshot.month,
      snapshot.lines,
      snapshot.corrections,
      snapshot.totalCents,
      "SNAPSHOT",
    );
  }
  return settlementViewFromLines(
    calculation.memberId,
    calculation.month,
    calculation.lines,
    corrections,
    calculation.totalCents,
    "CALCULATION",
  );
}

export function validateSettlementForReview(calculation: SettlementCalculation): ValidationResult {
  const issues = [
    ...calculation.reviewNotes,
    ...calculation.lines.flatMap((line) => {
      if (line.rateCents === null) return [`Vergütungssatz fehlt für ${line.date}.`];
      if (line.amountCents === null) return [`Abrechnungsbetrag fehlt für ${line.date}.`];
      return [];
    }),
  ];
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function validateSettlementForApproval(
  calculation: SettlementCalculation,
): ValidationResult {
  return validateSettlementForReview(calculation);
}

export function transitionSettlementStatus(
  from: SettlementStatusValue,
  to: SettlementStatusValue,
  calculation: SettlementCalculation,
): SettlementStatusValue {
  if (!canTransitionSettlement(from, to)) {
    throw new Error(`Statuswechsel von ${from} nach ${to} ist nicht erlaubt.`);
  }
  const validation =
    to === SettlementStatus.REVIEWED
      ? validateSettlementForReview(calculation)
      : to === SettlementStatus.APPROVED
        ? validateSettlementForApproval(calculation)
        : { valid: true, issues: [] };
  if (!validation.valid) {
    throw new Error(`Statuswechsel blockiert: ${validation.issues.join(" ")}`);
  }
  return to;
}

export function isSettlementEditable(status: SettlementStatusValue): boolean {
  return status === SettlementStatus.DRAFT || status === SettlementStatus.REVIEWED;
}

export function isSettlementRelevant(input: {
  calculation: SettlementCalculation;
  corrections: readonly CompensationCorrection[];
  hasStoredStatus: boolean;
  snapshot?: SettlementSnapshot;
}): boolean {
  return (
    input.calculation.responsibleCount > 0 ||
    input.calculation.assistantCount > 0 ||
    input.corrections.length > 0 ||
    input.hasStoredStatus ||
    input.snapshot !== undefined
  );
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
    snapshotKind: "APPROVAL",
    capturedAt: approvedAt,
    capturedBy: approvedBy,
    approvedAt,
    approvedBy,
  });
}

export function createCancellationSnapshot(
  calculation: SettlementCalculation,
  corrections: readonly CompensationCorrection[],
  cancelledBy: string,
  cancelledAt: string,
): SettlementSnapshot {
  return Object.freeze({
    month: calculation.month,
    memberId: calculation.memberId,
    lines: Object.freeze(calculation.lines.map((line) => Object.freeze({ ...line }))),
    corrections: Object.freeze(corrections.map((correction) => Object.freeze({ ...correction }))),
    totalCents: calculation.totalCents,
    snapshotKind: "CANCELLATION",
    capturedAt: cancelledAt,
    capturedBy: cancelledBy,
    approvedAt: null,
    approvedBy: null,
  });
}

export function createCorrection(
  input: Omit<CompensationCorrection, "reason"> & { reason: string },
): CompensationCorrection {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Eine Korrektur benötigt eine Begründung.");
  if (
    !Number.isInteger(input.amountCents) ||
    input.amountCents === 0 ||
    Math.abs(input.amountCents) > MAX_MONEY_CENTS
  ) {
    throw new Error("Der Korrekturbetrag muss eine positive oder negative ganze Centzahl sein.");
  }
  return { ...input, reason };
}

export function addSettlementCorrection(
  existing: readonly CompensationCorrection[],
  correction: CompensationCorrection,
  status: SettlementStatusValue,
): CompensationCorrection[] {
  if (!isSettlementEditable(status)) {
    throw new Error(`Abrechnung im Status ${status} ist unveränderlich.`);
  }
  return [...existing, correction];
}

export function removeSettlementCorrection(
  existing: readonly CompensationCorrection[],
  correctionId: string,
  status: SettlementStatusValue,
): CompensationCorrection[] {
  if (!isSettlementEditable(status)) {
    throw new Error(`Abrechnung im Status ${status} ist unveränderlich.`);
  }
  return existing.filter((correction) => correction.id !== correctionId);
}

export function parseEuroToCents(value: string): EuroParseResult {
  const normalized = value.trim();
  if (!normalized) return { ok: false, error: "Bitte einen Betrag eingeben." };
  if (!/^-?\d+(?:,\d{1,2})?$/.test(normalized)) {
    return {
      ok: false,
      error: "Bitte einen gültigen Eurobetrag mit höchstens zwei Nachkommastellen eingeben.",
    };
  }
  const [euros = "0", decimals = ""] = normalized.split(",");
  const sign = euros.startsWith("-") ? -1 : 1;
  const absoluteEuros = Math.abs(Number(euros));
  const cents = sign * (absoluteEuros * 100 + Number(decimals.padEnd(2, "0")));
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_MONEY_CENTS) {
    return { ok: false, error: "Der Betrag liegt außerhalb des zulässigen Bereichs." };
  }
  if (cents === 0) return { ok: false, error: "Der Betrag darf nicht 0,00 Euro sein." };
  return { ok: true, cents };
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === (month ?? 1) - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateCompensationRates(
  rates: readonly CompensationRate[],
): CompensationRateValidationIssue[] {
  const issues: CompensationRateValidationIssue[] = [];
  rates.forEach((rate) => {
    if (!rate.label.trim()) issues.push({ rateId: rate.id, message: "Bezeichnung fehlt." });
    if (!Number.isInteger(rate.amountCents) || rate.amountCents <= 0) {
      issues.push({ rateId: rate.id, message: "Betrag muss eine positive ganze Centzahl sein." });
    }
    if (!isValidIsoDate(rate.validFrom)) {
      issues.push({ rateId: rate.id, message: "Gültig-ab-Datum ist ungültig." });
    }
    if (rate.validUntil !== null && !isValidIsoDate(rate.validUntil)) {
      issues.push({ rateId: rate.id, message: "Gültig-bis-Datum ist ungültig." });
    }
    if (
      isValidIsoDate(rate.validFrom) &&
      rate.validUntil !== null &&
      isValidIsoDate(rate.validUntil) &&
      rate.validUntil < rate.validFrom
    ) {
      issues.push({ rateId: rate.id, message: "Gültig-bis darf nicht vor Gültig-ab liegen." });
    }
  });
  const activeRates = rates.filter(
    (rate) =>
      rate.active &&
      isValidIsoDate(rate.validFrom) &&
      (rate.validUntil === null || isValidIsoDate(rate.validUntil)),
  );
  activeRates.forEach((rate, index) => {
    activeRates.slice(index + 1).forEach((other) => {
      if (rate.role !== other.role) return;
      const rateEnd = rate.validUntil ?? "9999-12-31";
      const otherEnd = other.validUntil ?? "9999-12-31";
      if (rate.validFrom <= otherEnd && other.validFrom <= rateEnd) {
        const message = `Aktive Gültigkeitszeiträume für ${rate.role} überschneiden sich.`;
        issues.push({ rateId: rate.id, message });
        issues.push({ rateId: other.id, message });
      }
    });
  });
  return issues;
}

export function createCompensationRateIdGenerator(existingIds: readonly string[]): () => string {
  const issuedIds = new Set(existingIds);
  let sequence = 1;
  return () => {
    let candidate = `rate-local-${sequence}`;
    while (issuedIds.has(candidate)) {
      sequence += 1;
      candidate = `rate-local-${sequence}`;
    }
    issuedIds.add(candidate);
    sequence += 1;
    return candidate;
  };
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
      "Geschlecht",
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
      item.member.gender,
      BELT_LABELS[item.member.beltColor],
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
    settlement: SettlementView;
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
    ...rows.map(({ member, settlement, status }) => [
      month,
      member.name,
      settlement.responsibleCount,
      settlement.assistantCount,
      formatEuro(settlement.responsibleCents),
      formatEuro(settlement.assistantCents),
      formatEuro(settlement.correctionCents),
      formatEuro(settlement.totalCents),
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
    ...rows
      .filter(
        ({ status }) => status === SettlementStatus.APPROVED || status === SettlementStatus.PAID,
      )
      .map(({ member, totalCents, status }) => [
        member.name,
        month,
        formatEuro(totalCents),
        status,
      ]),
  ]);
}

// ---------------------------------------------------------------------------
// Paket 1.2 – Probetraining-Auswertungen
// ---------------------------------------------------------------------------

export interface TrialSummary {
  participant: TrialParticipant;
  attended: number;
  remaining: number;
  isBlocked: boolean;
  hasPendingContract: boolean;
}

/**
 * Erstellt eine aggregierte Uebersicht aller Probetrainingsteilnehmer
 * fuer Auswertungsscreens und Dashboard-Widgets.
 */
export function buildTrialSummaries(
  participants: readonly TrialParticipant[],
  history: readonly HistoricalTrainingSession[],
): TrialSummary[] {
  return participants.map((participant) => {
    const { attended, remaining } = computeTrialSessionCount(participant.id, history);
    const isBlocked =
      attended >= 4 &&
      participant.contractStatus === ContractStatus.NOT_ISSUED &&
      participant.membershipStatus === PersonMembershipStatus.TRIAL &&
      !participant.overrideUsed;
    const hasPendingContract =
      participant.contractStatus === ContractStatus.ISSUED ||
      participant.contractStatus === ContractStatus.NOT_ISSUED;
    return { participant, attended, remaining, isBlocked, hasPendingContract };
  });
}

export interface TrialDashboardMetrics {
  totalActive: number;
  blocked: number;
  contractPending: number;
  convertedThisYear: number;
}

export function trialDashboardMetrics(summaries: readonly TrialSummary[]): TrialDashboardMetrics {
  return {
    totalActive: summaries.filter(
      (s) =>
        s.participant.active && s.participant.membershipStatus === PersonMembershipStatus.TRIAL,
    ).length,
    blocked: summaries.filter((s) => s.isBlocked).length,
    contractPending: summaries.filter(
      (s) => s.participant.active && s.hasPendingContract && s.attended >= 3,
    ).length,
    convertedThisYear: summaries.filter(
      (s) =>
        s.participant.membershipStatus === PersonMembershipStatus.ACTIVE_MEMBER &&
        !!s.participant.memberId,
    ).length,
  };
}

export function trialCsv(summaries: readonly TrialSummary[]): string {
  return csv([
    [
      "Name",
      "Geschlecht",
      "Geburtsdatum",
      "Erstes Training",
      "Letztes Training",
      "Besuchte Einheiten",
      "Vertragsstatus",
      "Mitgliedschaftsstatus",
    ],
    ...summaries.map(({ participant, attended }) => [
      participant.displayName,
      participant.gender,
      participant.birthDate,
      participant.firstTrialDate ?? "",
      participant.lastTrialDate ?? "",
      attended,
      participant.contractStatus,
      participant.membershipStatus,
    ]),
  ]);
}

// ---------------------------------------------------------------------------
// Paket 1.4 – Gürtelauswertung
// ---------------------------------------------------------------------------

/**
 * Erstellt einen CSV-Export der Gürtelverteilung und offenen Bildvorschläge.
 */
export function beltReportCsv(
  members: readonly Member[],
  history: readonly {
    personId: string;
    effectiveFrom?: string;
    newBeltColor: string;
    newBeltGrade: string;
    source: string;
  }[],
  suggestions: readonly {
    memberId: string;
    status: string;
    suggestedBeltColor: string;
    confidencePercent: number;
    sessionDate: string;
  }[],
): string {
  const openByMember = new Map<string, string>();
  for (const s of suggestions) {
    if (s.status === "OPEN") {
      openByMember.set(s.memberId, s.suggestedBeltColor);
    }
  }
  const lastChangeByMember = new Map<string, string>();
  for (const e of [...history].sort((a, b) =>
    (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""),
  )) {
    if (!lastChangeByMember.has(e.personId)) {
      lastChangeByMember.set(e.personId, e.effectiveFrom ?? "");
    }
  }

  return csv([
    [
      "Name",
      "Geschlecht",
      "Gürtelfarbe",
      "Gürtelgrad",
      "Letzter Wechsel",
      "Offener Bildvorschlag (Farbe)",
    ],
    ...members
      .filter((m) => m.active)
      .map((m) => [
        m.name,
        m.gender,
        BELT_LABELS[m.beltColor],
        m.beltGrade,
        lastChangeByMember.get(m.id) ?? "",
        openByMember.get(m.id) ?? "",
      ]),
  ]);
}
