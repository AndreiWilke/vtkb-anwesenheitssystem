import { describe, expect, it } from "vitest";
import {
  CaptureSource,
  CompensationBillingType,
  DemoRole,
  PresenceStatus,
  SessionRole,
  SettlementStatus,
  TrainingSessionStatus,
  type CompensationRate,
} from "@vtkb/shared";

import { members } from "./mockData";
import { historicalSessions, initialCompensationRates } from "./reportingMockData";
import {
  aggregateAttendance,
  attendanceCsv,
  calculateSettlement,
  canTransitionSettlement,
  compensationCsv,
  createCorrection,
  createSettlementSnapshot,
  filterSessionsByPeriod,
  findCompensationRate,
  formatEuro,
  monthlyAttendance,
  paymentCsv,
  roleCan,
} from "./reporting";
import type { HistoricalTrainingSession } from "./types";

function session(
  date: string,
  role:
    | typeof SessionRole.RESPONSIBLE_TRAINER
    | typeof SessionRole.ASSISTANT_TRAINER
    | typeof SessionRole.PARTICIPANT,
  status: HistoricalTrainingSession["status"] = TrainingSessionStatus.COMPLETED,
): HistoricalTrainingSession {
  return {
    id: `session-${date}-${role}-${status}`,
    date,
    startsAt: `${date}T17:00:00.000Z`,
    endsAt: `${date}T18:30:00.000Z`,
    timeZone: "Europe/Berlin",
    name: "Fiktive Testeinheit",
    trainingType: "GRUNDLAGENTRAINING",
    dojo: "Test-Dojo",
    status,
    attendance: [
      {
        sessionId: `session-${date}-${role}-${status}`,
        memberId: "member-05",
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: role,
        captureSource: CaptureSource.MANUAL,
      },
    ],
    completedAt: status === TrainingSessionStatus.COMPLETED ? `${date}T18:35:00.000Z` : null,
    completedBy: status === TrainingSessionStatus.COMPLETED ? "Vorstand Test" : null,
  };
}

const splitRates: CompensationRate[] = [
  {
    id: "trainer-old",
    label: "Trainer alt",
    role: SessionRole.RESPONSIBLE_TRAINER,
    billingType: CompensationBillingType.PER_COMPLETED_SESSION,
    amountCents: 2_000,
    validFrom: "2025-01-01",
    validUntil: "2026-06-30",
    active: true,
  },
  {
    id: "trainer-new",
    label: "Trainer neu",
    role: SessionRole.RESPONSIBLE_TRAINER,
    billingType: CompensationBillingType.PER_COMPLETED_SESSION,
    amountCents: 2_500,
    validFrom: "2026-07-01",
    validUntil: null,
    active: true,
  },
];

describe("Paket 1.1 Anwesenheitsauswertung", () => {
  it.each([
    [SessionRole.PARTICIPANT, "participant"],
    [SessionRole.RESPONSIBLE_TRAINER, "responsible"],
    [SessionRole.ASSISTANT_TRAINER, "assistant"],
  ] as const)("zählt %s genau einmal als anwesend", (role, field) => {
    const result = aggregateAttendance(members, [session("2026-01-15", role)], {
      mode: "MONTH",
      month: "2026-01",
    }).find((item) => item.member.id === "member-05")!;
    expect(result.total).toBe(1);
    expect(result[field]).toBe(1);
  });

  it("zählt Trainer und Assistenztrainer nicht zusätzlich als Teilnehmer", () => {
    const result = aggregateAttendance(
      members,
      [
        session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER),
        session("2026-01-16", SessionRole.ASSISTANT_TRAINER),
      ],
      { mode: "MONTH", month: "2026-01" },
    ).find((item) => item.member.id === "member-05")!;
    expect(result).toMatchObject({ total: 2, participant: 0, responsible: 1, assistant: 1 });
  });

  it("filtert Monatsgrenzen anhand des fachlichen Europe/Berlin-Datums", () => {
    expect(
      filterSessionsByPeriod(
        [
          session("2026-01-31", SessionRole.PARTICIPANT),
          session("2026-02-01", SessionRole.PARTICIPANT),
        ],
        { mode: "MONTH", month: "2026-02" },
      ),
    ).toHaveLength(1);
  });

  it("filtert ein vollständiges Jahr", () => {
    expect(
      filterSessionsByPeriod(
        [...historicalSessions, session("2025-12-31", SessionRole.PARTICIPANT)],
        { mode: "YEAR", year: 2026 },
      ),
    ).toHaveLength(60);
  });

  it("ermittelt die letzte Teilnahme und konsistente Rollensummen", () => {
    const result = aggregateAttendance(members, historicalSessions, { mode: "YEAR", year: 2026 });
    result.forEach((item) =>
      expect(item.total).toBe(item.participant + item.responsible + item.assistant),
    );
    expect(result.find((item) => item.member.id === "member-01")?.lastAttendance).toMatch(
      /^2026-06-/,
    );
  });

  it("berechnet Monatswerte aus den Einheiten statt aus Mitgliedsstammdaten", () => {
    const values = monthlyAttendance("member-01", historicalSessions);
    expect(values).toHaveLength(6);
    expect(values.every((item) => item.count > 0)).toBe(true);
  });

  it("stellt keine Fehlzeiten- oder Anwesenheitsquote bereit", () => {
    const result = aggregateAttendance(members, historicalSessions, {
      mode: "YEAR",
      year: 2026,
    })[0]!;
    expect(result).not.toHaveProperty("attendanceRate");
    expect(result).not.toHaveProperty("absences");
  });
});

