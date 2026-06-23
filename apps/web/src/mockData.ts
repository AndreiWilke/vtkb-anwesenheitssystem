import {
  BeltChangeSource,
  BeltSuggestionStatus,
  ContractStatus,
  MemberQualification,
  PersonMembershipStatus,
  TrialOverrideStatus,
} from "@vtkb/shared";

import type {
  Gender,
  AuditEntry,
  BeltColor,
  BeltHistoryEntry,
  BeltSuggestion,
  Member,
  PhotoProposal,
  TrainingSessionMock,
  TrialParticipant,
} from "./types";
import { createClubDateAtTime } from "./time";

const fictionalFirstNames = [
  "Aiko",
  "Ren",
  "Hana",
  "Kaito",
  "Emi",
  "Noa",
  "Sora",
  "Yuki",
  "Mika",
  "Riku",
  "Nami",
  "Kenzo",
  "Momo",
  "Taro",
  "Yuna",
  "Hiro",
  "Kimi",
  "Jona",
  "Lumi",
  "Maro",
  "Nika",
  "Oki",
  "Pia",
  "Quin",
  "Rina",
  "Sami",
  "Tina",
  "Umi",
  "Vito",
  "Wina",
  "Xeno",
  "Yori",
  "Zora",
  "Ami",
  "Beni",
  "Caro",
  "Dani",
  "Eli",
  "Fumi",
  "Gino",
] as const;

const belts: ReadonlyArray<{ color: BeltColor; grade: string }> = [
  { color: "WEISS", grade: "10. Kyu" },
  { color: "WEISS_ROT", grade: "9. Kyu" },
  { color: "WEISS_GELB", grade: "9a. Kyu" },
  { color: "GELB", grade: "8. Kyu" },
  { color: "GELB_ORANGE", grade: "8a. Kyu" },
  { color: "ORANGE", grade: "7. Kyu" },
  { color: "ORANGE_GRUEN", grade: "7a. Kyu" },
  { color: "GRUEN", grade: "6. Kyu" },
  { color: "GRUEN_BLAU", grade: "6a. Kyu" },
  { color: "BLAU", grade: "5. Kyu" },
  { color: "VIOLETT", grade: "4. Kyu" },
  { color: "BRAUN", grade: "3. Kyu" },
  { color: "SCHWARZ", grade: "9. Dan" },
];

function genderForIndex(index: number): Gender {
  return index % 2 === 0 ? "WEIBLICH" : "MAENNLICH";
}

function qualificationForIndex(index: number): MemberQualification {
  if (index < 4) return MemberQualification.TRAINER;
  if (index < 8) return MemberQualification.ASSISTANT_TRAINER;
  return MemberQualification.NONE;
}

export const members: Member[] = fictionalFirstNames.map((firstName, index) => {
  const belt = belts[index % belts.length] ?? belts[0];
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `member-${number}`,
    name: `${firstName} Beispiel`,
    initials: `${firstName[0] ?? "M"}B`,
    gender: genderForIndex(index),
    beltColor: belt?.color ?? "WEISS",
    beltGrade: belt?.grade ?? "10. Kyu",
    qualification: qualificationForIndex(index),
    active: index !== 39,
    trainingsVisited: 8 + ((index * 7) % 39),
    responsibleAssignments: index < 4 ? 2 + index * 3 : 0,
    assistantAssignments: index < 8 ? 1 + ((index * 2) % 11) : 0,
  };
});

