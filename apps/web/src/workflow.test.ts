import { describe, expect, it } from "vitest";
import {
  BeltChangeSource,
  BeltSuggestionStatus,
  ContractStatus,
  MemberQualification,
  PersonMembershipStatus,
  PresenceStatus,
  SessionRole,
  TrialOverrideStatus,
  calculateBeltDistribution,
  checkConversionEligibility,
  convertTrialParticipantToMember,
  createDirectMember,
  createBeltHistoryEntry,
  grantBoardOverride,
  openBeltSuggestions,
  suggestNextBelt,
  validateBeltChange,
} from "@vtkb/shared";

import {
  beltHistory,
  beltHistoryExtended,
  createTodaySessions,
  demoAuditEntries,
  initialBeltSuggestions,
  members,
  trialParticipants,
} from "./mockData";
import {
  canCompleteSession,
  createInitialAttendance,
  presentMemberIds,
  sessionUiStatus,
  suggestSession,
} from "./workflow";

describe("Paket-1-Workflow", () => {
  it("schlaegt die in Europe/Berlin laufende Einheit unabhaengig von der Systemzeitzone vor", () => {
    const now = new Date("2026-06-20T16:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(suggestSession(sessions, now).id).toBe("session-main");
    expect(sessions[1]?.startsAt.toISOString()).toBe("2026-06-20T15:30:00.000Z");
    expect(sessions[1]?.endsAt.toISOString()).toBe("2026-06-20T17:00:00.000Z");
  });

  it("schlaegt vor Trainingsbeginn die naechste bevorstehende Einheit vor", () => {
    const now = new Date("2026-06-20T13:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(sessionUiStatus(sessions[0]!, now)).toBe("BEVORSTEHEND");
    expect(suggestSession(sessions, now).id).toBe("session-early");
  });

  it("wechselt bei direkt aufeinanderfolgenden Einheiten exakt um 19 Uhr Berlin", () => {
    const now = new Date("2026-06-20T17:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(sessionUiStatus(sessions[1]!, now)).toBe("BEENDET");
    expect(sessionUiStatus(sessions[2]!, now)).toBe("LAEUFT");
    expect(suggestSession(sessions, now).id).toBe("session-following");
  });

  it("bleibt bei gesetzter Prozesszeitzone UTC auf Europe/Berlin reproduzierbar", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const now = new Date("2026-06-20T16:00:00.000Z");
      const sessions = createTodaySessions(now);
      expect(suggestSession(sessions, now).id).toBe("session-main");
      expect(sessions[2]?.startsAt.toISOString()).toBe("2026-06-20T17:00:00.000Z");
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("verlangt genau einen verantwortlichen Trainer", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    attendance[session.responsibleTrainerId] = {
      presenceStatus: PresenceStatus.ABSENT,
      sessionRole: null,
    };
    expect(canCompleteSession(session, attendance, 0).allowed).toBe(false);
  });

  it("zaehlt einen Assistenztrainer nur einmal als anwesend", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    attendance["member-05"] = {
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.ASSISTANT_TRAINER,
    };
    expect(presentMemberIds(attendance)).toHaveLength(2);
    expect(canCompleteSession(session, attendance, 0).allowed).toBe(true);
  });

  it("blockiert den Abschluss bei ungeklaerten Foto-Demovorschlaegen", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    const result = canCompleteSession(session, attendance, 2);
    expect(result.allowed).toBe(false);
    expect(result.messages.join(" ")).toContain("ungeklaert");
  });

  it("liefert genau 40 aktive fiktive Mitglieder fuer die Auswertung", () => {
    expect(members).toHaveLength(40);
    expect(members.every((member) => member.name.endsWith("Beispiel"))).toBe(true);
    expect(members.reduce((sum, member) => sum + member.trainingsVisited, 0)).toBeGreaterThan(0);
  });

  it("blockiert den Abschluss, wenn ein gesperrter Probetrainingsteilnehmer anwesend ist", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    const blockedEntries = [
      {
        displayName: "Noah Beispiel-Probe",
        reason: "Vier kostenlose Probetrainings wurden bereits genutzt.",
      },
    ];
    const result = canCompleteSession(session, attendance, 0, blockedEntries);
    expect(result.allowed).toBe(false);
    expect(result.messages.join(" ")).toMatch(/Probetraining gesperrt/);
  });

  it("erlaubt Abschluss, wenn keine gesperrten Probetrainingsteilnehmer anwesend sind", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    const result = canCompleteSession(session, attendance, 0, []);
    expect(result.allowed).toBe(true);
  });

  it("Demo-Probetrainingsteilnehmer sind 6 fiktive Profile", () => {
    expect(trialParticipants).toHaveLength(6);
    expect(trialParticipants.every((p) => p.id.startsWith("trial-"))).toBe(true);
    expect(
      trialParticipants.every(
        (p) => p.lastName.includes("Probetraining") || p.lastName.includes("Probe"),
      ),
    ).toBe(true);
  });

  it("trial-006 hat Vorstandsausnahme genutzt und ist gesperrt", () => {
    const noah = trialParticipants.find((p) => p.id === "trial-006")!;
    expect(noah).toBeDefined();
    expect(noah.overrideStatus).toBe(TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED);
    expect(noah.overrideUsed).toBe(true);
    expect(noah.contractStatus).toBe(ContractStatus.NOT_ISSUED);
    expect(noah.membershipStatus).toBe(PersonMembershipStatus.TRIAL);
  });

  it("trial-005 wurde zum Mitglied umgewandelt (Paket 1.3 Demo)", () => {
    const mia = trialParticipants.find((p) => p.id === "trial-005")!;
    expect(mia).toBeDefined();
    expect(mia.membershipStatus).toBe(PersonMembershipStatus.ACTIVE_MEMBER);
    expect(mia.contractStatus).toBe(ContractStatus.MEMBERSHIP_ACTIVATED);
    expect(mia.memberId).toBe("member-41");
  });
});