describe("Paket 1.1 Trainerabrechnung", () => {
  it("vergütet verantwortliche Trainer und Assistenztrainer mit ihrem gültigen Satz", () => {
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
        initialCompensationRates,
      ).totalCents,
    ).toBe(2_000);
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.ASSISTANT_TRAINER)],
        initialCompensationRates,
      ).totalCents,
    ).toBe(1_000);
  });

  it("vergütet normale Teilnahme nicht", () => {
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.PARTICIPANT)],
        initialCompensationRates,
      ).totalCents,
    ).toBe(0);
  });

  it("vergütet einen dauerhaft qualifizierten Assistenten als verantwortlichen Trainer ausschließlich mit Trainersatz", () => {
    const value = calculateSettlement(
      "member-05",
      "2026-01",
      [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
      initialCompensationRates,
    );
    expect(value).toMatchObject({ responsibleCount: 1, assistantCount: 0, totalCents: 2_000 });
  });

  it("berechnet mehrere Assistenztrainer getrennt je Person", () => {
    const base = session("2026-01-15", SessionRole.ASSISTANT_TRAINER);
    const combined = {
      ...base,
      attendance: [...base.attendance, { ...base.attendance[0]!, memberId: "member-06" }],
    };
    expect(
      calculateSettlement("member-05", "2026-01", [combined], initialCompensationRates).totalCents,
    ).toBe(1_000);
    expect(
      calculateSettlement("member-06", "2026-01", [combined], initialCompensationRates).totalCents,
    ).toBe(1_000);
  });

  it.each([
    TrainingSessionStatus.PLANNED,
    TrainingSessionStatus.IN_PROGRESS,
    TrainingSessionStatus.CANCELLED,
  ])("rechnet Status %s nicht ab", (status) => {
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER, status)],
        initialCompensationRates,
      ).lines,
    ).toHaveLength(0);
  });

  it("verhindert Vergütungsdoppelung bei doppeltem Anwesenheitseintrag", () => {
    const base = session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER);
    const duplicate = { ...base, attendance: [...base.attendance, base.attendance[0]!] };
    expect(
      calculateSettlement("member-05", "2026-01", [duplicate], initialCompensationRates).totalCents,
    ).toBe(2_000);
  });

  it("berechnet Centwerte exakt", () => {
    const rates = splitRates.map((rate) => ({ ...rate, amountCents: 1_999, validUntil: null }));
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
        rates,
      ).totalCents,
    ).toBe(1_999);
    expect(formatEuro(1_999)).toBe("19,99 €");
  });

  it("wendet wechselnde Sätze an Monats-, Jahres- und Gültig-ab-Grenzen an", () => {
    expect(
      findCompensationRate(splitRates, SessionRole.RESPONSIBLE_TRAINER, "2026-06-30")?.amountCents,
    ).toBe(2_000);
    expect(
      findCompensationRate(splitRates, SessionRole.RESPONSIBLE_TRAINER, "2026-07-01")?.amountCents,
    ).toBe(2_500);
    expect(
      findCompensationRate(splitRates, SessionRole.RESPONSIBLE_TRAINER, "2027-01-01")?.amountCents,
    ).toBe(2_500);
  });

  it("erzeugt bei fehlendem Satz einen Prüfhinweis statt stiller Nullabrechnung", () => {
    const result = calculateSettlement(
      "member-05",
      "2026-01",
      [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
      [],
    );
    expect(result.lines[0]).toMatchObject({ rateCents: null, amountCents: null });
    expect(result.reviewNotes[0]).toContain("Kein aktiver Vergütungssatz");
  });

  it.each([
    [250, 2_250],
    [-250, 1_750],
  ] as const)("berücksichtigt Korrektur %d Cent", (amountCents, expected) => {
    const correction = createCorrection({
      id: "c1",
      amountCents,
      reason: "Fiktive Testkorrektur",
      editedBy: "Vorstand Test",
      editedAt: "2026-01-31T12:00:00Z",
    });
    expect(
      calculateSettlement(
        "member-05",
        "2026-01",
        [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
        initialCompensationRates,
        [correction],
      ).totalCents,
    ).toBe(expected);
  });

  it("lehnt Korrekturen ohne Begründung ab", () => {
    expect(() =>
      createCorrection({
        id: "c1",
        amountCents: 100,
        reason: " ",
        editedBy: "Vorstand Test",
        editedAt: "2026-01-31T12:00:00Z",
      }),
    ).toThrow("Begründung");
  });
});

