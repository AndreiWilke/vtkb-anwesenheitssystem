import { useMemo, useState } from "react";
import {
  DemoRole,
  MemberQualification,
  SessionRole,
  SettlementStatus,
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
  attendanceCsv,
  calculateSettlement,
  canTransitionSettlement,
  compensationCsv,
  createCorrection,
  createSettlementSnapshot,
  filterSessionsByPeriod,
  formatEuro,
  monthlyAttendance,
  paymentCsv,
  roleCan,
  type MemberAttendanceSummary,
  type PeriodFilter,
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
  const [statuses, setStatuses] = useState<Record<string, SettlementStatusValue>>({});
  const [corrections, setCorrections] = useState<Record<string, CompensationCorrection[]>>({});
  const [snapshots, setSnapshots] = useState<Record<string, SettlementSnapshot>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodFilter["mode"]>("MONTH");
  const [year, setYear] = useState(2026);
  const [rangeFrom, setRangeFrom] = useState("2026-01-01");
  const [rangeUntil, setRangeUntil] = useState("2026-06-30");
  const [memberQuery, setMemberQuery] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
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
        ...(ageGroup ? { ageGroup: ageGroup as Member["ageGroup"] } : {}),
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
      ageGroup,
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

  const trainerMembers = members.filter((member) =>
    historicalSessions.some((session) =>
      session.attendance.some(
        (record) =>
          record.memberId === member.id &&
          (record.sessionRole === SessionRole.RESPONSIBLE_TRAINER ||
            record.sessionRole === SessionRole.ASSISTANT_TRAINER),
      ),
    ),
  );
  const keyFor = (memberId: string) => `${month}:${memberId}`;
  const statusFor = (memberId: string) => statuses[keyFor(memberId)] ?? SettlementStatus.DRAFT;
  const correctionsFor = (memberId: string) => corrections[keyFor(memberId)] ?? [];
  const calculationFor = (memberId: string) =>
    calculateSettlement(memberId, month, historicalSessions, rates, correctionsFor(memberId));
  const displayTotal = (memberId: string) =>
    snapshots[keyFor(memberId)]?.totalCents ?? calculationFor(memberId).totalCents;

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
    if (!canTransitionSettlement(previous, next)) return;
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
        calculationFor(memberId),
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
    const amountCents = Math.round(Number(correctionAmount.replace(",", ".")) * 100);
    const correction = createCorrection({
      id: `correction-${Date.now()}`,
      amountCents,
      reason: correctionReason,
      editedBy: "Vorstand Demo A",
      editedAt: new Date().toISOString(),
    });
    const key = keyFor(selectedMemberId);
    setCorrections((current) => ({ ...current, [key]: [...(current[key] ?? []), correction] }));
    addAudit("Korrektur hinzugefügt", key, null, formatEuro(amountCents), correction.reason);
    setCorrectionOpen(false);
    setCorrectionAmount("");
    setCorrectionReason("");
  };

  const removeCorrection = (correction: CompensationCorrection) => {
    const key = keyFor(selectedMemberId);
    setCorrections((current) => ({
      ...current,
      [key]: (current[key] ?? []).filter((item) => item.id !== correction.id),
    }));
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
    setSelectedMemberId(memberId);
    setView("SETTLEMENT_DETAIL");
  };

  const activeView: ReportingView =
    demoRole === DemoRole.TRAINER
      ? "OWN"
      : demoRole === DemoRole.TREASURER &&
          view !== "PAYMENTS" &&
          view !== "SETTLEMENTS" &&
          view !== "SETTLEMENT_DETAIL"
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
          members={members}
          rates={rates}
          statuses={trainerMembers.map((member) => statusFor(member.id))}
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
              label="Altersgruppe"
              value={ageGroup}
              onChange={setAgeGroup}
              options={[
                ["KIND", "Kinder"],
                ["JUGEND", "Jugend"],
                ["ERWACHSEN", "Erwachsene"],
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
              label="Heutige Funktion"
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
            calculationFor={calculationFor}
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
                    trainerMembers.map((member) => ({
                      member,
                      calculation: calculationFor(member.id),
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
            members={trainerMembers}
            statusFor={statusFor}
            calculationFor={calculationFor}
            displayTotal={displayTotal}
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
          corrections={correctionsFor(activeView === "OWN" ? "member-01" : selectedMemberId)}
          snapshot={snapshots[keyFor(activeView === "OWN" ? "member-01" : selectedMemberId)]}
          status={statusFor(activeView === "OWN" ? "member-01" : selectedMemberId)}
          demoRole={demoRole}
          onBack={() => setView("SETTLEMENTS")}
          onAddCorrection={() => setCorrectionOpen(true)}
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
        />
      ) : null}

      {activeView === "AUDIT" ? <AuditLog entries={audit} /> : null}

      {activeView === "PAYMENTS" ? (
        <PaymentList
          displayTotal={displayTotal}
          members={trainerMembers}
          month={month}
          statusFor={statusFor}
          onExport={() =>
            downloadCsv(
              "zahlungsliste.csv",
              paymentCsv(
                month,
                trainerMembers
                  .filter((member) => isPayableStatus(statusFor(member.id)))
                  .map((member) => ({
                    member,
                    totalCents: displayTotal(member.id),
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
                onChange={(event) => setCorrectionAmount(event.target.value)}
              />
            </label>
            <label>
              <span>Begründung</span>
              <textarea
                aria-label="Korrekturbegründung"
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
              />
            </label>
            <PrimaryButton
              disabled={
                !correctionReason.trim() ||
                !correctionAmount ||
                Number(correctionAmount.replace(",", ".")) === 0
              }
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
  members,
  rates,
  statuses,
  onMonthChange,
}: {
  month: string;
  members: readonly Member[];
  rates: readonly CompensationRate[];
  statuses: readonly SettlementStatusValue[];
  onMonthChange: (month: string) => void;
}) {
  const sessions = filterSessionsByPeriod(historicalSessions, { mode: "MONTH", month });
  const records = sessions.flatMap((session) => session.attendance);
  const unique = new Set(records.map((record) => record.memberId)).size;
  const settlements = members.map((member) =>
    calculateSettlement(member.id, month, historicalSessions, rates),
  );
  const metrics = [
    ["Abgeschlossene Einheiten", sessions.length],
    ["Unterschiedliche Anwesende", unique],
    ["Gesamte Anwesenheiten", records.length],
    [
      "Verantwortliche Einsätze",
      records.filter((record) => record.sessionRole === SessionRole.RESPONSIBLE_TRAINER).length,
    ],
    [
      "Assistenz-Einsätze",
      records.filter((record) => record.sessionRole === SessionRole.ASSISTANT_TRAINER).length,
    ],
    [
      "Voraussichtliche Gesamtvergütung",
      formatEuro(settlements.reduce((sum, item) => sum + item.totalCents, 0)),
    ],
    [
      "Abrechnungen im Entwurf",
      statuses.filter((status) => status === SettlementStatus.DRAFT).length,
    ],
    [
      "Geprüfte Abrechnungen",
      statuses.filter((status) => status === SettlementStatus.REVIEWED).length,
    ],
    [
      "Freigegebene Abrechnungen",
      statuses.filter((status) => status === SettlementStatus.APPROVED).length,
    ],
    ["Bezahlte Abrechnungen", statuses.filter((status) => status === SettlementStatus.PAID).length],
    ["Offene Prüfhinweise", settlements.reduce((sum, item) => sum + item.reviewNotes.length, 0)],
  ] as const;
  const development = Array.from({ length: 6 }, (_, index) => {
    const key = `2026-${String(index + 1).padStart(2, "0")}`;
    const count = filterSessionsByPeriod(historicalSessions, { mode: "MONTH", month: key }).flatMap(
      (session) => session.attendance,
    ).length;
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
                {item.member.ageGroup} · {item.member.active ? "aktiv" : "inaktiv"}
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
  const entries = historicalSessions
    .flatMap((session) =>
      session.attendance
        .filter(
          (record) =>
            record.memberId === member.id &&
            (!monthFilter || session.date.startsWith(monthFilter)) &&
            (!yearFilter || session.date.startsWith(`${yearFilter}-`)) &&
            (!trainingFilter || session.trainingType === trainingFilter) &&
            (!roleFilter || record.sessionRole === roleFilter),
        )
        .map((record) => ({ session, record })),
    )
    .sort((a, b) =>
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
          <span>{member.ageGroup}</span>
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
            (item) => item.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
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
  calculationFor,
  onOpen,
}: {
  members: readonly Member[];
  month: string;
  statusFor: (id: string) => SettlementStatusValue;
  calculationFor: (id: string) => ReturnType<typeof calculateSettlement>;
  onOpen: (id: string) => void;
}) {
  const yearly = aggregateAttendance(members, historicalSessions, { mode: "YEAR", year: 2026 });
  return (
    <div className="responsive-data-list">
      {members.map((member) => {
        const summary = yearly.find((item) => item.member.id === member.id)!;
        const calculation = calculationFor(member.id);
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
                {calculation.responsibleCount} / {calculation.assistantCount}
              </strong>
            </span>
            <span>
              <small>Automatisch</small>
              <strong>{formatEuro(calculation.totalCents)}</strong>
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
  calculationFor,
  displayTotal,
  onOpen,
}: {
  members: readonly Member[];
  statusFor: (id: string) => SettlementStatusValue;
  calculationFor: (id: string) => ReturnType<typeof calculateSettlement>;
  displayTotal: (id: string) => number;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="responsive-data-list">
      {members.map((member) => {
        const calculation = calculationFor(member.id);
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
                {calculation.responsibleCount} · {formatEuro(calculation.responsibleCents)}
              </strong>
            </span>
            <span>
              <small>Assistenz</small>
              <strong>
                {calculation.assistantCount} · {formatEuro(calculation.assistantCents)}
              </strong>
            </span>
            <span>
              <small>Korrekturen</small>
              <strong>{formatEuro(calculation.correctionCents)}</strong>
            </span>
            <span className="money-total">
              <small>Gesamt</small>
              <strong>{formatEuro(displayTotal(member.id))}</strong>
            </span>
            <StatusTag tone={statusTone(statusFor(member.id))}>
              {statusLabels[statusFor(member.id)]}
            </StatusTag>
            {calculation.reviewNotes.length ? (
              <span className="review-note">{calculation.reviewNotes.length} Prüfhinweis(e)</span>
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
  corrections,
  snapshot,
  status,
  demoRole,
  onBack,
  onAddCorrection,
  onRemoveCorrection,
  onTransition,
}: {
  member: Member;
  month: string;
  calculation: ReturnType<typeof calculateSettlement>;
  corrections: readonly CompensationCorrection[];
  snapshot?: SettlementSnapshot;
  status: SettlementStatusValue;
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
  const lines = snapshot?.lines ?? calculation.lines;
  const shownCorrections = snapshot?.corrections ?? corrections;
  const frozen = status === SettlementStatus.APPROVED || status === SettlementStatus.PAID;
  const trainerSubtotal = lines
    .filter((line) => line.role === SessionRole.RESPONSIBLE_TRAINER)
    .reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
  const assistantSubtotal = lines
    .filter((line) => line.role === SessionRole.ASSISTANT_TRAINER)
    .reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
  const correctionTotal = shownCorrections.reduce((sum, item) => sum + item.amountCents, 0);
  const total = snapshot?.totalCents ?? calculation.totalCents;
  return (
    <section className="print-sheet">
      <div className="no-print">
        <button className="text-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Zur Monatsabrechnung
        </button>
      </div>
      <SectionTitle
        title={`${member.name} · ${displayMonth(month)}`}
        subtitle={
          frozen
            ? "Freigegebener Snapshot – unveränderlich"
            : "Entwurf – Änderungen an Sätzen berechnen automatisch neu"
        }
      />
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
        {snapshot ? (
          <span>
            Freigegeben {dateFormatter.format(new Date(snapshot.approvedAt))} durch{" "}
            {snapshot.approvedBy}
          </span>
        ) : null}
      </div>
      {calculation.reviewNotes.length ? (
        <div className="validation-box">
          <strong>Prüfhinweis</strong>
          {calculation.reviewNotes.map((note) => (
            <div key={note}>{note}</div>
          ))}
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
              {!frozen && demoRole === DemoRole.BOARD ? (
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
        {!frozen && demoRole === DemoRole.BOARD ? (
          <SecondaryButton className="no-print" onClick={onAddCorrection}>
            Korrektur hinzufügen
          </SecondaryButton>
        ) : null}
      </section>
      <dl className="settlement-totals">
        <div>
          <dt>Zwischensumme Trainer</dt>
          <dd>{formatEuro(trainerSubtotal)}</dd>
        </div>
        <div>
          <dt>Zwischensumme Assistenz</dt>
          <dd>{formatEuro(assistantSubtotal)}</dd>
        </div>
        <div>
          <dt>Korrekturen</dt>
          <dd>{formatEuro(correctionTotal)}</dd>
        </div>
        <div className="grand-total">
          <dt>Gesamtbetrag</dt>
          <dd>{formatEuro(total)}</dd>
        </div>
      </dl>
      <div className="settlement-actions no-print">
        <SecondaryButton onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Einzelabrechnung drucken
        </SecondaryButton>
        {demoRole === DemoRole.BOARD && status === SettlementStatus.DRAFT ? (
          <PrimaryButton onClick={() => onTransition(SettlementStatus.REVIEWED)}>
            Als geprüft markieren
          </PrimaryButton>
        ) : null}
        {demoRole === DemoRole.BOARD && status === SettlementStatus.REVIEWED ? (
          <>
            <SecondaryButton onClick={() => onTransition(SettlementStatus.DRAFT)}>
              Zurück in Entwurf
            </SecondaryButton>
            <PrimaryButton onClick={() => onTransition(SettlementStatus.APPROVED)}>
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
}: {
  rates: readonly CompensationRate[];
  disabled: boolean;
  onSave: (rate: CompensationRate, previous: CompensationRate) => void;
}) {
  const [drafts, setDrafts] = useState(() => rates.map((rate) => ({ ...rate })));
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
                value={(rate.amountCents / 100).toFixed(2).replace(".", ",")}
                onChange={(event) => {
                  const amountCents = Math.round(
                    Number(event.target.value.replace(",", ".")) * 100,
                  );
                  if (Number.isFinite(amountCents))
                    setDrafts((current) =>
                      current.map((item) =>
                        item.id === rate.id ? { ...item, amountCents } : item,
                      ),
                    );
                }}
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
            <PrimaryButton
              disabled={disabled}
              onClick={() => onSave(rate, rates.find((item) => item.id === rate.id)!)}
            >
              Satz lokal speichern
            </PrimaryButton>
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
  displayTotal,
  onMonthChange,
  onPaid,
  onExport,
}: {
  month: string;
  members: readonly Member[];
  statusFor: (id: string) => SettlementStatusValue;
  displayTotal: (id: string) => number;
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
                <strong>{formatEuro(displayTotal(member.id))}</strong>
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
