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
  addSettlementCorrection,
  aggregateAttendance,
  attendanceCsv,
  calculateDashboardMetrics,
  calculateSettlement,
  canTransitionSettlement,
  compensationCsv,
  createCancellationSnapshot,
  createCorrection,
  createSettlementSnapshot,
  filterSessionsByPeriod,
  findCompensationRate,
  formatEuro,
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
      {
        member: members[0]!,
        settlement: resolveSettlementView(SettlementStatus.DRAFT, calculation, undefined),
        status: SettlementStatus.DRAFT,
      },
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

describe("Korrekturen: ausschließlich tatsächliche Anwesenheit", () => {
  const present = session("2026-01-10", SessionRole.PARTICIPANT);
  const absent: HistoricalTrainingSession = {
    ...session("2026-01-20", SessionRole.PARTICIPANT),
    attendance: [
      {
        ...session("2026-01-20", SessionRole.PARTICIPANT).attendance[0]!,
        presenceStatus: PresenceStatus.ABSENT,
        sessionRole: null,
      },
    ],
  };

  it("zählt ABSENT weder monatlich noch als letzte Teilnahme", () => {
    const absentOnly = aggregateAttendance(members, [absent], {
      mode: "MONTH",
      month: "2026-01",
    }).find((item) => item.member.id === "member-05")!;
    expect(absentOnly).toMatchObject({ total: 0, lastAttendance: null });
    expect(monthlyAttendance("member-05", [absent])).toEqual([]);

    const withEarlierPresence = aggregateAttendance(members, [present, absent], {
      mode: "MONTH",
      month: "2026-01",
    }).find((item) => item.member.id === "member-05")!;
    expect(withEarlierPresence.lastAttendance).toBe("2026-01-10");
  });

  it("liefert ABSENT nicht für das Mitgliedsdetail", () => {
    expect(memberAttendanceEntries("member-05", [absent])).toEqual([]);
    expect(memberAttendanceEntries("member-05", [present, absent])).toHaveLength(1);
  });

  it("erhöht Dashboardwerte und CSV-Anwesenheit nicht", () => {
    const metrics = calculateDashboardMetrics([absent], []);
    expect(metrics).toMatchObject({
      completedSessions: 1,
      uniquePresentMembers: 0,
      totalAttendances: 0,
      responsibleAssignments: 0,
      assistantAssignments: 0,
    });
    const summary = aggregateAttendance(members, [absent], {
      mode: "MONTH",
      month: "2026-01",
    }).filter((item) => item.member.id === "member-05");
    const exported = attendanceCsv(summary, "Januar 2026");
    expect(exported).toContain(";0;0;0;0;");
    expect(exported).not.toContain("2026-01-20");
  });

  it.each([
    TrainingSessionStatus.PLANNED,
    TrainingSessionStatus.IN_PROGRESS,
    TrainingSessionStatus.CANCELLED,
    TrainingSessionStatus.ABORTED,
  ])("ignoriert Anwesenheit einer Einheit mit Status %s", (status) => {
    const nonCompleted = session("2026-01-15", SessionRole.PARTICIPANT, status);
    expect(calculateDashboardMetrics([nonCompleted], []).totalAttendances).toBe(0);
    expect(memberAttendanceEntries("member-05", [nonCompleted])).toEqual([]);
  });

  it("rechnet einen abwesenden Trainer nicht ab", () => {
    const absentTrainer: HistoricalTrainingSession = {
      ...absent,
      attendance: [
        {
          ...absent.attendance[0]!,
          sessionRole: SessionRole.RESPONSIBLE_TRAINER,
        },
      ],
    };
    expect(
      calculateSettlement("member-05", "2026-01", [absentTrainer], initialCompensationRates).lines,
    ).toEqual([]);
    expect(membersWithTrainerActivity(members, [absentTrainer])).toEqual([]);
  });
});

