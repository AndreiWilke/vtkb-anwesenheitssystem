import { MemberQualification } from "@vtkb/shared";

import type { AgeGroup, BeltColor, Member, PhotoProposal, TrainingSessionMock } from "./types";
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
  { color: "WEISS", grade: "9. Kyu" },
  { color: "GELB", grade: "8. Kyu" },
  { color: "ORANGE", grade: "7. Kyu" },
  { color: "GRUEN", grade: "6. Kyu" },
  { color: "BLAU", grade: "5. Kyu" },
  { color: "BRAUN", grade: "2. Kyu" },
  { color: "SCHWARZ", grade: "1. Dan" },
];

function ageGroupForIndex(index: number): AgeGroup {
  if (index < 14) return "KIND";
  if (index < 27) return "JUGEND";
  return "ERWACHSEN";
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
    ageGroup: ageGroupForIndex(index),
    beltColor: belt?.color ?? "WEISS",
    beltGrade: belt?.grade ?? "9. Kyu",
    qualification: qualificationForIndex(index),
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