export function createTodaySessions(now = new Date()): TrainingSessionMock[] {
  return [
    {
      id: "session-early",
      name: "Grundlagentraining",
      dojo: "Dojo Nord",
      startsAt: createClubDateAtTime(now, 16, 0),
      endsAt: createClubDateAtTime(now, 17, 30),
      responsibleTrainerId: "member-02",
      assistantTrainerIds: ["member-05"],
    },
    {
      id: "session-main",
      name: "Donnerstagstraining",
      dojo: "Dojo VTKB Berlin",
      startsAt: createClubDateAtTime(now, 17, 30),
      endsAt: createClubDateAtTime(now, 19, 0),
      responsibleTrainerId: "member-01",
      assistantTrainerIds: ["member-05", "member-06"],
    },
    {
      id: "session-following",
      name: "Fortgeschrittenentraining",
      dojo: "Dojo VTKB Berlin",
      startsAt: createClubDateAtTime(now, 19, 0),
      endsAt: createClubDateAtTime(now, 20, 30),
      responsibleTrainerId: "member-03",
      assistantTrainerIds: ["member-07"],
    },
  ];
}

export const completedSessionHistory = [
  { id: "history-1", label: "Dienstag · Grundlagentraining", count: 31 },
  { id: "history-2", label: "Samstag · Freies Training", count: 24 },
  { id: "history-3", label: "Donnerstag · Fortgeschrittene", count: 28 },
] as const;

// ---------------------------------------------------------------------------
// Paket 1.2 – Probetrainingsteilnehmer (ausschliesslich fiktive Daten)
// ---------------------------------------------------------------------------

/**
 * Sechs fiktive Probetrainingsteilnehmer mit unterschiedlichen Probetrainingstaenden.
 * Alle Namen, Geburtsjahre, Kontaktdaten und Mitgliedsnummern sind eindeutig fiktiv.
 * Gekennzeichnet durch Nachnamen "Probetraining" oder "Beispiel-Probe".
 */
export const trialParticipants: TrialParticipant[] = [
  // 0 von 4 – gerade angelegt
  {
    id: "trial-001",
    firstName: "Lina",
    lastName: "Probetraining",
    displayName: "Lina Probetraining",
    gender: "WEIBLICH",
    birthDate: "2012-05-15",
    contactName: "Elternkontakt Beispiel",
    contactPhone: "030-555-0101",
    contactEmail: "trial01@example.invalid",
    createdAt: "2026-06-10T09:00:00.000Z",
    firstTrialDate: null,
    lastTrialDate: null,
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
  },
  // 1 von 4
  {
    id: "trial-002",
    firstName: "Tom",
    lastName: "Probetraining",
    displayName: "Tom Probetraining",
    gender: "MAENNLICH",
    birthDate: "2016-03-22",
    contactName: "Elternkontakt Beispiel",
    contactPhone: "030-555-0102",
    contactEmail: "trial02@example.invalid",
    createdAt: "2026-05-15T10:00:00.000Z",
    firstTrialDate: "2026-05-20",
    lastTrialDate: "2026-05-20",
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
  },
  // 2 von 4
  {
    id: "trial-003",
    firstName: "Sara",
    lastName: "Probetraining",
    displayName: "Sara Probetraining",
    gender: "WEIBLICH",
    birthDate: "1998-11-08",
    contactEmail: "trial03@example.invalid",
    createdAt: "2026-04-01T11:00:00.000Z",
    firstTrialDate: "2026-04-05",
    lastTrialDate: "2026-04-19",
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
  },
  // 3 von 4 – Vertragshinweis anzeigen
  {
    id: "trial-004",
    firstName: "Ben",
    lastName: "Probetraining",
    displayName: "Ben Probetraining",
    gender: "MAENNLICH",
    birthDate: "2010-07-19",
    contactName: "Elternkontakt Beispiel",
    contactPhone: "030-555-0104",
    createdAt: "2026-03-10T09:30:00.000Z",
    firstTrialDate: "2026-03-12",
    lastTrialDate: "2026-04-02",
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
  },
  // 4 von 4 – Vertrag eingegangen, umgewandelt zum Mitglied (Demo Paket 1.3)
  {
    id: "trial-005",
    firstName: "Mia",
    lastName: "Probetraining",
    displayName: "Mia Probetraining",
    gender: "WEIBLICH",
    birthDate: "2000-06-15",
    contactEmail: "trial05@example.invalid",
    createdAt: "2026-02-01T08:00:00.000Z",
    firstTrialDate: "2026-02-05",
    lastTrialDate: "2026-03-05",
    contractStatus: ContractStatus.MEMBERSHIP_ACTIVATED,
    overrideStatus: TrialOverrideStatus.NONE,
    overrideUsed: false,
    membershipStatus: PersonMembershipStatus.ACTIVE_MEMBER,
    memberId: "member-41",
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
    note: "Demo-Umwandlung Paket 1.3 – Probetrainingsteilnehmer wurde zum Mitglied.",
  },
  // 4 von 4 mit genutzter Vorstandsausnahme – naechste Einheit wieder gesperrt
  {
    id: "trial-006",
    firstName: "Noah",
    lastName: "Beispiel-Probe",
    displayName: "Noah Beispiel-Probe",
    gender: "MAENNLICH",
    birthDate: "2009-09-03",
    contactName: "Elternkontakt Beispiel",
    contactPhone: "030-555-0106",
    createdAt: "2026-01-10T09:00:00.000Z",
    firstTrialDate: "2026-01-15",
    lastTrialDate: "2026-02-26",
    contractStatus: ContractStatus.NOT_ISSUED,
    overrideStatus: TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED,
    overrideGrantedBy: "Vorstand Demo",
    overrideGrantedAt: "2026-02-20T14:00:00.000Z",
    overrideReason: "Terminkonflikt bei Vertragseingang – einmalige Ausnahme fiktiv",
    overrideUsed: true,
    membershipStatus: PersonMembershipStatus.TRIAL,
    beltColor: "WEISS",
    beltGrade: "10. Kyu",
    active: true,
    note: "Fiktives Demo-Profil. Vorstandsausnahme wurde genutzt.",
  },
];