// ---------------------------------------------------------------------------
// Paket 1.3 – Konvertierungs- und Direktanlagetests
// ---------------------------------------------------------------------------

describe("Paket-1.3-Konvertierung", () => {
  const trialBase = {
    id: "trial-003",
    firstName: "Sara",
    lastName: "Probetraining",
    displayName: "Probetraining, Sara",
    gender: "WEIBLICH" as const,
    birthDate: "1998-11-08",
    createdAt: "2026-04-01T11:00:00.000Z",
    firstTrialDate: "2026-04-05",
    lastTrialDate: "2026-04-19",
    contractStatus: ContractStatus.RECEIVED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    active: true,
  };

  it("checkConversionEligibility erlaubt RECEIVED-Vertrag", () => {
    const result = checkConversionEligibility(trialBase);
    expect(result.eligible).toBe(true);
  });

  it("checkConversionEligibility blockiert bei NOT_ISSUED", () => {
    const result = checkConversionEligibility({
      ...trialBase,
      contractStatus: ContractStatus.NOT_ISSUED,
    });
    expect(result.eligible).toBe(false);
  });

  it("convertTrialParticipantToMember erzeugt korrektes Ergebnis", () => {
    const result = convertTrialParticipantToMember({
      participant: trialBase,
      memberNumber: "M-1099",
      qualification: MemberQualification.NONE,
      convertedBy: "Vorstand Demo",
      convertedAt: "2026-06-21T10:00:00.000Z",
    });
    expect(result.updatedParticipant.membershipStatus).toBe(PersonMembershipStatus.ACTIVE_MEMBER);
    expect(result.updatedParticipant.memberId).toBe(trialBase.id);
    expect(result.auditEntry.action).toBe("TRIAL_CONVERTED_TO_MEMBER");
  });

  it("grantBoardOverride erzeugt Audit-Eintrag mit Begruendung", () => {
    const participant = trialParticipants.find((p) => p.id === "trial-004")!;
    const result = grantBoardOverride({
      participant,
      grantedBy: "Vorstand Demo",
      grantedAt: "2026-06-21T12:00:00.000Z",
      reason: "Ausnahme fuer Demo-Test",
    });
    expect(result.updatedParticipant.overrideStatus).toBe(
      TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
    );
    expect(result.auditEntry.reason).toBe("Ausnahme fuer Demo-Test");
  });

  it("createDirectMember erzeugt aktives Mitglied ohne Probetraining", () => {
    const result = createDirectMember({
      id: "member-099",
      firstName: "Klaus",
      lastName: "Direktmitglied",
      gender: "MAENNLICH",
      birthDate: "1985-03-10",
      memberNumber: "M-1099",
      createdBy: "Vorstand Demo",
      createdAt: "2026-06-21T11:00:00.000Z",
    });
    expect(result.membershipStatus).toBe(PersonMembershipStatus.ACTIVE_MEMBER);
    expect(result.active).toBe(true);
    expect(result.auditEntry.action).toBe("DIRECT_MEMBER_CREATED");
  });

  it("demoAuditEntries enthalten drei fiktive Eintraege", () => {
    expect(demoAuditEntries).toHaveLength(3);
    const actions = demoAuditEntries.map((e) => e.action);
    expect(actions).toContain("TRIAL_CONVERTED_TO_MEMBER");
    expect(actions).toContain("BOARD_OVERRIDE_GRANTED");
    expect(actions).toContain("DIRECT_MEMBER_CREATED");
  });
});

