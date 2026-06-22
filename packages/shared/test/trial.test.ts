import { describe, expect, it } from "vitest";

import {
  ContractStatus,
  PersonMembershipStatus,
  PresenceStatus,
  TrainingSessionStatus,
  TrialOverrideStatus,
  type TrialParticipant,
} from "../src/index.js";
import {
  MAX_FREE_TRIAL_SESSIONS,
  canTransitionContract,
  checkTrialEligibility,
  countTrialSessionsAttended,
  createTrialParticipantIdGenerator,
  remainingFreeTrialSessions,
  transitionContract,
  useTrialOverride,
} from "../src/trial.js";

// ---------------------------------------------------------------------------
// Hilfsfunktion: TrialSessionRecord erstellen
// ---------------------------------------------------------------------------

function trialRecord(
  sessionId: string,
  overrides: {
    presenceStatus?: string;
    sessionStatus?: string;
    membershipStatusAtTime?: string;
  } = {},
) {
  return {
    sessionId,
    sessionDate: "2026-01-10",
    participantId: "trial-001",
    presenceStatus: overrides.presenceStatus ?? PresenceStatus.PRESENT,
    sessionStatus: overrides.sessionStatus ?? TrainingSessionStatus.COMPLETED,
    membershipStatusAtTime:
      overrides.membershipStatusAtTime ?? PersonMembershipStatus.TRIAL,
  };
}