// ---------------------------------------------------------------------------
// Guertelhistorien (fiktiv, ausschliesslich Demo)
// ---------------------------------------------------------------------------

export const beltHistory: BeltHistoryEntry[] = [
  {
    id: "belt-0001",
    personId: "member-01",
    previousBeltColor: "ORANGE",
    previousBeltGrade: "7. Kyu",
    newBeltColor: "GRUEN",
    newBeltGrade: "6. Kyu",
    effectiveFrom: "2026-03-15",
    examDate: "2026-03-15",
    examiner: "Aiko Beispiel (fiktiv)",
    recordedBy: "Trainer Demo",
    recordedAt: "2026-03-15T19:30:00.000Z",
    source: BeltChangeSource.MANUAL_CONFIRMED,
  },
  {
    id: "belt-0002",
    personId: "member-02",
    previousBeltColor: "BRAUN",
    previousBeltGrade: "2. Kyu",
    newBeltColor: "SCHWARZ",
    newBeltGrade: "1. Dan",
    effectiveFrom: "2026-01-20",
    examDate: "2026-01-20",
    recordedBy: "Vorstand Demo",
    recordedAt: "2026-01-20T20:00:00.000Z",
    source: BeltChangeSource.MANUAL_CONFIRMED,
  },
  {
    id: "belt-0003",
    personId: "member-09",
    previousBeltColor: "ORANGE",
    previousBeltGrade: "7. Kyu",
    newBeltColor: "GRUEN",
    newBeltGrade: "6. Kyu",
    effectiveFrom: "2026-05-10",
    examDate: "2026-05-10",
    recordedBy: "Trainer Demo",
    recordedAt: "2026-05-10T18:45:00.000Z",
    source: BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED,
    note: "Bildvorschlag (fiktiv) bestaetigt nach manueller Pruefung des Grades",
  },
];

// ---------------------------------------------------------------------------
// Erweiterte Guertelhistorien – Paket 1.4 Demo-Daten (fiktiv)
// ---------------------------------------------------------------------------

