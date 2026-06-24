import { describe, expect, it } from "vitest";

import {
  ContractStatus,
  MemberQualification,
  PersonMembershipStatus,
  TrialOverrideStatus,
  type TrialParticipant,
} from "../src/index.js";
import {
  checkConversionEligibility,
  convertTrialParticipantToMember,
  createDirectMember,
  grantBoardOverride,
} from "../src/conversion.js";

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------

function baseParticipant(overrides: Partial<TrialParticipant> = {}): TrialParticipant {
  return {
    id: "trial-001",
    firstName: "Mia",
    lastName: "Probetraining",
    displayName: "Probetraining, Mia",
    gender: "WEIBLICH",
    birthDate: "2000-06-15",
    createdAt: "2026-01-01T10:00:00.000Z",
    firstTrialDate: "2026-01-10",
    lastTrialDate: "2026-02-14",
    contractStatus: ContractStatus.RECEIVED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkConversionEligibility
// ---------------------------------------------------------------------------

describe("checkConversionEligibility", () => {
  it("erlaubt Umwandlung bei RECEIVED-Vertrag", () => {
    const result = checkConversionEligibility(baseParticipant());
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("erlaubt Umwandlung bei MEMBERSHIP_ACTIVATED-Vertrag", () => {
    const result = checkConversionEligibility(
      baseParticipant({ contractStatus: ContractStatus.MEMBERSHIP_ACTIVATED }),
    );
    expect(result.eligible).toBe(true);
  });

  it("blockiert Umwandlung bei NOT_ISSUED-Vertrag", () => {
    const result = checkConversionEligibility(
      baseParticipant({ contractStatus: ContractStatus.NOT_ISSUED }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("RECEIVED");
  });

  it("blockiert Umwandlung bei ISSUED-Vertrag", () => {
    const result = checkConversionEligibility(
      baseParticipant({ contractStatus: ContractStatus.ISSUED }),
    );
    expect(result.eligible).toBe(false);
  });

  it("blockiert Umwandlung wenn bereits Mitglied", () => {
    const result = checkConversionEligibility(
      baseParticipant({ membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("aktives Mitglied");
  });

  it("blockiert Doppelkonvertierung (memberId bereits gesetzt)", () => {
    const result = checkConversionEligibility(baseParticipant({ memberId: "member-99" }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("memberId");
  });

  it("blockiert Umwandlung bei inaktivem Profil", () => {
    const result = checkConversionEligibility(baseParticipant({ active: false }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Inaktive");
  });
});

// ---------------------------------------------------------------------------
// convertTrialParticipantToMember
// ---------------------------------------------------------------------------

describe("convertTrialParticipantToMember", () => {
  const input = {
    participant: baseParticipant(),
    memberNumber: "M-1042",
    existingMemberNumbers: [] as string[],
    qualification: MemberQualification.NONE,
    convertedBy: "Vorstand Demo",
    convertedAt: "2026-06-21T10:00:00.000Z",
  };

  it("setzt membershipStatus auf ACTIVE_MEMBER", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.updatedParticipant.membershipStatus).toBe(PersonMembershipStatus.ACTIVE_MEMBER);
  });

  it("setzt contractStatus auf MEMBERSHIP_ACTIVATED", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.updatedParticipant.contractStatus).toBe(ContractStatus.MEMBERSHIP_ACTIVATED);
  });

  it("speichert den tatsächlichen Umwandlungszeitpunkt", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.updatedParticipant.convertedAt).toBe(input.convertedAt);
  });

  it("lehnt eine bereits vergebene Mitgliedsnummer ab", () => {
    expect(() =>
      convertTrialParticipantToMember({
        ...input,
        existingMemberNumbers: [input.memberNumber],
      }),
    ).toThrow("bereits vergeben");
  });

  it("behält die Personen-ID als Mitglieds-ID", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.updatedParticipant.memberId).toBe("trial-001");
  });

  it("gibt die korrekte memberNumber zurueck", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.memberNumber).toBe("M-1042");
  });

  it("erzeugt einen AuditEntry mit korrekten Felder", () => {
    const result = convertTrialParticipantToMember(input);
    expect(result.auditEntry.action).toBe("TRIAL_CONVERTED_TO_MEMBER");
    expect(result.auditEntry.actor).toBe("Vorstand Demo");
    expect(result.auditEntry.object).toContain("trial-001");
    expect(result.auditEntry.previousValue).toBe(PersonMembershipStatus.TRIAL);
    expect(result.auditEntry.newValue).toContain("trial-001");
    expect(result.auditEntry.newValue).toContain("M-1042");
  });

  it("haengt eine optionale Notiz an bestehende Notiz an", () => {
    const withNote = convertTrialParticipantToMember({
      ...input,
      participant: baseParticipant({ note: "Bestehende Notiz" }),
      note: "Umwandlungshinweis",
    });
    expect(withNote.updatedParticipant.note).toContain("Bestehende Notiz");
    expect(withNote.updatedParticipant.note).toContain("Umwandlungshinweis");
  });

  it("wirft bei nicht erfuellter Vorbedingung", () => {
    expect(() =>
      convertTrialParticipantToMember({
        ...input,
        participant: baseParticipant({ contractStatus: ContractStatus.NOT_ISSUED }),
      }),
    ).toThrow("Umwandlung nicht moeglich");
  });

  it("veraendert das Original-Objekt nicht (Immutabilitaet)", () => {
    const original = baseParticipant();
    const frozenCopy = { ...original };
    convertTrialParticipantToMember({ ...input, participant: original });
    expect(original.membershipStatus).toBe(frozenCopy.membershipStatus);
    expect(original.memberId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createDirectMember
// ---------------------------------------------------------------------------

describe("createDirectMember", () => {
  const input = {
    id: "member-050",
    firstName: "Klaus",
    lastName: "Direktmitglied",
    gender: "MAENNLICH" as const,
    birthDate: "1985-03-10",
    memberNumber: "M-1050",
    existingPersonIds: [] as string[],
    existingMemberNumbers: [] as string[],
    existingPersons: [] as Array<{
      id: string;
      firstName: string;
      lastName: string;
      birthDate: string;
    }>,
    createdBy: "Vorstand Demo",
    createdAt: "2026-06-21T11:00:00.000Z",
  };

  it("erstellt ein aktives Mitglied mit korrekten Feldern", () => {
    const result = createDirectMember(input);
    expect(result.memberId).toBe("member-050");
    expect(result.memberNumber).toBe("M-1050");
    expect(result.displayName).toBe("Direktmitglied, Klaus");
    expect(result.active).toBe(true);
    expect(result.membershipStatus).toBe(PersonMembershipStatus.ACTIVE_MEMBER);
  });

  it("setzt Standardguerteel WEISS / 10. Kyu wenn nicht angegeben", () => {
    const result = createDirectMember(input);
    expect(result.beltColor).toBe("WEISS");
    expect(result.beltGrade).toBe("10. Kyu");
  });

  it("uebernimmt angegebene Guertelfarbe und -grad", () => {
    const result = createDirectMember({
      ...input,
      beltColor: "BLAU",
      beltGrade: "6. Kyu",
    });
    expect(result.beltColor).toBe("BLAU");
    expect(result.beltGrade).toBe("6. Kyu");
  });

  it("setzt Standard-Qualifikation NONE wenn nicht angegeben", () => {
    const result = createDirectMember(input);
    expect(result.qualification).toBe(MemberQualification.NONE);
  });

  it("erzeugt einen AuditEntry mit DIRECT_MEMBER_CREATED", () => {
    const result = createDirectMember(input);
    expect(result.auditEntry.action).toBe("DIRECT_MEMBER_CREATED");
    expect(result.auditEntry.actor).toBe("Vorstand Demo");
    expect(result.auditEntry.newValue).toContain("M-1050");
  });

  it("übernimmt Geburtsdatum und Telefonnummer verlustfrei", () => {
    const result = createDirectMember({ ...input, contactPhone: "030-555-0199" });
    expect(result.birthDate).toBe("1985-03-10");
    expect(result.contactPhone).toBe("030-555-0199");
  });

  it("lehnt doppelte Personen-ID und Mitgliedsnummer an der Fachgrenze ab", () => {
    expect(() => createDirectMember({ ...input, existingPersonIds: [input.id] })).toThrow(
      "Personen-ID",
    );
    expect(() =>
      createDirectMember({ ...input, existingMemberNumbers: [input.memberNumber] }),
    ).toThrow("Mitgliedsnummer");
  });

  it("prüft Dubletten gegen Probetraining- und Mitgliederprofile", () => {
    expect(() =>
      createDirectMember({
        ...input,
        existingPersons: [
          {
            id: "trial-existing",
            firstName: "Klaus",
            lastName: "Direktmitglied",
            birthDate: "1985-11-30",
          },
        ],
      }),
    ).toThrow("existiert bereits");
  });

  it("wirft bei leerem Vornamen", () => {
    expect(() => createDirectMember({ ...input, firstName: "  " })).toThrow("Vorname");
  });

  it("wirft bei leerem Nachnamen", () => {
    expect(() => createDirectMember({ ...input, lastName: "" })).toThrow("Nachname");
  });

  it("wirft bei fehlender Mitgliedsnummer", () => {
    expect(() => createDirectMember({ ...input, memberNumber: "" })).toThrow("Mitgliedsnummer");
  });
});

// ---------------------------------------------------------------------------
// grantBoardOverride
// ---------------------------------------------------------------------------

describe("grantBoardOverride", () => {
  const base = baseParticipant({
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
  });

  it("setzt overrideStatus auf ONE_ADDITIONAL_SESSION_APPROVED", () => {
    const result = grantBoardOverride({
      participant: base,
      attendedTrialCount: 4,
      grantedBy: "Vorstand Demo",
      grantedAt: "2026-06-21T12:00:00.000Z",
      reason: "Terminkonflikt beim Vertragseingang",
    });
    expect(result.updatedParticipant.overrideStatus).toBe(
      TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
    );
    expect(result.updatedParticipant.overrideGrantedBy).toBe("Vorstand Demo");
    expect(result.updatedParticipant.overrideReason).toBe("Terminkonflikt beim Vertragseingang");
    expect(result.updatedParticipant.overrideUsed).toBe(false);
  });

  it("erzeugt einen AuditEntry mit BOARD_OVERRIDE_GRANTED", () => {
    const result = grantBoardOverride({
      participant: base,
      attendedTrialCount: 4,
      grantedBy: "Vorstand Demo",
      grantedAt: "2026-06-21T12:00:00.000Z",
      reason: "Ausnahme begruendet",
    });
    expect(result.auditEntry.action).toBe("BOARD_OVERRIDE_GRANTED");
    expect(result.auditEntry.reason).toBe("Ausnahme begruendet");
  });

  it("wirft bei leerer Begruendung", () => {
    expect(() =>
      grantBoardOverride({
        participant: base,
        attendedTrialCount: 4,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "  ",
      }),
    ).toThrow("Begruendung");
  });

  it("wirft wenn bereits eine Ausnahme erteilt wurde", () => {
    const alreadyGranted = baseParticipant({
      overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
    });
    expect(() =>
      grantBoardOverride({
        participant: alreadyGranted,
        attendedTrialCount: 4,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "Zweite Ausnahme",
      }),
    ).toThrow("bereits erteilt");
  });

  it("wirft wenn Person kein TRIAL-Status hat", () => {
    const member = baseParticipant({
      membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER,
    });
    expect(() =>
      grantBoardOverride({
        participant: member,
        attendedTrialCount: 4,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "Versuch",
      }),
    ).toThrow("Probetrainingsteilnehmer");
  });

  it("veraendert das Original-Objekt nicht (Immutabilitaet)", () => {
    const original = { ...base };
    grantBoardOverride({
      participant: base,
      attendedTrialCount: 4,
      grantedBy: "Vorstand Demo",
      grantedAt: "2026-06-21T12:00:00.000Z",
      reason: "Begruendung",
    });
    expect(base.overrideStatus).toBe(original.overrideStatus);
  });

  it.each([0, 1, 2, 3, 5])("lehnt die Ausnahme bei %s bisherigen Besuchen ab", (count) => {
    expect(() =>
      grantBoardOverride({
        participant: base,
        attendedTrialCount: count,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "Falscher Zeitpunkt",
      }),
    ).toThrow("genau vier");
  });

  it("lehnt die Ausnahme für ein inaktives Probetrainingprofil ab", () => {
    expect(() =>
      grantBoardOverride({
        participant: { ...base, active: false },
        attendedTrialCount: 4,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "Inaktiv",
      }),
    ).toThrow("aktives Probetrainingprofil");
  });

  it("lehnt die Ausnahme ab, wenn ein eingegangener Vertrag die Teilnahme bereits erlaubt", () => {
    expect(() =>
      grantBoardOverride({
        participant: { ...base, contractStatus: ContractStatus.RECEIVED },
        attendedTrialCount: 4,
        grantedBy: "Vorstand Demo",
        grantedAt: "2026-06-21T12:00:00.000Z",
        reason: "Nicht erforderlich",
      }),
    ).toThrow("keine Vorstandsausnahme nötig");
  });
});