function baseParticipant(
  overrides: Partial<TrialParticipant> = {},
): TrialParticipant {
  return {
    id: "trial-001",
    firstName: "Lina",
    lastName: "Probetraining",
    displayName: "Lina Probetraining",
    ageGroup: "JUGEND",
    birthYear: 2012,
    createdAt: "2026-01-01T10:00:00.000Z",
    firstTrialDate: null,
    lastTrialDate: null,
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Probetraining zaehlen
// ---------------------------------------------------------------------------

describe("countTrialSessionsAttended", () => {
  it("zaehlt 0 bei leerer Liste", () => {
    expect(countTrialSessionsAttended([])).toBe(0);
  });

  it("zaehlt eine besuchte COMPLETED-Einheit korrekt", () => {
    expect(countTrialSessionsAttended([trialRecord("s1")])).toBe(1);
  });

  it("zaehlt nur PRESENT-Datensaetze", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1", { presenceStatus: PresenceStatus.ABSENT }),
      ]),
    ).toBe(0);
  });

  it("zaehlt nur COMPLETED-Einheiten", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1", { sessionStatus: TrainingSessionStatus.PLANNED }),
        trialRecord("s2", { sessionStatus: TrainingSessionStatus.IN_PROGRESS }),
        trialRecord("s3", { sessionStatus: TrainingSessionStatus.ABORTED }),
        trialRecord("s4", { sessionStatus: TrainingSessionStatus.CANCELLED }),
      ]),
    ).toBe(0);
  });

  it("zaehlt nur TRIAL-Mitgliedschaftsstatus", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1", {
          membershipStatusAtTime: PersonMembershipStatus.ACTIVE_MEMBER,
        }),
      ]),
    ).toBe(0);
  });

  it("zaehlt doppelte sessionId nur einmal", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1"),
        trialRecord("s1"), // Duplikat
      ]),
    ).toBe(1);
  });

  it("zaehlt vier verschiedene Einheiten korrekt", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1"),
        trialRecord("s2"),
        trialRecord("s3"),
        trialRecord("s4"),
      ]),
    ).toBe(4);
  });

  it("ignoriert Mitgliedsteilnahmen nach Umwandlung", () => {
    expect(
      countTrialSessionsAttended([
        trialRecord("s1"), // als TRIAL
        trialRecord("s2", {
          membershipStatusAtTime: PersonMembershipStatus.ACTIVE_MEMBER,
        }), // nach Umwandlung
      ]),
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Verbleibende kostenlose Einheiten
// ---------------------------------------------------------------------------

describe("remainingFreeTrialSessions", () => {
  it("gibt 4 bei 0 Besuchen zurueck", () => {
    expect(remainingFreeTrialSessions(0)).toBe(4);
  });

  it("gibt 1 bei 3 Besuchen zurueck", () => {
    expect(remainingFreeTrialSessions(3)).toBe(1);
  });

  it("gibt 0 bei 4 oder mehr Besuchen zurueck", () => {
    expect(remainingFreeTrialSessions(4)).toBe(0);
    expect(remainingFreeTrialSessions(5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Teilnahme-Berechtigung
// ---------------------------------------------------------------------------

describe("checkTrialEligibility", () => {
  it("erlaubt Teilnahme bei 0 von 4", () => {
    const result = checkTrialEligibility({
      attendedCount: 0,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.showContractWarning).toBe(false);
    expect(result.showPrepareWarning).toBe(false);
  });

  it("zeigt Vorbereitungshinweis bei 2 von 4 (drittes Probetraining)", () => {
    const result = checkTrialEligibility({
      attendedCount: 2,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.showPrepareWarning).toBe(true);
    expect(result.showContractWarning).toBe(false);
  });

  it("zeigt Vertragshinweis bei 3 von 4 (viertes Probetraining)", () => {
    const result = checkTrialEligibility({
      attendedCount: 3,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.showContractWarning).toBe(true);
  });

  it("blockiert fuenfte Teilnahme ohne Vertrag und ohne Ausnahme", () => {
    const result = checkTrialEligibility({
      attendedCount: 4,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Vier kostenlose Probetrainings");
  });

  it("erlaubt fuenfte Teilnahme mit eingegangenen Vertrag (RECEIVED)", () => {
    const result = checkTrialEligibility({
      attendedCount: 4,
      contractStatus: ContractStatus.RECEIVED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
  });

  it("erlaubt Teilnahme wenn Person bereits aktives Mitglied ist", () => {
    const result = checkTrialEligibility({
      attendedCount: 4,
      contractStatus: ContractStatus.MEMBERSHIP_ACTIVATED,
      membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER,
      overrideStatus: TrialOverrideStatus.NONE,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
  });

  it("erlaubt genau eine Einheit mit ungenutzter Vorstandsausnahme", () => {
    const result = checkTrialEligibility({
      attendedCount: 4,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
      overrideUsed: false,
    });
    expect(result.allowed).toBe(true);
  });

  it("blockiert erneut nach genutzter Vorstandsausnahme", () => {
    const result = checkTrialEligibility({
      attendedCount: 4,
      contractStatus: ContractStatus.NOT_ISSUED,
      membershipStatus: PersonMembershipStatus.TRIAL,
      overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
      overrideUsed: true,
    });
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Vorstandsausnahme verwenden
// ---------------------------------------------------------------------------

describe("useTrialOverride", () => {
  it("markiert die Ausnahme als genutzt", () => {
    const participant = baseParticipant({
      overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
      overrideUsed: false,
    });
    const updated = useTrialOverride(participant);
    expect(updated.overrideUsed).toBe(true);
  });

  it("wirft bei fehlender Ausnahme", () => {
    const participant = baseParticipant({ overrideStatus: TrialOverrideStatus.NONE });
    expect(() => useTrialOverride(participant)).toThrow();
  });

  it("wirft bei bereits genutzter Ausnahme", () => {
    const participant = baseParticipant({
      overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
      overrideUsed: true,
    });
    expect(() => useTrialOverride(participant)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Vertragsstatus-Uebergaenge
// ---------------------------------------------------------------------------

describe("canTransitionContract / transitionContract", () => {
  it("erlaubt NOT_ISSUED → ISSUED", () => {
    expect(
      canTransitionContract(ContractStatus.NOT_ISSUED, ContractStatus.ISSUED),
    ).toBe(true);
  });

  it("erlaubt ISSUED → RECEIVED", () => {
    expect(
      canTransitionContract(ContractStatus.ISSUED, ContractStatus.RECEIVED),
    ).toBe(true);
  });

  it("erlaubt RECEIVED → MEMBERSHIP_ACTIVATED", () => {
    expect(
      canTransitionContract(
        ContractStatus.RECEIVED,
        ContractStatus.MEMBERSHIP_ACTIVATED,
      ),
    ).toBe(true);
  });

  it("erlaubt ISSUED → NOT_ISSUED (Rueckgabe)", () => {
    expect(
      canTransitionContract(ContractStatus.ISSUED, ContractStatus.NOT_ISSUED),
    ).toBe(true);
  });

  it("verbietet NOT_ISSUED direkt zu MEMBERSHIP_ACTIVATED", () => {
    expect(
      canTransitionContract(
        ContractStatus.NOT_ISSUED,
        ContractStatus.MEMBERSHIP_ACTIVATED,
      ),
    ).toBe(false);
  });

  it("verbietet MEMBERSHIP_ACTIVATED → NOT_ISSUED", () => {
    expect(
      canTransitionContract(
        ContractStatus.MEMBERSHIP_ACTIVATED,
        ContractStatus.NOT_ISSUED,
      ),
    ).toBe(false);
  });

  it("verbietet NOT_ISSUED direkt zu RECEIVED", () => {
    expect(
      canTransitionContract(ContractStatus.NOT_ISSUED, ContractStatus.RECEIVED),
    ).toBe(false);
  });

  it("transitionContract wirft bei unzulaessigem Uebergang", () => {
    expect(() =>
      transitionContract(
        ContractStatus.NOT_ISSUED,
        ContractStatus.MEMBERSHIP_ACTIVATED,
      ),
    ).toThrow("nicht zulaessig");
  });

  it("transitionContract gibt den neuen Status zurueck bei erlaubtem Uebergang", () => {
    expect(
      transitionContract(ContractStatus.NOT_ISSUED, ContractStatus.ISSUED),
    ).toBe(ContractStatus.ISSUED);
  });
});

// ---------------------------------------------------------------------------
// MAX_FREE_TRIAL_SESSIONS
// ---------------------------------------------------------------------------

describe("MAX_FREE_TRIAL_SESSIONS", () => {
  it("ist 4", () => {
    expect(MAX_FREE_TRIAL_SESSIONS).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// ID-Generator
// ---------------------------------------------------------------------------

describe("createTrialParticipantIdGenerator", () => {
  it("erzeugt eindeutige IDs ab trial-001", () => {
    const nextId = createTrialParticipantIdGenerator([]);
    expect(nextId()).toBe("trial-001");
    expect(nextId()).toBe("trial-002");
    expect(nextId()).toBe("trial-003");
  });

  it("umgeht bestehende IDs kollisionsfrei", () => {
    const nextId = createTrialParticipantIdGenerator(["trial-001", "trial-002"]);
    expect(nextId()).toBe("trial-003");
  });
});