describe("Korrekturen: verbindliche Snapshotquelle und Statussperren", () => {
  const completed = session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER);

  it("verwendet nach Freigabe zentral den Snapshot in Detail, Listen, CSV und Dashboard", () => {
    const original = calculateSettlement(
      "member-05",
      "2026-01",
      [completed],
      initialCompensationRates,
    );
    const snapshot = createSettlementSnapshot(
      original,
      [],
      "Vorstand Test",
      "2026-02-01T10:00:00Z",
    );
    const changedRates = initialCompensationRates.map((rate) =>
      rate.role === SessionRole.RESPONSIBLE_TRAINER ? { ...rate, amountCents: 9_900 } : rate,
    );
    const changed = calculateSettlement("member-05", "2026-01", [completed], changedRates);
    expect(changed.totalCents).toBe(9_900);

    const view = resolveSettlementView(SettlementStatus.APPROVED, changed, snapshot);
    expect(view).toMatchObject({
      source: "SNAPSHOT",
      totalCents: 2_000,
      responsibleCents: 2_000,
      assistantCents: 0,
    });
    const compensation = compensationCsv("2026-01", [
      { member: members[4]!, settlement: view, status: SettlementStatus.APPROVED },
    ]);
    const payment = paymentCsv("2026-01", [
      { member: members[4]!, totalCents: view.totalCents, status: SettlementStatus.APPROVED },
    ]);
    const dashboard = calculateDashboardMetrics(
      [completed],
      [{ status: SettlementStatus.APPROVED, view }],
    );
    expect(compensation).toContain("20,00 €");
    expect(compensation).not.toContain("99,00 €");
    expect(payment).toContain("20,00 €");
    expect(dashboard.totalCompensationCents).toBe(2_000);
  });

  it("blockiert Prüfung und Freigabe bei fehlendem Satz", () => {
    const incomplete = calculateSettlement("member-05", "2026-01", [completed], []);
    expect(validateSettlementForReview(incomplete).valid).toBe(false);
    expect(validateSettlementForApproval(incomplete).valid).toBe(false);
    expect(() =>
      transitionSettlementStatus(SettlementStatus.DRAFT, SettlementStatus.REVIEWED, incomplete),
    ).toThrow("blockiert");
    expect(() =>
      transitionSettlementStatus(SettlementStatus.REVIEWED, SettlementStatus.APPROVED, incomplete),
    ).toThrow("blockiert");
  });

  it("erlaubt Prüfung und Freigabe einer vollständigen Abrechnung", () => {
    const complete = calculateSettlement(
      "member-05",
      "2026-01",
      [completed],
      initialCompensationRates,
    );
    expect(validateSettlementForReview(complete).valid).toBe(true);
    expect(
      transitionSettlementStatus(SettlementStatus.DRAFT, SettlementStatus.REVIEWED, complete),
    ).toBe(SettlementStatus.REVIEWED);
    expect(
      transitionSettlementStatus(SettlementStatus.REVIEWED, SettlementStatus.APPROVED, complete),
    ).toBe(SettlementStatus.APPROVED);
  });

  it("friert eine vor Freigabe stornierte Abrechnung ein", () => {
    const original = calculateSettlement(
      "member-05",
      "2026-01",
      [completed],
      initialCompensationRates,
    );
    const cancelled = createCancellationSnapshot(
      original,
      [],
      "Vorstand Test",
      "2026-01-31T10:00:00Z",
    );
    const changedRates = initialCompensationRates.map((rate) => ({ ...rate, amountCents: 9_900 }));
    const changed = calculateSettlement("member-05", "2026-01", [completed], changedRates);
    const view = resolveSettlementView(SettlementStatus.CANCELLED, changed, cancelled);
    expect(cancelled.snapshotKind).toBe("CANCELLATION");
    expect(view.totalCents).toBe(2_000);
  });

  it("behält nach Freigabe bei Stornierung den historischen Snapshot", () => {
    const calculation = calculateSettlement(
      "member-05",
      "2026-01",
      [completed],
      initialCompensationRates,
    );
    const approved = createSettlementSnapshot(
      calculation,
      [],
      "Vorstand Test",
      "2026-01-31T10:00:00Z",
    );
    const changed = { ...calculation, totalCents: 9_900, responsibleCents: 9_900 };
    const view = resolveSettlementView(SettlementStatus.CANCELLED, changed, approved);
    expect(approved.snapshotKind).toBe("APPROVAL");
    expect(view.totalCents).toBe(2_000);
  });

  it("verbietet Korrekturen und Bezahlt-Markierung nach Stornierung", () => {
    const correction = createCorrection({
      id: "correction-terminal",
      amountCents: 100,
      reason: "Fiktive Korrektur",
      editedBy: "Vorstand Test",
      editedAt: "2026-01-31T10:00:00Z",
    });
    expect(() => addSettlementCorrection([], correction, SettlementStatus.CANCELLED)).toThrow(
      "unveränderlich",
    );
    expect(() =>
      removeSettlementCorrection([correction], correction.id, SettlementStatus.CANCELLED),
    ).toThrow("unveränderlich");
    const calculation = calculateSettlement(
      "member-05",
      "2026-01",
      [completed],
      initialCompensationRates,
    );
    expect(() =>
      transitionSettlementStatus(SettlementStatus.CANCELLED, SettlementStatus.PAID, calculation),
    ).toThrow("nicht erlaubt");
  });
});

