import type { MemberQualification, PresenceStatus, SessionRole } from "@vtkb/shared";

export type AgeGroup = "KIND" | "JUGEND" | "ERWACHSEN";
export type BeltColor = "WEISS" | "GELB" | "ORANGE" | "GRUEN" | "BLAU" | "BRAUN" | "SCHWARZ";
export type SessionUiStatus = "BEVORSTEHEND" | "LAEUFT" | "BEENDET";
export type GuestKind = "GAST" | "PROBETRAINING";
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
  ageGroup: AgeGroup;
  beltColor: BeltColor;
  beltGrade: string;
  qualification: MemberQualification;
  trainingsVisited: number;
  responsibleAssignments: number;
  assistantAssignments: number;
}

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
  | "STATS";