// Drei weitere fiktive Guertelaenderungen fuer Demo-Zwecke
export const beltHistoryExtended: BeltHistoryEntry[] = [
  {
    id: "belt-0004",
    personId: "member-03",
    previousBeltColor: "GRUEN",
    previousBeltGrade: "6. Kyu",
    newBeltColor: "BLAU",
    newBeltGrade: "5. Kyu",
    effectiveFrom: "2026-04-12",
    examDate: "2026-04-12",
    examiner: "Ren Beispiel (fiktiv)",
    recordedBy: "Trainer Demo",
    recordedAt: "2026-04-12T19:00:00.000Z",
    source: BeltChangeSource.MANUAL_CONFIRMED,
    note: "Demo-Guertelaenderung Paket 1.4",
  },
  {
    id: "belt-0005",
    personId: "member-04",
    previousBeltColor: "GELB",
    previousBeltGrade: "8. Kyu",
    newBeltColor: "ORANGE",
    newBeltGrade: "7. Kyu",
    effectiveFrom: "2026-05-03",
    recordedBy: "Vorstand Demo",
    recordedAt: "2026-05-03T20:00:00.000Z",
    source: BeltChangeSource.BOARD_CORRECTION,
    note: "Korrektur nach Rueckfrage Demo",
  },
  {
    id: "belt-0006",
    personId: "member-10",
    previousBeltColor: "GELB",
    previousBeltGrade: "8. Kyu",
    newBeltColor: "ORANGE",
    newBeltGrade: "7. Kyu",
    effectiveFrom: "2026-06-01",
    examDate: "2026-06-01",
    examiner: "Hana Beispiel (fiktiv)",
    recordedBy: "Trainer Demo",
    recordedAt: "2026-06-01T19:30:00.000Z",
    source: BeltChangeSource.IMAGE_SUGGESTION_CONFIRMED,
    note: "Demo: Bildvorschlag bestaetigt (Farbe erkannt, Grad manuell eingetragen)",
  },
];

// ---------------------------------------------------------------------------
// Bildvorschlaege Guertelfarbe (fiktiv, Demo-only)
// ---------------------------------------------------------------------------