// ---------------------------------------------------------------------------
// Paket 1.4 – Gürtelverwaltung
// ---------------------------------------------------------------------------

describe("Paket-1.4-Guertelverwaltung", () => {
  it("beltHistory enthaelt drei fiktive Eintraege", () => {
    expect(beltHistory).toHaveLength(3);
    expect(beltHistory.every((e) => e.id.startsWith("belt-"))).toBe(true);
  });

  it("beltHistoryExtended enthaelt drei weitere fiktive Eintraege", () => {
    expect(beltHistoryExtended).toHaveLength(3);
    expect(beltHistoryExtended[0]!.personId).toBe("member-03");
    expect(beltHistoryExtended[2]!.source).toBe(BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED);
  });

  it("validateBeltChange akzeptiert ORANGE → GRUEN mit Datum", () => {
    const result = validateBeltChange({
      personId: "member-01",
      previousBeltColor: "ORANGE",
      previousBeltGrade: "7. Kyu",
      newBeltColor: "GRUEN",
      newBeltGrade: "6. Kyu",
      effectiveFrom: "2026-06-21",
      recordedBy: "Trainer Demo",
      recordedAt: "2026-06-21T19:00:00.000Z",
      source: BeltChangeSource.MANUAL_CONFIRMED,
    });
    expect(result.valid).toBe(true);
  });

  it("createBeltHistoryEntry liefert unveraenderte Felder", () => {
    const entry = createBeltHistoryEntry("belt-test-01", {
      personId: "member-05",
      previousBeltColor: "ORANGE",
      previousBeltGrade: "8. Kyu",
      newBeltColor: "GRUEN",
      newBeltGrade: "7. Kyu",
      effectiveFrom: "2026-06-21",
      recordedBy: "Trainer Demo",
      recordedAt: "2026-06-21T19:00:00.000Z",
      source: BeltChangeSource.MANUAL_CONFIRMED,
    });
    expect(entry.id).toBe("belt-test-01");
    expect(entry.newBeltColor).toBe("GRUEN");
    expect(entry.personId).toBe("member-05");
  });

  it("suggestNextBelt gibt WEISS_ROT nach WEISS zurueck", () => {
    const hint = suggestNextBelt("WEISS", "10. Kyu");
    expect(hint.nextLevel?.color).toBe("WEISS_ROT");
    expect(hint.isHighest).toBe(false);
  });

  it("suggestNextBelt markiert 9. Dan als hoechsten Grad", () => {
    const hint = suggestNextBelt("SCHWARZ", "9. Dan");
    expect(hint.isHighest).toBe(true);
    expect(hint.nextLevel).toBeNull();
  });

  it("calculateBeltDistribution liefert dreizehn Eintraege", () => {
    const dist = calculateBeltDistribution(members.filter((m) => m.active).map((m) => m.beltColor));
    expect(dist).toHaveLength(13);
    const total = dist.reduce((sum, e) => sum + e.count, 0);
    expect(total).toBe(members.filter((m) => m.active).length);
  });

  it("openBeltSuggestions filtert korrekt auf OPEN", () => {
    const open = openBeltSuggestions(initialBeltSuggestions);
    expect(open).toHaveLength(2);
    expect(open.every((s) => s.status === BeltSuggestionStatus.OPEN)).toBe(true);
  });

  it("initialBeltSuggestions enthalten 2 offene und 2 geschlossene Vorschlaege", () => {
    const closed = initialBeltSuggestions.filter((s) => s.status !== BeltSuggestionStatus.OPEN);
    expect(initialBeltSuggestions).toHaveLength(4);
    expect(closed).toHaveLength(2);
  });
});
