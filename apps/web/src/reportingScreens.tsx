import { useMemo, useRef, useState } from "react";
import {
  CompensationBillingType,
  DemoRole,
  MemberQualification,
  PresenceStatus,
  SessionRole,
  SettlementStatus,
  TrainingSessionStatus,
  type AuditEntry,
  type CompensationCorrection,
  type CompensationRate,
  type DemoRole as DemoRoleValue,
  type SettlementSnapshot,
  type SettlementStatus as SettlementStatusValue,
} from "@vtkb/shared";
import {
  ArrowDownUp,
  ArrowLeft,
  BadgeEuro,
  CalendarRange,
  Download,
  FileClock,
  Gauge,
  Printer,
  Search,
  Settings2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  BeltMark,
  MemberAvatar,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  StatusTag,
} from "./components";
import {
  aggregateAttendance,
  addSettlementCorrection,
  attendanceCsv,
  calculateSettlement,
  calculateDashboardMetrics,
  canRoleViewSettlement,
  compensationCsv,
  createCancellationSnapshot,
  createCompensationRateIdGenerator,
  createCorrection,
  createSettlementSnapshot,
  filterSettlementsForRole,
  filterSessionsByPeriod,
  formatEuro,
  isSettlementEditable,
  isSettlementRelevant,
  memberAttendanceEntries,
  membersWithTrainerActivity,
  monthlyAttendance,
  parseEuroToCents,
  paymentCsv,
  removeSettlementCorrection,
  resolveSettlementView,
  roleCan,
  transitionSettlementStatus,
  validateCompensationRates,
  validateSettlementForApproval,
  validateSettlementForReview,
  type MemberAttendanceSummary,
  type PeriodFilter,
  type SettlementView,
} from "./reporting";
import { historicalSessions, initialCompensationRates } from "./reportingMockData";
import { clubTimeFormatter } from "./time";
import type { Member, ReportingView, TrainingType } from "./types";

const monthLabels = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Berlin",
});
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  timeZone: "Europe/Berlin",
});

const statusLabels: Record<SettlementStatusValue, string> = {
  DRAFT: "Entwurf",
  REVIEWED: "geprüft",
  APPROVED: "freigegeben",
  PAID: "bezahlt",
  CANCELLED: "storniert",
};

const roleLabels = {
  [SessionRole.RESPONSIBLE_TRAINER]: "Verantwortlicher Trainer",
  [SessionRole.ASSISTANT_TRAINER]: "Assistenztrainer",
  [SessionRole.PARTICIPANT]: "Teilnehmer",
};

const trainingTypeLabels: Record<TrainingType, string> = {
  KINDERTRAINING: "Kindertraining",
  JUGENDTRAINING: "Jugendtraining",
  ERWACHSENENTRAINING: "Erwachsenentraining",
  GRUNDLAGENTRAINING: "Grundlagentraining",
  FORTGESCHRITTENENTRAINING: "Fortgeschrittenentraining",
};

function displayDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T12:00:00.000Z`));
}

function displayMonth(month: string): string {
  return monthLabels.format(new Date(`${month}-15T12:00:00.000Z`));
}

function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusTone(status: SettlementStatusValue): "good" | "warn" | "muted" | "red" {
  if (status === SettlementStatus.PAID || status === SettlementStatus.APPROVED) return "good";
  if (status === SettlementStatus.CANCELLED) return "red";
  return status === SettlementStatus.REVIEWED ? "warn" : "muted";
}

function requiresConfirmation(status: SettlementStatusValue): boolean {
  return (
    status === SettlementStatus.APPROVED ||
    status === SettlementStatus.PAID ||
    status === SettlementStatus.CANCELLED
  );
}

function isPayableStatus(status: SettlementStatusValue): boolean {
  return status === SettlementStatus.APPROVED || status === SettlementStatus.PAID;
}

function isCancellableStatus(status: SettlementStatusValue): boolean {
  return (
    status === SettlementStatus.DRAFT ||
    status === SettlementStatus.REVIEWED ||
    status === SettlementStatus.APPROVED
  );
}

interface ReportingScreenProps {
  members: readonly Member[];
  demoRole: DemoRoleValue;
  onBack: () => void;
}

export function ReportingScreen({ members, demoRole, onBack }: ReportingScreenProps) {
  const [view, setView] = useState<ReportingView>(
    demoRole === DemoRole.TRAINER
      ? "OWN"
      : demoRole === DemoRole.TREASURER
        ? "PAYMENTS"
        : "DASHBOARD",
  );
  const [month, setMonth] = useState("2026-06");
  const [selectedMemberId, setSelectedMemberId] = useState("member-01");
  const [rates, setRates] = useState<CompensationRate[]>(() =>
    initialCompensationRates.map((rate) => ({ ...rate })),
  );
  const nextRateId = useRef(
    createCompensationRateIdGenerator(initialCompensationRates.map((rate) => rate.id)),
  );
  const [statuses, setStatuses] = useState<Record<string, SettlementStatusValue>>({});
  const [corrections, setCorrections] = useState<Record<string, CompensationCorrection[]>>({});
  const [snapshots, setSnapshots] = useState<Record<string, SettlementSnapshot>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const [transitionErrors, setTransitionErrors] = useState<Record<string, string>>({});
  const [periodMode, setPeriodMode] = useState<PeriodFilter["mode"]>("MONTH");
  const [year, setYear] = useState(2026);
  const [rangeFrom, setRangeFrom] = useState("2026-01-01");
  const [rangeUntil, setRangeUntil] = useState("2026-06-30");
  const [memberQuery, setMemberQuery] = useState("");
  const [gender, setGender] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [dojo, setDojo] = useState("");
  const [belt, setBelt] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [qualification, setQualification] = useState("");
  const [sessionRole, setSessionRole] = useState("");
  const [detailRole, setDetailRole] = useState("");
  const [sortDescending, setSortDescending] = useState(true);

  const period: PeriodFilter =
    periodMode === "MONTH"
      ? { mode: "MONTH", month }
      : periodMode === "YEAR"
        ? { mode: "YEAR", year }
        : { mode: "RANGE", from: rangeFrom, until: rangeUntil };

  const summaries = useMemo(
    () =>
      aggregateAttendance(members, historicalSessions, period, {
        ...(gender ? { gender: gender as Member["gender"] } : {}),
        ...(trainingType ? { trainingType: trainingType as TrainingType } : {}),
        ...(dojo ? { dojo } : {}),
        ...(belt ? { beltColor: belt as Member["beltColor"] } : {}),
        ...(qualification ? { qualification: qualification as Member["qualification"] } : {}),
        ...(sessionRole
          ? {
              role: sessionRole as
                | typeof SessionRole.RESPONSIBLE_TRAINER
                | typeof SessionRole.ASSISTANT_TRAINER,
            }
          : {}),
        activeOnly,
      }).filter((item) =>
        item.member.name
          .toLocaleLowerCase("de")
          .includes(memberQuery.trim().toLocaleLowerCase("de")),
      ),
    [
      activeOnly,
      gender,
      belt,
      dojo,
      memberQuery,
      members,
      period,
      qualification,
      sessionRole,
      trainingType,
    ],
  );

  const trainerMembers = membersWithTrainerActivity(members, historicalSessions);
  const keyFor = (memberId: string) => `${month}:${memberId}`;
  const hasStoredStatus = (memberId: string) => keyFor(memberId) in statuses;
  const statusFor = (memberId: string) => statuses[keyFor(memberId)] ?? SettlementStatus.DRAFT;
  const correctionsFor = (memberId: string) => corrections[keyFor(memberId)] ?? [];
  const calculationFor = (memberId: string) =>
    calculateSettlement(memberId, month, historicalSessions, rates, correctionsFor(memberId));
  const settlementViewFor = (memberId: string) =>
    resolveSettlementView(
      statusFor(memberId),
      calculationFor(memberId),
      snapshots[keyFor(memberId)],
      correctionsFor(memberId),
    );
  const relevantSettlementMembers = trainerMembers.filter((member) =>
    isRelevantSettlement(member.id),
  );
  const visibleSettlementIds = new Set(
    filterSettlementsForRole(
      relevantSettlementMembers.map((member) => ({
        memberId: member.id,
        status: statusFor(member.id),
      })),
      demoRole,
      "member-01",
    ).map((settlement) => settlement.memberId),
  );
  const visibleSettlementMembers = relevantSettlementMembers.filter((member) =>
    visibleSettlementIds.has(member.id),
  );

  function isRelevantSettlement(memberId: string): boolean {
    return isSettlementRelevant({
      calculation: calculationFor(memberId),
      corrections: correctionsFor(memberId),
      hasStoredStatus: hasStoredStatus(memberId),
      snapshot: snapshots[keyFor(memberId)],
    });
  }

  const addAudit = (
    action: string,
    object: string,
    previousValue: string | null,
    newValue: string | null,
    reason: string | null = null,
  ) => {
    setAudit((current) => [
      {
        id: `audit-${String(current.length + 1).padStart(3, "0")}`,
        occurredAt: new Date().toISOString(),
        actor:
          demoRole === DemoRole.BOARD
            ? "Vorstand Demo A"
            : demoRole === DemoRole.TREASURER
              ? "Kassenwart Demo C"
              : "Trainer Demo B",
        action,
        object,
        previousValue,
        newValue,
        reason,
      },
      ...current,
    ]);
  };

  const transition = (memberId: string, next: SettlementStatusValue) => {
    const previous = statusFor(memberId);
    const calculation = calculationFor(memberId);
    try {
      transitionSettlementStatus(previous, next, calculation);
      setTransitionErrors((current) => ({ ...current, [keyFor(memberId)]: "" }));
    } catch (error) {
      setTransitionErrors((current) => ({
        ...current,
        [keyFor(memberId)]: error instanceof Error ? error.message : "Statuswechsel blockiert.",
      }));
      return;
    }
    if (
      requiresConfirmation(next) &&
      !window.confirm(
        next === SettlementStatus.APPROVED
          ? "Abrechnung wirklich freigeben und einfrieren?"
          : next === SettlementStatus.PAID
            ? "Abrechnung wirklich als bezahlt markieren?"
            : "Abrechnung wirklich stornieren?",
      )
    ) {
      return;
    }
    const key = keyFor(memberId);
    if (next === SettlementStatus.APPROVED) {
      const snapshot = createSettlementSnapshot(
        calculation,
        correctionsFor(memberId),
        "Vorstand Demo A",
        new Date().toISOString(),
      );
      setSnapshots((current) => ({ ...current, [key]: snapshot }));
    } else if (next === SettlementStatus.CANCELLED && snapshots[key] === undefined) {
      const snapshot = createCancellationSnapshot(
        calculation,
        correctionsFor(memberId),
        "Vorstand Demo A",
        new Date().toISOString(),
      );
      setSnapshots((current) => ({ ...current, [key]: snapshot }));
    }
    setStatuses((current) => ({ ...current, [key]: next }));
    const action =
      next === SettlementStatus.REVIEWED
        ? "Abrechnung geprüft"
        : next === SettlementStatus.APPROVED
          ? "Abrechnung freigegeben"
          : next === SettlementStatus.PAID
            ? "Abrechnung als bezahlt markiert"
            : next === SettlementStatus.CANCELLED
              ? "Abrechnung storniert"
              : "Abrechnung in Entwurf zurückgesetzt";
    addAudit(action, `${month}/${memberId}`, statusLabels[previous], statusLabels[next]);
  };

  const saveCorrection = () => {
    const key = keyFor(selectedMemberId);
    const parsed = parseEuroToCents(correctionAmount);
    if (!parsed.ok || parsed.cents === undefined) {
      setCorrectionError(parsed.error ?? "Ungültiger Betrag.");
      return;
    }
    try {
      const correction = createCorrection({
        id: `correction-${Date.now()}`,
        amountCents: parsed.cents,
        reason: correctionReason,
        editedBy: "Vorstand Demo A",
        editedAt: new Date().toISOString(),
      });
      const nextCorrections = addSettlementCorrection(
        correctionsFor(selectedMemberId),
        correction,
        statusFor(selectedMemberId),
      );
      setCorrections((current) => ({ ...current, [key]: nextCorrections }));
      addAudit("Korrektur hinzugefügt", key, null, formatEuro(parsed.cents), correction.reason);
    } catch (error) {
      setCorrectionError(error instanceof Error ? error.message : "Korrektur ist ungültig.");
      return;
    }
    setCorrectionOpen(false);
    setCorrectionAmount("");
    setCorrectionReason("");
    setCorrectionError("");
  };

  const removeCorrection = (correction: CompensationCorrection) => {
    const key = keyFor(selectedMemberId);
    try {
      const nextCorrections = removeSettlementCorrection(
        correctionsFor(selectedMemberId),
        correction.id,
        statusFor(selectedMemberId),
      );
      setCorrections((current) => ({ ...current, [key]: nextCorrections }));
    } catch (error) {
      setTransitionErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Korrektur kann nicht entfernt werden.",
      }));
      return;
    }
    addAudit(
      "Korrektur entfernt",
      key,
      formatEuro(correction.amountCents),
      null,
      correction.reason,
    );
  };

  const openMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setView("MEMBER_DETAIL");
  };
  const openSettlement = (memberId: string) => {
    if (!canRoleViewSettlement(demoRole, memberId, statusFor(memberId), "member-01")) return;
    setSelectedMemberId(memberId);
    setView("SETTLEMENT_DETAIL");
  };

  const activeView: ReportingView =
    demoRole === DemoRole.TRAINER
      ? "OWN"
      : demoRole === DemoRole.TREASURER &&
          view !== "PAYMENTS" &&
          view !== "SETTLEMENTS" &&
          !(
            view === "SETTLEMENT_DETAIL" &&
            canRoleViewSettlement(
              demoRole,
              selectedMemberId,
              statusFor(selectedMemberId),
              "member-01",
            )
          )
        ? "PAYMENTS"
        : view;

  const visibleNav: Array<{ view: ReportingView; label: string; icon: typeof Gauge }> =
    demoRole === DemoRole.TRAINER
      ? [{ view: "OWN", label: "Meine Übersicht", icon: UserRound }]
      : demoRole === DemoRole.TREASURER
        ? [
            { view: "PAYMENTS", label: "Zahlungsliste", icon: WalletCards },
            { view: "SETTLEMENTS", label: "Abrechnungen", icon: BadgeEuro },
          ]
        : [
            { view: "DASHBOARD", label: "Dashboard", icon: Gauge },
            { view: "MEMBERS", label: "Mitglieder", icon: UsersRound },
            { view: "TRAINERS", label: "Trainer", icon: UserRound },
            { view: "SETTLEMENTS", label: "Abrechnung", icon: BadgeEuro },
            { view: "RATES", label: "Vergütungssätze", icon: Settings2 },
            { view: "AUDIT", label: "Audit", icon: FileClock },
            { view: "PAYMENTS", label: "Zahlungsliste", icon: WalletCards },
          ];
  const correctionAmountValidation = parseEuroToCents(correctionAmount);
  const visibleCorrectionError =
    correctionError ||
    (correctionAmount && !correctionAmountValidation.ok
      ? (correctionAmountValidation.error ?? "Ungültiger Betrag.")
      : "");

  return (
    <section className="reporting-root">
      <PageHeading
        title="Auswertung und Aufwandsentschädigung"
        description="Lokaler Paket-1.1-Prototyp · ausschließlich fiktive Daten"
        onBack={onBack}
      />
      <div className="reporting-role-note">
        <strong>
          Demo-Rolle:{" "}
          {demoRole === DemoRole.BOARD
            ? "Vorstand"
            : demoRole === DemoRole.TREASURER
              ? "Kassenwart"
              : "Trainer"}
        </strong>
        <span>Keine echte Anmeldung oder Rechteprüfung.</span>
      </div>
      <nav aria-label="Auswertungsbereiche" className="reporting-nav">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              aria-current={activeView === item.view ? "page" : undefined}
              className={activeView === item.view ? "active" : ""}
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
            >
              <Icon aria-hidden="true" /> {item.label}
            </button>
          );
        })}
      </nav>

      {activeView === "DASHBOARD" ? (
        <Dashboard
          month={month}
          settlements={relevantSettlementMembers.map((member) => ({
            status: statusFor(member.id),
            view: settlementViewFor(member.id),
          }))}
          onMonthChange={setMonth}
        />
      ) : null}

      {activeView === "MEMBERS" ? (
        <section>
          <SectionTitle
            title="Auswertung – Mitglieder und Schüler"
            subtitle="Nur belegte Anwesenheiten; keine Fehlzeiten- oder Prozentquote."
          />
          <div className="reporting-filters">
            <label>
              <span>Zeitraum</span>
              <select
                value={periodMode}
                onChange={(event) => setPeriodMode(event.target.value as PeriodFilter["mode"])}
              >
                <option value="MONTH">Monat</option>
                <option value="YEAR">Jahr</option>
                <option value="RANGE">Freier Zeitraum</option>
              </select>
            </label>
            {periodMode === "MONTH" ? (
              <label>
                <span>Monat</span>
                <input
                  aria-label="Auswertungsmonat"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                />
              </label>
            ) : null}
            {periodMode === "YEAR" ? (
              <label>
                <span>Jahr</span>
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                />
              </label>
            ) : null}
            {periodMode === "RANGE" ? (
              <>
                <label>
                  <span>Von</span>
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(event) => setRangeFrom(event.target.value)}
                  />
                </label>
                <label>
                  <span>Bis</span>
                  <input
                    type="date"
                    value={rangeUntil}
                    onChange={(event) => setRangeUntil(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            <label className="search-field">
              <Search aria-hidden="true" />
              <input
                aria-label="Person filtern"
                placeholder="Person"
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
              />
            </label>
            <FilterSelect
              label="Geschlecht"
              value={gender}
              onChange={setGender}
              options={[
                ["MAENNLICH", "Männlich"],
                ["WEIBLICH", "Weiblich"],
              ]}
            />
            <FilterSelect
              label="Trainingsart"
              value={trainingType}
              onChange={setTrainingType}
              options={Object.entries(trainingTypeLabels)}
            />
            <FilterSelect
              label="Dojo"
              value={dojo}
              onChange={setDojo}
              options={[
                ["Dojo VTKB Berlin", "Dojo VTKB Berlin"],
                ["Dojo Nord", "Dojo Nord"],
                ["Dojo Süd", "Dojo Süd"],
              ]}
            />
            <FilterSelect
              label="Gürtelfarbe"
              value={belt}
              onChange={setBelt}
              options={[
                ["WEISS", "Weiß"],
                ["GELB", "Gelb"],
                ["ORANGE", "Orange"],
                ["GRUEN", "Grün"],
                ["BLAU", "Blau"],
                ["BRAUN", "Braun"],
                ["SCHWARZ", "Schwarz"],
              ]}
            />
            <FilterSelect
              label="Dauerhafte Qualifikation"
              value={qualification}
              onChange={setQualification}
              options={[
                [MemberQualification.TRAINER, "Trainer"],
                [MemberQualification.ASSISTANT_TRAINER, "Assistenztrainer"],
                [MemberQualification.NONE, "Mitglied"],
              ]}
            />
            <FilterSelect
              label="Einsatzrolle"
              value={sessionRole}
              onChange={setSessionRole}
              options={[
                [SessionRole.RESPONSIBLE_TRAINER, "verantwortlicher Trainer"],
                [SessionRole.ASSISTANT_TRAINER, "Assistenztrainer"],
              ]}
            />
            <label className="check-row">
              <input
                checked={activeOnly}
                type="checkbox"
                onChange={(event) => setActiveOnly(event.target.checked)}
              />{" "}
              nur aktive Mitglieder
            </label>
          </div>
          <div className="export-actions no-print">
            <SecondaryButton
              onClick={() =>
                downloadCsv(
                  "mitgliederanwesenheit.csv",
                  attendanceCsv(
                    summaries,
                    period.mode === "MONTH"
                      ? displayMonth(period.month)
                      : period.mode === "YEAR"
                        ? String(period.year)
                        : `${period.from} bis ${period.until}`,
                  ),
                )
              }
            >
              <Download aria-hidden="true" /> CSV Mitgliederanwesenheit
            </SecondaryButton>
            <SecondaryButton onClick={() => window.print()}>
              <Printer aria-hidden="true" /> Monatsübersicht drucken
            </SecondaryButton>
          </div>
          <MemberSummaryList summaries={summaries} onOpen={openMember} />
        </section>
      ) : null}

      {activeView === "MEMBER_DETAIL" ? (
        <MemberDetail
          allMembers={members}
          member={members.find((member) => member.id === selectedMemberId)!}
          roleFilter={detailRole}
          sortDescending={sortDescending}
          onBack={() => setView("MEMBERS")}
          onRoleFilter={setDetailRole}
          onSort={() => setSortDescending((current) => !current)}
        />
      ) : null}

      {activeView === "TRAINERS" || activeView === "TRAINER_DETAIL" ? (
        <section>
          <SectionTitle
            title="Auswertung – Trainer und Assistenztrainer"
            subtitle="Die Funktion der konkreten Einheit bestimmt Zählung und Vergütung."
          />
          {activeView === "TRAINER_DETAIL" ? (
            <button className="text-button" type="button" onClick={() => setView("TRAINERS")}>
              <ArrowLeft aria-hidden="true" /> Zur Trainerübersicht
            </button>
          ) : null}
          <TrainerList
            members={
              activeView === "TRAINER_DETAIL"
                ? members.filter((member) => member.id === selectedMemberId)
                : trainerMembers
            }
            month={month}
            statusFor={statusFor}
            settlementViewFor={settlementViewFor}
            onOpen={(memberId) => {
              setSelectedMemberId(memberId);
              setView("TRAINER_DETAIL");
            }}
          />
        </section>
      ) : null}

      {activeView === "SETTLEMENTS" ? (
        <section>
          <SectionTitle
            title="Aufwandsentschädigung"
            subtitle="Automatisch aus abgeschlossenen Einheiten und der dort gespeicherten Funktion."
          />
          <label className="month-control">
            <span>Abrechnungsmonat</span>
            <input
              aria-label="Abrechnungsmonat"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <div className="export-actions no-print">
            <SecondaryButton
              disabled={!roleCan(demoRole, "EXPORT")}
              onClick={() =>
                downloadCsv(
                  "aufwandsentschaedigung.csv",
                  compensationCsv(
                    month,
                    visibleSettlementMembers.map((member) => ({
                      member,
                      settlement: settlementViewFor(member.id),
                      status: statusFor(member.id),
                    })),
                  ),
                )
              }
            >
              <Download aria-hidden="true" /> CSV Aufwandsentschädigung
            </SecondaryButton>
            <SecondaryButton onClick={() => window.print()}>
              <Printer aria-hidden="true" /> Monatsübersicht drucken
            </SecondaryButton>
          </div>
          <SettlementList
            members={visibleSettlementMembers}
            statusFor={statusFor}
            settlementViewFor={settlementViewFor}
            onOpen={openSettlement}
          />
        </section>
      ) : null}

      {activeView === "SETTLEMENT_DETAIL" || activeView === "OWN" ? (
        <SettlementDetail
          member={
            members.find(
              (member) => member.id === (activeView === "OWN" ? "member-01" : selectedMemberId),
            )!
          }
          month={month}
          calculation={calculationFor(activeView === "OWN" ? "member-01" : selectedMemberId)}
          settlement={settlementViewFor(activeView === "OWN" ? "member-01" : selectedMemberId)}
          snapshot={snapshots[keyFor(activeView === "OWN" ? "member-01" : selectedMemberId)]}
          status={statusFor(activeView === "OWN" ? "member-01" : selectedMemberId)}
          transitionError={
            transitionErrors[keyFor(activeView === "OWN" ? "member-01" : selectedMemberId)] ?? ""
          }
          demoRole={demoRole}
          onBack={() => setView("SETTLEMENTS")}
          onAddCorrection={() => {
            setCorrectionError("");
            setCorrectionOpen(true);
          }}
          onRemoveCorrection={removeCorrection}
          onTransition={(next) =>
            transition(activeView === "OWN" ? "member-01" : selectedMemberId, next)
          }
        />
      ) : null}

      {activeView === "RATES" ? (
        <RateEditor
          rates={rates}
          disabled={!roleCan(demoRole, "EDIT_RATES")}
          onSave={(updated, previous) => {
            setRates((current) => current.map((rate) => (rate.id === updated.id ? updated : rate)));
            addAudit(
              "Vergütungssatz geändert",
              updated.label,
              formatEuro(previous.amountCents),
              formatEuro(updated.amountCents),
            );
          }}
          onCreate={(created) => {
            setRates((current) => [...current, created]);
            addAudit(
              "Vergütungssatz angelegt",
              created.label,
              null,
              `${formatEuro(created.amountCents)} · gültig ab ${created.validFrom}`,
            );
          }}
          nextId={() => nextRateId.current()}
        />
      ) : null}

      {activeView === "AUDIT" ? <AuditLog entries={audit} /> : null}

      {activeView === "PAYMENTS" ? (
        <PaymentList
          members={visibleSettlementMembers}
          month={month}
          settlementViewFor={settlementViewFor}
          statusFor={statusFor}
          onExport={() =>
            downloadCsv(
              "zahlungsliste.csv",
              paymentCsv(
                month,
                visibleSettlementMembers
                  .filter((member) => isPayableStatus(statusFor(member.id)))
                  .map((member) => ({
                    member,
                    totalCents: settlementViewFor(member.id).totalCents,
                    status: statusFor(member.id),
                  })),
              ),
            )
          }
          onMonthChange={setMonth}
          onPaid={(memberId) => transition(memberId, SettlementStatus.PAID)}
        />
      ) : null}

      {correctionOpen ? (
        <div className="member-picker-backdrop">
          <section
            aria-label="Manuelle Korrektur"
            aria-modal="true"
            className="member-picker correction-dialog"
            role="dialog"
          >
            <button
              aria-label="Korrekturdialog schließen"
              className="dialog-close"
              type="button"
              onClick={() => setCorrectionOpen(false)}
            >
              <X />
            </button>
            <SectionTitle
              title="Manuelle Korrektur"
              subtitle="Die automatische Grundvergütung bleibt unverändert nachvollziehbar."
            />
            <label>
              <span>Betrag in Euro (+/−)</span>
              <input
                aria-label="Korrekturbetrag"
                inputMode="decimal"
                placeholder="z. B. -10,00"
                value={correctionAmount}
                onChange={(event) => {
                  setCorrectionAmount(event.target.value);
                  setCorrectionError("");
                }}
              />
            </label>
            <label>
              <span>Begründung</span>
              <textarea
                aria-label="Korrekturbegründung"
                value={correctionReason}
                onChange={(event) => {
                  setCorrectionReason(event.target.value);
                  setCorrectionError("");
                }}
              />
            </label>
            {visibleCorrectionError ? (
              <p className="field-error" role="alert">
                {visibleCorrectionError}
              </p>
            ) : null}
            <PrimaryButton
              disabled={!correctionReason.trim() || !correctionAmountValidation.ok}
              onClick={saveCorrection}
            >
              Korrektur speichern
            </PrimaryButton>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="reporting-section-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        aria-label={`${label} filtern`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Alle</option>
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Dashboard({
  month,
  settlements,
  onMonthChange,
}: {
  month: string;
  settlements: ReadonlyArray<{ status: SettlementStatusValue; view: SettlementView }>;
  onMonthChange: (month: string) => void;
}) {
  const sessions = filterSessionsByPeriod(historicalSessions, { mode: "MONTH", month }).filter(
    (session) => session.status === TrainingSessionStatus.COMPLETED,
  );
  const dashboard = calculateDashboardMetrics(sessions, settlements);
  const metrics = [
    ["Abgeschlossene Einheiten", dashboard.completedSessions],
    ["Unterschiedliche Anwesende", dashboard.uniquePresentMembers],
    ["Gesamte Anwesenheiten", dashboard.totalAttendances],
    ["Verantwortliche Einsätze", dashboard.responsibleAssignments],
    ["Assistenz-Einsätze", dashboard.assistantAssignments],
    ["Voraussichtliche Gesamtvergütung", formatEuro(dashboard.totalCompensationCents)],
    ["Abrechnungen im Entwurf", dashboard.draftSettlements],
    ["Geprüfte Abrechnungen", dashboard.reviewedSettlements],
    ["Freigegebene Abrechnungen", dashboard.approvedSettlements],
    ["Bezahlte Abrechnungen", dashboard.paidSettlements],
    ["Offene Prüfhinweise", dashboard.openReviewNotes],
  ] as const;
  const development = Array.from({ length: 6 }, (_, index) => {
    const key = `2026-${String(index + 1).padStart(2, "0")}`;
    const count = filterSessionsByPeriod(historicalSessions, { mode: "MONTH", month: key })
      .filter((session) => session.status === TrainingSessionStatus.COMPLETED)
      .flatMap((session) => session.attendance)
      .filter((record) => record.presenceStatus === PresenceStatus.PRESENT).length;
    return { key, count };
  });
  const max = Math.max(...development.map((item) => item.count));
  return (
    <section>
      <SectionTitle
        title="Auswertungsdashboard"
        subtitle="Alle Kennzahlen sind textlich lesbar; die Balken ergänzen nur die Monatsentwicklung."
      />
      <label className="month-control">
        <span>Monat</span>
        <input
          aria-label="Dashboard-Monat"
          type="month"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </label>
      <div className="dashboard-grid">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="trend-card">
        <h3>Monatsentwicklung · Anwesenheiten</h3>
        {development.map((item) => (
          <div className="trend-row" key={item.key}>
            <span>{displayMonth(item.key)}</span>
            <div aria-hidden="true">
              <i style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </section>
    </section>
  );
}

function MemberSummaryList({
  summaries,
  onOpen,
}: {
  summaries: readonly MemberAttendanceSummary[];
  onOpen: (memberId: string) => void;
}) {
  return (
    <div className="responsive-data-list member-report-list">
      {summaries.map((item) => (
        <button
          className="data-card"
          key={item.member.id}
          type="button"
          onClick={() => onOpen(item.member.id)}
        >
          <span className="person-cell">
            <MemberAvatar initials={item.member.initials} />
            <span>
              <strong>{item.member.name}</strong>
              <small>
                {item.member.gender === "WEIBLICH" ? "W" : "M"} · {item.member.active ? "aktiv" : "inaktiv"}
              </small>
              <BeltMark color={item.member.beltColor} grade={item.member.beltGrade} />
            </span>
          </span>
          <span>
            <small>Gesamt</small>
            <strong>{item.total}</strong>
          </span>
          <span>
            <small>Teilnehmer</small>
            <strong>{item.participant}</strong>
          </span>
          <span>
            <small>Verantwortlich</small>
            <strong>{item.responsible}</strong>
          </span>
          <span>
            <small>Assistenz</small>
            <strong>{item.assistant}</strong>
          </span>
          <span>
            <small>Letzte Teilnahme</small>
            <strong>{item.lastAttendance ? displayDate(item.lastAttendance) : "–"}</strong>
          </span>
        </button>
      ))}
    </div>
  );
}

function MemberDetail({
  allMembers,
  member,
  roleFilter,
  sortDescending,
  onRoleFilter,
  onSort,
  onBack,
}: {
  allMembers: readonly Member[];
  member: Member;
  roleFilter: string;
  sortDescending: boolean;
  onRoleFilter: (role: string) => void;
  onSort: () => void;
  onBack: () => void;
}) {
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [trainingFilter, setTrainingFilter] = useState("");
  const entries = memberAttendanceEntries(member.id, historicalSessions, {
    month: monthFilter,
    year: yearFilter,
    trainingType: trainingFilter,
    role: roleFilter,
  }).sort((a, b) =>
    sortDescending
      ? b.session.date.localeCompare(a.session.date)
      : a.session.date.localeCompare(b.session.date),
  );
  return (
    <section>
      <button className="text-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Zur Mitgliederübersicht
      </button>
      <SectionTitle
        title={member.name}
        subtitle="Chronologische, aus historischen Einheiten berechnete Anwesenheiten."
      />
      <div className="member-profile">
        <MemberAvatar initials={member.initials} />
        <div>
          <BeltMark color={member.beltColor} grade={member.beltGrade} />
          <span>{member.gender === "WEIBLICH" ? "Weiblich" : "Männlich"}</span>
        </div>
      </div>
      <div className="monthly-summary">
        {monthlyAttendance(member.id, historicalSessions).map((item) => (
          <div key={item.month}>
            <span>{displayMonth(item.month)}</span>
            <strong>{item.count} Einheiten</strong>
          </div>
        ))}
      </div>
      <div className="detail-controls">
        <FilterSelect
          label="Monat"
          options={Array.from({ length: 6 }, (_, index) => {
            const key = `2026-${String(index + 1).padStart(2, "0")}`;
            return [key, displayMonth(key)] as const;
          })}
          value={monthFilter}
          onChange={setMonthFilter}
        />
        <FilterSelect
          label="Jahr"
          options={[["2026", "2026"]]}
          value={yearFilter}
          onChange={setYearFilter}
        />
        <FilterSelect
          label="Trainingsart"
          options={Object.entries(trainingTypeLabels)}
          value={trainingFilter}
          onChange={setTrainingFilter}
        />
        <FilterSelect
          label="Funktion"
          value={roleFilter}
          onChange={onRoleFilter}
          options={Object.entries(roleLabels)}
        />
        <button className="secondary-button compact-button" type="button" onClick={onSort}>
          <ArrowDownUp aria-hidden="true" /> Datum {sortDescending ? "absteigend" : "aufsteigend"}
        </button>
      </div>
      <div className="responsive-data-list">
        {entries.map(({ session, record }) => {
          const responsible = session.attendance.find(
            (item) =>
              item.presenceStatus === PresenceStatus.PRESENT &&
              item.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
          );
          return (
            <article className="data-card" key={session.id}>
              <span>
                <small>Datum</small>
                <strong>
                  {displayDate(session.date)} ·{" "}
                  {weekdayFormatter.format(new Date(`${session.date}T12:00:00Z`))}
                </strong>
              </span>
              <span>
                <small>Uhrzeit</small>
                <strong>
                  {clubTimeFormatter.format(new Date(session.startsAt))}–
                  {clubTimeFormatter.format(new Date(session.endsAt))}
                </strong>
              </span>
              <span>
                <small>Training / Dojo</small>
                <strong>
                  {session.name} · {session.dojo}
                </strong>
              </span>
              <span>
                <small>Funktion</small>
                <strong>{record.sessionRole ? roleLabels[record.sessionRole] : "–"}</strong>
              </span>
              <span>
                <small>Verantwortlich</small>
                <strong>
                  {allMembers.find((item) => item.id === responsible?.memberId)?.name ?? "–"}
                </strong>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TrainerList({
  members,
  month,
  statusFor,
  settlementViewFor,
  onOpen,
}: {
  members: readonly Member[];
  month: string;
  statusFor: (id: string) => SettlementStatusValue;
  settlementViewFor: (id: string) => SettlementView;
  onOpen: (id: string) => void;
}) {
  const yearly = aggregateAttendance(members, historicalSessions, { mode: "YEAR", year: 2026 });
  return (
    <div className="responsive-data-list">
      {members.map((member) => {
        const summary = yearly.find((item) => item.member.id === member.id)!;
        const settlement = settlementViewFor(member.id);
        return (
          <button
            className="data-card"
            key={member.id}
            type="button"
            onClick={() => onOpen(member.id)}
          >
            <span className="person-cell">
              <MemberAvatar initials={member.initials} />
              <span>
                <strong>{member.name}</strong>
                <small>{member.qualification}</small>
              </span>
            </span>
            <span>
              <small>Verantwortlich</small>
              <strong>{summary.responsible}</strong>
            </span>
            <span>
              <small>Assistenz</small>
              <strong>{summary.assistant}</strong>
            </span>
            <span>
              <small>Teilnahmen / Gesamt</small>
              <strong>
                {summary.participant} / {summary.total}
              </strong>
            </span>
            <span>
              <small>Abrechnungsfähig {displayMonth(month)}</small>
              <strong>
                {settlement.responsibleCount} / {settlement.assistantCount}
              </strong>
            </span>
            <span>
              <small>Automatisch</small>
              <strong>{formatEuro(settlement.totalCents)}</strong>
            </span>
            <StatusTag tone={statusTone(statusFor(member.id))}>
              {statusLabels[statusFor(member.id)]}
            </StatusTag>
          </button>
        );
      })}
    </div>
  );
}

function SettlementList({
  members,
  statusFor,
  settlementViewFor,
  onOpen,
}: {
  members: readonly Member[];
  statusFor: (id: string) => SettlementStatusValue;
  settlementViewFor: (id: string) => SettlementView;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="responsive-data-list">
      {members.map((member) => {
        const settlement = settlementViewFor(member.id);
        return (
          <button
            className="data-card settlement-card"
            key={member.id}
            type="button"
            onClick={() => onOpen(member.id)}
          >
            <span className="person-cell">
              <MemberAvatar initials={member.initials} />
              <strong>{member.name}</strong>
            </span>
            <span>
              <small>Trainer</small>
              <strong>
                {settlement.responsibleCount} · {formatEuro(settlement.responsibleCents)}
              </strong>
            </span>
            <span>
              <small>Assistenz</small>
              <strong>
                {settlement.assistantCount} · {formatEuro(settlement.assistantCents)}
              </strong>
            </span>
            <span>
              <small>Korrekturen</small>
              <strong>{formatEuro(settlement.correctionCents)}</strong>
            </span>
            <span className="money-total">
              <small>Gesamt</small>
              <strong>{formatEuro(settlement.totalCents)}</strong>
            </span>
            <StatusTag tone={statusTone(statusFor(member.id))}>
              {statusLabels[statusFor(member.id)]}
            </StatusTag>
            {settlement.reviewNotes.length ? (
              <span className="review-note">{settlement.reviewNotes.length} Prüfhinweis(e)</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SettlementDetail({
  member,
  month,
  calculation,
  settlement,
  snapshot,
  status,
  transitionError,
  demoRole,
  onBack,
  onAddCorrection,
  onRemoveCorrection,
  onTransition,
}: {
  member: Member;
  month: string;
  calculation: ReturnType<typeof calculateSettlement>;
  settlement: SettlementView;
  snapshot?: SettlementSnapshot;
  status: SettlementStatusValue;
  transitionError: string;
  demoRole: DemoRoleValue;
  onBack: () => void;
  onAddCorrection: () => void;
  onRemoveCorrection: (correction: CompensationCorrection) => void;
  onTransition: (status: SettlementStatusValue) => void;
}) {
  const ownAttendance = aggregateAttendance([member], historicalSessions, {
    mode: "YEAR",
    year: 2026,
  })[0];
  const lines = settlement.lines;
  const shownCorrections = settlement.corrections;
  const editable = isSettlementEditable(status);
  const reviewValidation = validateSettlementForReview(calculation);
  const approvalValidation = validateSettlementForApproval(calculation);
  const subtitle =
    status === SettlementStatus.CANCELLED
      ? snapshot?.snapshotKind === "APPROVAL"
        ? "Storniert nach Freigabe · historischer Snapshot bleibt verbindlich"
        : "Storniert vor Freigabe · eingefrorener Stand"
      : settlement.source === "SNAPSHOT"
        ? "Freigegebener Snapshot – unveränderlich"
        : "Entwurf – Änderungen an Sätzen berechnen automatisch neu";
  return (
    <section className="print-sheet">
      <div className="no-print">
        <button className="text-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Zur Monatsabrechnung
        </button>
      </div>
      <SectionTitle title={`${member.name} · ${displayMonth(month)}`} subtitle={subtitle} />
      {demoRole === DemoRole.TRAINER && ownAttendance ? (
        <div className="dashboard-grid own-attendance-summary">
          <article>
            <span>Gesamtanwesenheiten 2026</span>
            <strong>{ownAttendance.total}</strong>
          </article>
          <article>
            <span>Normale Teilnahmen</span>
            <strong>{ownAttendance.participant}</strong>
          </article>
          <article>
            <span>Verantwortliche Einsätze</span>
            <strong>{ownAttendance.responsible}</strong>
          </article>
          <article>
            <span>Assistenz-Einsätze</span>
            <strong>{ownAttendance.assistant}</strong>
          </article>
        </div>
      ) : null}
      <div className="settlement-header">
        <StatusTag tone={statusTone(status)}>{statusLabels[status]}</StatusTag>
        {snapshot?.snapshotKind === "APPROVAL" && snapshot.approvedAt && snapshot.approvedBy ? (
          <span>
            Freigegeben {dateFormatter.format(new Date(snapshot.approvedAt))} durch{" "}
            {snapshot.approvedBy}
          </span>
        ) : snapshot ? (
          <span>
            Bei Stornierung eingefroren {dateFormatter.format(new Date(snapshot.capturedAt))} durch{" "}
            {snapshot.capturedBy}
          </span>
        ) : null}
      </div>
      {settlement.reviewNotes.length ? (
        <div className="validation-box">
          <strong>Prüfhinweis</strong>
          {settlement.reviewNotes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      ) : null}
      {transitionError ? (
        <div className="validation-box" role="alert">
          <strong>Statuswechsel nicht möglich</strong>
          <div>{transitionError}</div>
        </div>
      ) : null}
      <div className="responsive-data-list settlement-lines">
        {lines.map((line) => (
          <article className="data-card" key={line.sessionId}>
            <span>
              <small>Datum / Uhrzeit</small>
              <strong>
                {displayDate(line.date)} · {clubTimeFormatter.format(new Date(line.startsAt))}
              </strong>
            </span>
            <span>
              <small>Training / Dojo</small>
              <strong>
                {line.trainingName} · {line.dojo}
              </strong>
            </span>
            <span>
              <small>Funktion</small>
              <strong>{roleLabels[line.role]}</strong>
            </span>
            <span>
              <small>Verwendeter Satz</small>
              <strong>{line.rateCents === null ? "Satz fehlt" : formatEuro(line.rateCents)}</strong>
            </span>
            <span>
              <small>Betrag</small>
              <strong>{line.amountCents === null ? "Prüfen" : formatEuro(line.amountCents)}</strong>
            </span>
            {line.reviewNote ? <span className="review-note">{line.reviewNote}</span> : null}
          </article>
        ))}
      </div>
      <section className="correction-section">
        <h3>Manuelle Korrekturen</h3>
        {shownCorrections.length ? (
          shownCorrections.map((correction) => (
            <div className="correction-row" key={correction.id}>
              <span>
                <strong>{formatEuro(correction.amountCents)}</strong>
                <small>
                  {correction.reason} · {correction.editedBy}
                </small>
              </span>
              {editable && demoRole === DemoRole.BOARD ? (
                <button
                  aria-label="Korrektur entfernen"
                  className="icon-button no-print"
                  type="button"
                  onClick={() => onRemoveCorrection(correction)}
                >
                  <X />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p>Keine Korrekturen.</p>
        )}
        {editable && demoRole === DemoRole.BOARD ? (
          <SecondaryButton className="no-print" onClick={onAddCorrection}>
            Korrektur hinzufügen
          </SecondaryButton>
        ) : null}
      </section>
      <dl className="settlement-totals">
        <div>
          <dt>Zwischensumme Trainer</dt>
          <dd>{formatEuro(settlement.responsibleCents)}</dd>
        </div>
        <div>
          <dt>Zwischensumme Assistenz</dt>
          <dd>{formatEuro(settlement.assistantCents)}</dd>
        </div>
        <div>
          <dt>Korrekturen</dt>
          <dd>{formatEuro(settlement.correctionCents)}</dd>
        </div>
        <div className="grand-total">
          <dt>Gesamtbetrag</dt>
          <dd>{formatEuro(settlement.totalCents)}</dd>
        </div>
      </dl>
      <div className="settlement-actions no-print">
        <SecondaryButton onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Einzelabrechnung drucken
        </SecondaryButton>
        {demoRole === DemoRole.BOARD && status === SettlementStatus.DRAFT ? (
          <PrimaryButton
            disabled={!reviewValidation.valid}
            onClick={() => onTransition(SettlementStatus.REVIEWED)}
          >
            Als geprüft markieren
          </PrimaryButton>
        ) : null}
        {demoRole === DemoRole.BOARD && status === SettlementStatus.REVIEWED ? (
          <>
            <SecondaryButton onClick={() => onTransition(SettlementStatus.DRAFT)}>
              Zurück in Entwurf
            </SecondaryButton>
            <PrimaryButton
              disabled={!approvalValidation.valid}
              onClick={() => onTransition(SettlementStatus.APPROVED)}
            >
              Freigeben
            </PrimaryButton>
          </>
        ) : null}
        {demoRole === DemoRole.TREASURER && status === SettlementStatus.APPROVED ? (
          <PrimaryButton onClick={() => onTransition(SettlementStatus.PAID)}>
            Als bezahlt markieren
          </PrimaryButton>
        ) : null}
        {demoRole === DemoRole.BOARD && isCancellableStatus(status) ? (
          <SecondaryButton onClick={() => onTransition(SettlementStatus.CANCELLED)}>
            Stornieren
          </SecondaryButton>
        ) : null}
      </div>
    </section>
  );
}

function RateEditor({
  rates,
  disabled,
  onSave,
  onCreate,
  nextId,
}: {
  rates: readonly CompensationRate[];
  disabled: boolean;
  onSave: (rate: CompensationRate, previous: CompensationRate) => void;
  onCreate: (rate: CompensationRate) => void;
  nextId: () => string;
}) {
  const [drafts, setDrafts] = useState(() => rates.map((rate) => ({ ...rate })));
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rates.map((rate) => [rate.id, (rate.amountCents / 100).toFixed(2).replace(".", ",")]),
    ),
  );
  const [rateErrors, setRateErrors] = useState<Record<string, string[]>>({});
  const [newRate, setNewRate] = useState<CompensationRate | null>(null);
  const [newAmountInput, setNewAmountInput] = useState("");

  const saveRate = (rate: CompensationRate) => {
    const parsed = parseEuroToCents(amountInputs[rate.id] ?? "");
    const updated = { ...rate, amountCents: parsed.cents ?? Number.NaN };
    const proposedRates = rates.map((item) => (item.id === rate.id ? updated : item));
    const messages = [
      ...(parsed.ok ? [] : [parsed.error ?? "Betrag ist ungültig."]),
      ...validateCompensationRates(proposedRates)
        .filter((issue) => issue.rateId === rate.id)
        .map((issue) => issue.message),
    ];
    const uniqueMessages = [...new Set(messages)];
    setRateErrors((current) => ({ ...current, [rate.id]: uniqueMessages }));
    if (uniqueMessages.length > 0 || parsed.cents === undefined) return;
    onSave(updated, rates.find((item) => item.id === rate.id)!);
    setDrafts((current) => current.map((item) => (item.id === rate.id ? updated : item)));
    setAmountInputs((current) => ({
      ...current,
      [rate.id]: (updated.amountCents / 100).toFixed(2).replace(".", ","),
    }));
  };

  const startNewRate = () => {
    setNewRate({
      id: nextId(),
      label: "",
      role: SessionRole.RESPONSIBLE_TRAINER,
      billingType: CompensationBillingType.PER_COMPLETED_SESSION,
      amountCents: 0,
      validFrom: "",
      validUntil: null,
      active: true,
    });
    setNewAmountInput("");
  };

  const saveNewRate = () => {
    if (!newRate) return;
    const parsed = parseEuroToCents(newAmountInput);
    const created = { ...newRate, amountCents: parsed.cents ?? Number.NaN };
    const messages = [
      ...(parsed.ok ? [] : [parsed.error ?? "Betrag ist ungültig."]),
      ...validateCompensationRates([...rates, created])
        .filter((issue) => issue.rateId === created.id)
        .map((issue) => issue.message),
    ];
    const uniqueMessages = [...new Set(messages)];
    setRateErrors((current) => ({ ...current, [created.id]: uniqueMessages }));
    if (uniqueMessages.length > 0 || parsed.cents === undefined) return;
    onCreate(created);
    setDrafts((current) => [...current, created]);
    setAmountInputs((current) => ({
      ...current,
      [created.id]: (created.amountCents / 100).toFixed(2).replace(".", ","),
    }));
    setNewRate(null);
    setNewAmountInput("");
  };
  return (
    <section>
      <SectionTitle
        title="Vergütungssätze"
        subtitle="Fiktive Vergütungssätze für den lokalen Prototyp"
      />
      <div className="demo-notice">
        <CalendarRange aria-hidden="true" />
        <span>
          Beispieldaten, keine echte VTKB-Regel. Gültigkeitszeiträume verhindern rückwirkende
          Verfälschung.
        </span>
      </div>
      <div className="export-actions no-print">
        <PrimaryButton disabled={disabled || newRate !== null} onClick={startNewRate}>
          Neuen Vergütungssatz anlegen
        </PrimaryButton>
      </div>
      {newRate ? (
        <article className="rate-card data-card new-rate-card">
          <h3>Neuer Vergütungssatz</h3>
          <label>
            <span>Bezeichnung</span>
            <input
              aria-label="Bezeichnung neuer Vergütungssatz"
              value={newRate.label}
              onChange={(event) => setNewRate({ ...newRate, label: event.target.value })}
            />
          </label>
          <label>
            <span>Rolle</span>
            <select
              aria-label="Rolle neuer Vergütungssatz"
              value={newRate.role}
              onChange={(event) =>
                setNewRate({
                  ...newRate,
                  role: event.target.value as CompensationRate["role"],
                })
              }
            >
              <option value={SessionRole.RESPONSIBLE_TRAINER}>Verantwortlicher Trainer</option>
              <option value={SessionRole.ASSISTANT_TRAINER}>Assistenztrainer</option>
            </select>
          </label>
          <label>
            <span>Abrechnungsart</span>
            <select
              aria-label="Abrechnungsart neuer Vergütungssatz"
              value={newRate.billingType}
              onChange={(event) =>
                setNewRate({
                  ...newRate,
                  billingType: event.target.value as CompensationRate["billingType"],
                })
              }
            >
              <option value={CompensationBillingType.PER_COMPLETED_SESSION}>
                Je abgeschlossener Trainingseinheit
              </option>
            </select>
          </label>
          <label>
            <span>Betrag in Euro</span>
            <input
              aria-label="Betrag neuer Vergütungssatz"
              inputMode="decimal"
              value={newAmountInput}
              onChange={(event) => setNewAmountInput(event.target.value)}
            />
          </label>
          <label>
            <span>Gültig ab</span>
            <input
              aria-label="Gültig ab neuer Vergütungssatz"
              type="date"
              value={newRate.validFrom}
              onChange={(event) => setNewRate({ ...newRate, validFrom: event.target.value })}
            />
          </label>
          <label>
            <span>Gültig bis · optional</span>
            <input
              aria-label="Gültig bis neuer Vergütungssatz"
              type="date"
              value={newRate.validUntil ?? ""}
              onChange={(event) =>
                setNewRate({ ...newRate, validUntil: event.target.value || null })
              }
            />
          </label>
          <label className="check-row">
            <input
              aria-label="Neuer Vergütungssatz aktiv"
              checked={newRate.active}
              type="checkbox"
              onChange={(event) => setNewRate({ ...newRate, active: event.target.checked })}
            />{" "}
            aktiv
          </label>
          <div className="export-actions">
            <PrimaryButton onClick={saveNewRate}>Speichern</PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setRateErrors((current) => ({ ...current, [newRate.id]: [] }));
                setNewRate(null);
                setNewAmountInput("");
              }}
            >
              Abbrechen
            </SecondaryButton>
          </div>
          {(rateErrors[newRate.id] ?? []).length > 0 ? (
            <div className="field-error" role="alert">
              {(rateErrors[newRate.id] ?? []).map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}
      <div className="responsive-data-list">
        {drafts.map((rate) => (
          <article className="rate-card data-card" key={rate.id}>
            <label>
              <span>Bezeichnung</span>
              <input
                disabled={disabled}
                value={rate.label}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === rate.id ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <span>
              <small>Rolle / Abrechnungsart</small>
              <strong>{roleLabels[rate.role]} · je abgeschlossener Trainingseinheit</strong>
            </span>
            <label>
              <span>Betrag in Euro</span>
              <input
                aria-label={`Betrag ${rate.label}`}
                disabled={disabled}
                inputMode="decimal"
                value={amountInputs[rate.id] ?? ""}
                onChange={(event) =>
                  setAmountInputs((current) => ({ ...current, [rate.id]: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Gültig ab</span>
              <input
                disabled={disabled}
                type="date"
                value={rate.validFrom}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === rate.id ? { ...item, validFrom: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              <span>Gültig bis · optional</span>
              <input
                disabled={disabled}
                type="date"
                value={rate.validUntil ?? ""}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === rate.id
                        ? { ...item, validUntil: event.target.value || null }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="check-row">
              <input
                checked={rate.active}
                disabled={disabled}
                type="checkbox"
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === rate.id ? { ...item, active: event.target.checked } : item,
                    ),
                  )
                }
              />{" "}
              aktiv
            </label>
            <PrimaryButton disabled={disabled} onClick={() => saveRate(rate)}>
              Satz lokal speichern
            </PrimaryButton>
            {(rateErrors[rate.id] ?? []).length > 0 ? (
              <div className="field-error" role="alert">
                {(rateErrors[rate.id] ?? []).map((message) => (
                  <div key={message}>{message}</div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditLog({ entries }: { entries: readonly AuditEntry[] }) {
  return (
    <section>
      <SectionTitle
        title="Auditprotokoll"
        subtitle="Lokale Demo – kein produktiver Sicherheitsnachweis."
      />
      {entries.length === 0 ? (
        <p className="empty-state">Noch keine Änderungen in dieser lokalen Sitzung.</p>
      ) : (
        <div className="responsive-data-list">
          {entries.map((entry) => (
            <article className="data-card" key={entry.id}>
              <span>
                <small>Zeitpunkt / Bearbeitung</small>
                <strong>
                  {dateFormatter.format(new Date(entry.occurredAt))} · {entry.actor}
                </strong>
              </span>
              <span>
                <small>Aktion / Objekt</small>
                <strong>
                  {entry.action} · {entry.object}
                </strong>
              </span>
              <span>
                <small>Vorher → nachher</small>
                <strong>
                  {entry.previousValue ?? "–"} → {entry.newValue ?? "–"}
                </strong>
              </span>
              {entry.reason ? (
                <span>
                  <small>Begründung</small>
                  <strong>{entry.reason}</strong>
                </span>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentList({
  month,
  members,
  statusFor,
  settlementViewFor,
  onMonthChange,
  onPaid,
  onExport,
}: {
  month: string;
  members: readonly Member[];
  statusFor: (id: string) => SettlementStatusValue;
  settlementViewFor: (id: string) => SettlementView;
  onMonthChange: (month: string) => void;
  onPaid: (id: string) => void;
  onExport: () => void;
}) {
  const rows = members.filter((member) => isPayableStatus(statusFor(member.id)));
  return (
    <section>
      <SectionTitle
        title="Zahlungsliste"
        subtitle="Nur freigegebene und bezahlte Abrechnungen – ohne Bankdaten."
      />
      <label className="month-control">
        <span>Abrechnungsmonat</span>
        <input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
      </label>
      <div className="export-actions no-print">
        <SecondaryButton onClick={onExport}>
          <Download aria-hidden="true" /> Zahlungsliste CSV
        </SecondaryButton>
        <SecondaryButton onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Drucken
        </SecondaryButton>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">Keine freigegebenen Abrechnungen in diesem Monat.</p>
      ) : (
        <div className="responsive-data-list">
          {rows.map((member) => (
            <article className="data-card" key={member.id}>
              <span className="person-cell">
                <MemberAvatar initials={member.initials} />
                <strong>{member.name}</strong>
              </span>
              <span>
                <small>Abrechnungsmonat</small>
                <strong>{displayMonth(month)}</strong>
              </span>
              <span>
                <small>Freigegebener Betrag</small>
                <strong>{formatEuro(settlementViewFor(member.id).totalCents)}</strong>
              </span>
              <StatusTag tone={statusTone(statusFor(member.id))}>
                {statusLabels[statusFor(member.id)]}
              </StatusTag>
              {statusFor(member.id) === SettlementStatus.APPROVED ? (
                <PrimaryButton onClick={() => onPaid(member.id)}>
                  Als bezahlt markieren
                </PrimaryButton>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
