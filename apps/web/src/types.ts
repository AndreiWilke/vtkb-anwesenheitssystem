import type {
  AttendanceRecord,
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
export type BeltColor = "WEISS" | "WEISS_ROT" | "GELB" | "GELB_ORANGE" | "ORANGE" | "ORANGE_GRUEN" | "GRUEN" | "GRUEN_BLAU" | "BLAU" | "BLAU_BRAUN" | "BRAUN" | "SCHWARZ";
export type SessionUiStatus = "BEVORSTEHEND" | "LAEUFT" | "BEENDET";

/**
 * Paket 1.2: GuestKind ist nur noch "GAST".
 * "PROBETRAINING" wurde durch TrialParticipant (eigenes Profil) ersetzt.
 */
export type GuestKind = "GAST";

export type ProposalStatus = "EINDEUTIG" | "PRUEFEN" | "UNBEKANNT" | "DUBLETTE";
export type ProposalResolutionAction =
  | "PRESELECTED_MEMBER"
  | "CONFIRMED_MEMBER"
  | "SELECTED_MEMBER"
  | "MARKED_UNKNOWN"
  | "GUEST_CREATED"
  | "DISCARDED";
export type ProposalDecision =
  | "CONFIRM_CANDIDATE"
  | "SELECT_MEMBER"
  | "MARK_UNKNOWN"
  | "CREATE_GUEST"
  | "DISCARD"
  | "RESET";
export type CaptureMethod = "MANUAL" | "PHOTO_DEMO";

export interface Member {
  id: string;
  name: string;
  initials: string;
  gender: Gender;
  birthDate?: string;
  beltColor: BeltColor;
  beltGrade: string;
  qualification: MemberQualification;
  active: boolean;
  trainingsVisited: number;
  responsibleAssignments: number;
  assistantAssignments: number;
}

export type TrainingType =
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
  name: string;
  dojo: string;
  startsAt: Date;
  endsAt: Date;
  responsibleTrainerId: string;
  assistantTrainerIds: string[];
}

export interface AttendanceSelection {
  presenceStatus: PresenceStatus;
  sessionRole: SessionRole | null;
}

export type AttendanceState = Record<string, AttendanceSelection>;

export interface LocalGuest {
  id: string;
  firstName: string;
  lastName?: string;
  kind: GuestKind;
}

export interface PhotoProposal {
  id: string;
  label: string;
  status: ProposalStatus;
  candidateMemberId?: string;
  selectedMemberId?: string;
  guestId?: string;
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
  | "GUESTS"
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
  | "MANAGEMENT";