export const initialBeltSuggestions: BeltSuggestion[] = [
  {
    id: "bsugg-001",
    sessionId: "session-main",
    sessionDate: "2026-06-20",
    memberId: "member-09",
    storedBeltColor: "GRUEN",
    suggestedBeltColor: "BLAU",
    confidencePercent: 82,
    status: BeltSuggestionStatus.OPEN,
  },
  {
    id: "bsugg-002",
    sessionId: "session-main",
    sessionDate: "2026-06-20",
    memberId: "member-10",
    storedBeltColor: "GELB",
    suggestedBeltColor: "ORANGE",
    confidencePercent: 61,
    status: BeltSuggestionStatus.OPEN,
  },
  {
    id: "bsugg-003",
    sessionId: "history-session-05",
    sessionDate: "2026-05-15",
    memberId: "member-03",
    storedBeltColor: "BLAU",
    suggestedBeltColor: "BRAUN",
    confidencePercent: 74,
    status: BeltSuggestionStatus.CONFIRMED,
    decidedBy: "Trainer Demo",
    decidedAt: "2026-05-15T19:00:00.000Z",
    historyEntryId: "belt-0001",
  },
  {
    id: "bsugg-004",
    sessionId: "history-session-06",
    sessionDate: "2026-06-01",
    memberId: "member-05",
    storedBeltColor: "GRUEN",
    suggestedBeltColor: "WEISS",
    confidencePercent: 45,
    status: BeltSuggestionStatus.REJECTED,
    decidedBy: "Trainer Demo",
    decidedAt: "2026-06-01T18:30:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Anwesenheits-Mock-Records fuer Probetrainingsteilnehmer
// (Referenziert historische Session-IDs aus reportingMockData)
// ---------------------------------------------------------------------------

/**
 * Simulierte Anwesenheitsdatensaetze fuer Probetrainingsteilnehmer.
 * Diese werden separat von den Mitglieder-Attendance-Records gehalten,
 * damit die 40 bestehenden Mitglieder unveraendert bleiben.
 */
export const trialAttendanceHistory = [
  // trial-002: 1 Besuch
  { sessionId: "hist-2026-01-07", participantId: "trial-002", present: true },
  // trial-003: 2 Besuche
  { sessionId: "hist-2026-01-07", participantId: "trial-003", present: true },
  { sessionId: "hist-2026-01-14", participantId: "trial-003", present: true },
  // trial-004: 3 Besuche
  { sessionId: "hist-2026-01-07", participantId: "trial-004", present: true },
  { sessionId: "hist-2026-01-14", participantId: "trial-004", present: true },
  { sessionId: "hist-2026-02-04", participantId: "trial-004", present: true },
  // trial-005: 4 Besuche
  { sessionId: "hist-2026-01-07", participantId: "trial-005", present: true },
  { sessionId: "hist-2026-01-14", participantId: "trial-005", present: true },
  { sessionId: "hist-2026-02-04", participantId: "trial-005", present: true },
  { sessionId: "hist-2026-03-04", participantId: "trial-005", present: true },
  // trial-006: 4 regulaere + 1 Ausnahme = 5 Besuche
  { sessionId: "hist-2026-01-07", participantId: "trial-006", present: true },
  { sessionId: "hist-2026-01-14", participantId: "trial-006", present: true },
  { sessionId: "hist-2026-02-04", participantId: "trial-006", present: true },
  { sessionId: "hist-2026-03-04", participantId: "trial-006", present: true },
  { sessionId: "hist-2026-04-01", participantId: "trial-006", present: true }, // Ausnahme
] as const;

// ---------------------------------------------------------------------------
// Paket 1.3 – Fiktive Audit-Eintraege (Demo-only)
// ---------------------------------------------------------------------------

export const demoAuditEntries: AuditEntry[] = [
  {
    id: "audit-conv-member-41",
    occurredAt: "2026-06-10T10:00:00.000Z",
    actor: "Vorstand Demo",
    action: "TRIAL_CONVERTED_TO_MEMBER",
    object: "TrialParticipant:trial-005",
    previousValue: "TRIAL",
    newValue: "ACTIVE_MEMBER:member-41",
    reason: "Vertrag eingegangen, Umwandlung abgeschlossen (Demo Paket 1.3)",
  },
  {
    id: "audit-override-trial-006-2026-02-20T14:00:00.000Z",
    occurredAt: "2026-02-20T14:00:00.000Z",
    actor: "Vorstand Demo",
    action: "BOARD_OVERRIDE_GRANTED",
    object: "TrialParticipant:trial-006",
    previousValue: "NONE",
    newValue: "ONE_ADDITIONAL_SESSION_APPROVED",
    reason: "Terminkonflikt bei Vertragseingang – einmalige Ausnahme fiktiv",
  },
  {
    id: "audit-direct-member-050",
    occurredAt: "2026-06-15T11:00:00.000Z",
    actor: "Vorstand Demo",
    action: "DIRECT_MEMBER_CREATED",
    object: "Member:member-050",
    previousValue: null,
    newValue: "Direktmitglied, Klaus:M-1050",
    reason: "Fiktive Direktanlage Demo Paket 1.3",
  },
];

export const initialPhotoProposals: PhotoProposal[] = [
  {
    id: "proposal-1",
    label: "Vorschlag A",
    status: "EINDEUTIG",
    candidateMemberId: "member-09",
    selectedMemberId: "member-09",
    resolutionAction: "PRESELECTED_MEMBER",
    resolved: true,
  },
  {
    id: "proposal-2",
    label: "Vorschlag B",
    status: "PRUEFEN",
    candidateMemberId: "member-10",
    resolutionAction: null,
    resolved: false,
  },
  {
    id: "proposal-3",
    label: "Gesicht C",
    status: "UNBEKANNT",
    resolutionAction: null,
    resolved: false,
  },
  {
    id: "proposal-4",
    label: "Paar D",
    status: "DUBLETTE",
    candidateMemberId: "member-12",
    resolutionAction: null,
    resolved: false,
  },
];