describe("Status, Rollen, Snapshot und Export", () => {
  it("erlaubt und verwirft die definierten Statusübergänge", () => {
    expect(canTransitionSettlement(SettlementStatus.DRAFT, SettlementStatus.REVIEWED)).toBe(true);
    expect(canTransitionSettlement(SettlementStatus.REVIEWED, SettlementStatus.DRAFT)).toBe(true);
    expect(canTransitionSettlement(SettlementStatus.REVIEWED, SettlementStatus.APPROVED)).toBe(
      true,
    );
    expect(canTransitionSettlement(SettlementStatus.APPROVED, SettlementStatus.PAID)).toBe(true);
    expect(canTransitionSettlement(SettlementStatus.DRAFT, SettlementStatus.PAID)).toBe(false);
    expect(canTransitionSettlement(SettlementStatus.PAID, SettlementStatus.DRAFT)).toBe(false);
    expect(canTransitionSettlement(SettlementStatus.CANCELLED, SettlementStatus.PAID)).toBe(false);
  });

  it("erzeugt bei Freigabe einen unveränderlichen Snapshot", () => {
    const calculation = calculateSettlement(
      "member-05",
      "2026-01",
      [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
      initialCompensationRates,
    );
    const snapshot = createSettlementSnapshot(
      calculation,
      [],
      "Vorstand Test",
      "2026-02-01T12:00:00Z",
    );
    initialCompensationRates[0]!.amountCents = 9_999;
    expect(snapshot.totalCents).toBe(2_000);
    expect(Object.isFrozen(snapshot.lines)).toBe(true);
    initialCompensationRates[0]!.amountCents = 2_000;
  });

  it("bildet Demo-Rollenberechtigungen ab", () => {
    expect(roleCan(DemoRole.TRAINER, "VIEW_ALL")).toBe(false);
    expect(roleCan(DemoRole.TRAINER, "EDIT_RATES")).toBe(false);
    expect(roleCan(DemoRole.BOARD, "APPROVE")).toBe(true);
    expect(roleCan(DemoRole.TREASURER, "MARK_PAID")).toBe(true);
    expect(roleCan(DemoRole.TREASURER, "VIEW_ALL")).toBe(false);
  });

  it("erzeugt korrekte CSV-Kopfzeilen, Beträge und keine Bankdaten", () => {
    const summaries = aggregateAttendance(members, historicalSessions, {
      mode: "MONTH",
      month: "2026-06",
    });
    const attendance = attendanceCsv(summaries, "Juni 2026");
    expect(attendance).toContain("Mitglied;Altersgruppe;Gürtelfarbe");
    const calculation = calculateSettlement(
      "member-01",
      "2026-06",
      historicalSessions,
      initialCompensationRates,
    );
    const compensation = compensationCsv("2026-06", [
      { member: members[0]!, calculation, status: SettlementStatus.DRAFT },
    ]);
    expect(compensation).toContain(formatEuro(calculation.totalCents));
    const payment = paymentCsv("2026-06", [
      {
        member: members[0]!,
        totalCents: calculation.totalCents,
        status: SettlementStatus.APPROVED,
      },
    ]);
    expect(payment).toContain("freigegebener Betrag");
    expect(`${attendance}${compensation}${payment}`).not.toMatch(/IBAN|BIC|Kontonummer/i);
    expect(attendance).toContain("Juni 2026");
  });
});
