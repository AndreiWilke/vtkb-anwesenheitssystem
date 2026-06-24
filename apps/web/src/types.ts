import type {
  AttendanceRecord,
  CaptureSource,
  BeltHistoryEntry as SharedBeltHistoryEntry,
  BeltSuggestion as SharedBeltSuggestion,
  DemoRole,
  MemberQualification,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  TrialParticipant as SharedTrialParticipant,
} from "@vtkb/shared";

// Re-export shared Paket-1.2 + 1.3 Typen fuer Verwendung in der Web-App
export type {
  AuditEntry,
  BeltChangeSource,
  BeltSuggestionStatus,
  ContractStatus,
  ConversionResult,
  DirectMemberResult,
  PersonMembershipStatus,
  TrialOverrideStatus,
} from "@vtkb/shared";

export type BeltHistoryEntry = SharedBeltHistoryEntry;
export type BeltSuggestion = SharedBeltSuggestion;
export type TrialParticipant = SharedTrialParticipant;

export type Gender = "MAENNLICH" | "WEIBLICH";
export type BeltColor =
  | "WEISS"
  | "WEISS_ROT"
  | "WEISS_GELB"
  | "GELB"
  | "GELB_ORANGE"
  | "ORANGE"
  | "ORANGE_GRUEN"
  | "GRUEN"
  | "GRUEN_BLAU"
  | "BLAU"
  | "VIOLETT"
  | "BRAUN"
  | "SCHWARZ";
export type SessionUiStatus = "BEVORSTEHEND" | "LAEUFT" | "BEENDET";

export type ProposalStatus = "EINDEUTIG" | "PRUEFEN" | "UNBEKANNT" | "DUBLETTE";
export type ProposalResolutionAction =
  | "PRESELECTED_MEMBER"
  | "CONFIRMED_MEMBER"
  | "SELECTED_MEMBER"
  | "MARKED_UNKNOWN"
  | "DISCARDED";
export type ProposalDecision =
  | "CONFIRM_CANDIDATE"
  | "SELECT_MEMBER"
  | "MARK_UNKNOWN"
  | "DISCARD"
  | "RESET";
export type CaptureMethod = "MANUAL" | "PHOTO_DEMO";

export interface Member {
  id: string;
  memberNumber?: string;
  name: string;
  initials: string;
  gender: Gender;
  birthDate?: string;
  contactPhone?: string;
  beltColor: BeltColor;
  beltGrade: string;
  qualification: MemberQualification;
  active: boolean;
  trainingsVisited: number;
  responsibleAssignments: number;
  assistantAssignments: number;
}

export type TrainingType =
  | "ALLGEMEINES_TRAINING"
  | "KINDERTRAINING"
  | "JUGENDTRAINING"
  | "ERWACHSENENTRAINING"
  | "GRUNDLAGENTRAINING"
  | "FORTGESCHRITTENENTRAINING";

export interface HistoricalTrainingSession {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  timeZone: "Europe/Berlin";
  name: string;
  trainingType: TrainingType;
  scheduledSlotId: string | null;
  dojoId: string;
  dojoNameSnapshot: string;
  dojo: string;
  status: TrainingSessionStatus;
  attendance: readonly AttendanceRecord[];
  completedAt: string | null;
  completedBy: string | null;
}

export type ReportingView =
  | "DASHBOARD"
  | "MEMBERS"
  | "MEMBER_DETAIL"
  | "TRAINERS"
  | "TRAINER_DETAIL"
  | "SETTLEMENTS"
  | "SETTLEMENT_DETAIL"
  | "RATES"
  | "AUDIT"
  | "PAYMENTS"
  | "OWN"
  | "TRIALS"
  | "TRIAL_DETAIL"
  | "TRIAL_REPORT"
  | "BELT_SUGGESTIONS"
  | "BELT_REPORT"
  | "BELT_HISTORY_DETAIL";

export type DemoRoleValue = DemoRole;

export interface TrainingSessionMock {
  id: string;
  scheduledSlotId: string;
  name: string;
  trainingType: TrainingType;
  dojoId: string;
  dojoNameSnapshot: string;
  dojo: string;
  startsAt: Date;
  endsAt: Date;
  responsibleTrainerId: string;
  assistantTrainerIds: string[];
}

export interface AttendanceSelection {
  presenceStatus: PresenceStatus;
  sessionRole: SessionRole | null;
  captureSource: CaptureSource;
}

export type AttendanceState = Record<string, AttendanceSelection>;

export interface PhotoProposal {
  id: string;
  label: string;
  status: ProposalStatus;
  candidateMemberId?: string;
  selectedMemberId?: string;
  resolutionAction: ProposalResolutionAction | null;
  resolved: boolean;
}

export interface WorkflowState {
  trainingStarted: boolean;
  captureMethod: CaptureMethod | null;
  captureActivityRecorded: boolean;
  attendanceReviewed: boolean;
}

export type AppScreen =
  | "LOGIN"
  | "START"
  | "SESSION_SELECT"
  | "LEADERSHIP"
  | "CAPTURE_METHOD"
  | "MANUAL"
  | "PHOTO_DEMO"
  | "PHOTO_REVIEW"
  | "SUMMARY"
  | "COMPLETE"
  | "STATS"
  // Paket 1.2
  | "TRIAL_LIST"
  | "TRIAL_NEW"
  | "TRIAL_PROFILE"
  | "TRIAL_CONTRACT"
  | "BELT_SUGGESTION_REVIEW"
  // Paket 1.3
  | "TRIAL_CONVERT"
  | "TRIAL_BOARD_OVERRIDE"
  | "MEMBER_DIRECT_NEW"
  | "TRIAL_REPORT"
  // Paket 1.4
  | "BELT_HISTORY"
  | "BELT_CHANGE"
  | "BELT_REPORT"
  | "BELT_SIM_DEMO"
  // Verwaltungs-Hub
  | "MANAGEMENT"
  // Paket 1.6
  | "RETRO_DATE_SELECT"
  | "RETRO_CREATE";