describe("Korrekturen: Vergütungssätze und sichere Betragseingabe", () => {
  const baseRate = splitRates[0]!;

  it.each([
    [{ amountCents: -1 }, "positive ganze Centzahl"],
    [{ amountCents: 0 }, "positive ganze Centzahl"],
    [{ validFrom: "" }, "Gültig-ab-Datum"],
    [{ validFrom: "2026-02-30" }, "Gültig-ab-Datum"],
    [{ validUntil: "2024-12-31" }, "nicht vor Gültig-ab"],
    [{ label: " " }, "Bezeichnung"],
  ] as const)("verwirft ungültigen Satz %#", (change, message) => {
    const issues = validateCompensationRates([{ ...baseRate, ...change }]);
    expect(issues.map((issue) => issue.message).join(" ")).toContain(message);
  });

  it("verwirft überlappende aktive Zeiträume und akzeptiert angrenzende", () => {
    const overlapping = [
      { ...baseRate, validUntil: "2026-06-30" },
      { ...splitRates[1]!, validFrom: "2026-06-30" },
    ];
    expect(
      validateCompensationRates(overlapping).some((issue) =>
        issue.message.includes("überschneiden"),
      ),
    ).toBe(true);
    expect(validateCompensationRates(splitRates)).toEqual([]);
    expect(() =>
      findCompensationRate(overlapping, SessionRole.RESPONSIBLE_TRAINER, "2026-06-30"),
    ).toThrow("überschneiden");
  });

  it("ignoriert deaktivierte Sätze und wechselt exakt am Gültig-ab-Datum", () => {
    const disabled = splitRates.map((rate, index) =>
      index === 0 ? { ...rate, active: false } : rate,
    );
    expect(
      findCompensationRate(disabled, SessionRole.RESPONSIBLE_TRAINER, "2026-06-30"),
    ).toBeNull();
    expect(
      findCompensationRate(splitRates, SessionRole.RESPONSIBLE_TRAINER, "2026-06-30")?.id,
    ).toBe("trainer-old");
    expect(
      findCompensationRate(splitRates, SessionRole.RESPONSIBLE_TRAINER, "2026-07-01")?.id,
    ).toBe("trainer-new");
  });

  it.each([
    ["10", 1_000],
    ["10,50", 1_050],
    ["-5,00", -500],
  ] as const)("parst gültige Euroeingabe %s", (input, cents) => {
    expect(parseEuroToCents(input)).toEqual({ ok: true, cents });
  });

  it.each(["", "0", "abc", "1,2,3", "1,234", "Infinity", "1000000,01"])(
    "verwirft ungültige Euroeingabe %s",
    (input) => {
      const result = parseEuroToCents(input);
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    },
  );
});

describe("Korrekturen: relevante Monatsabrechnungen", () => {
  const empty = calculateSettlement("member-40", "2026-01", [], initialCompensationRates);
  const trainer = calculateSettlement(
    "member-05",
    "2026-01",
    [session("2026-01-15", SessionRole.RESPONSIBLE_TRAINER)],
    initialCompensationRates,
  );

  it("behandelt Personen ohne Position, Korrektur, Status oder Snapshot nicht als Abrechnung", () => {
    expect(
      isSettlementRelevant({
        calculation: empty,
        corrections: [],
        hasStoredStatus: false,
      }),
    ).toBe(false);
  });

  it("behandelt Einsatz, Korrektur, gespeicherten Status oder Snapshot als relevant", () => {
    expect(
      isSettlementRelevant({ calculation: trainer, corrections: [], hasStoredStatus: false }),
    ).toBe(true);
    const correction = createCorrection({
      id: "relevant-correction",
      amountCents: 100,
      reason: "Fiktive Korrektur",
      editedBy: "Vorstand Test",
      editedAt: "2026-01-31T10:00:00Z",
    });
    expect(
      isSettlementRelevant({
        calculation: empty,
        corrections: [correction],
        hasStoredStatus: false,
      }),
    ).toBe(true);
    expect(
      isSettlementRelevant({ calculation: empty, corrections: [], hasStoredStatus: true }),
    ).toBe(true);
    expect(
      isSettlementRelevant({
        calculation: empty,
        corrections: [],
        hasStoredStatus: false,
        snapshot: createCancellationSnapshot(empty, [], "Vorstand Test", "2026-01-31T10:00:00Z"),
      }),
    ).toBe(true);
  });
});
