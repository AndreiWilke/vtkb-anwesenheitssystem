import { useMemo, useState } from "react";
import {
  DemoRole,
  AppPermission,
  ContractStatus,
  CaptureSource,
  PresenceStatus,
  PersonMembershipStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  createRetrospectiveSession,
  createRetrospectiveSessionIdGenerator,
  checkConversionEligibility,
  hasPermission,
  useTrialOverride,
  type RetrospectiveSessionInput,
} from "@vtkb/shared";

import { AppShell } from "./components";
import {
  CaptureMethodScreen,
  CompleteScreen,
  LeadershipScreen,
  LoginScreen,
  ManagementScreen,
  ManualAttendanceScreen,
  PhotoDemoScreen,
  PhotoReviewScreen,
  RetrospectiveSessionScreen,
  SessionSelectScreen,
  StartScreen,
  SummaryScreen,
} from "./screens";
import { ReportingScreen } from "./reportingScreens";
import {
  TrialListScreen,
  TrialNewScreen,
  TrialProfileScreen,
  TrialContractScreen,
  BoardOverrideScreen,
  TrialConversionScreen,
  DirectMemberNewScreen,
} from "./trialScreens";
import { TrialReportScreen } from "./trialReportScreen";
import {
  BeltChangeDialog,
  BeltHistoryScreen,
  BeltSuggestionReviewScreen,
  BeltSimulationDemoScreen,
} from "./beltScreens";
import { BeltReportScreen } from "./beltReportScreen";
import {
  beltHistory as initialBeltHistory,
  beltHistoryExtended,
  createTodaySessions,
  initialBeltSuggestions,
  initialPhotoProposals,
  members as initialMembers,
  trialParticipants as initialTrialParticipants,
} from "./mockData";
import type {
  AppScreen,
  AttendanceState,
  AuditEntry,
  BeltHistoryEntry,
  BeltSuggestion,
  ConversionResult,
  DemoRoleValue,
  DirectMemberResult,
  Member,
  PhotoProposal,
  ProposalDecision,
  TrainingSessionMock,
  TrialParticipant,
  WorkflowState,
  HistoricalTrainingSession,
  TrainingType,
} from "./types";
import {
  attendanceRecordsForSession,
  canCompleteSession,
  createInitialAttendance,
  hasParallelSessionChoice,
  suggestSession,
} from "./workflow";
import { initialHistoricalSessions } from "./reportingMockData";
import { blockedTrialParticipantsInSession, computeTrialSessionCount } from "./trialWorkflow";

export function canAccessScreen(role: DemoRoleValue, screen: AppScreen): boolean {
  switch (screen) {
    case "TRIAL_LIST":
    case "TRIAL_NEW":
    case "TRIAL_PROFILE":
    case "TRIAL_CONTRACT":
      return hasPermission(role, AppPermission.MANAGE_TRIAL_PROFILES);
    case "TRIAL_BOARD_OVERRIDE":
      return hasPermission(role, AppPermission.GRANT_TRIAL_OVERRIDE);
    case "TRIAL_CONVERT":
      return hasPermission(role, AppPermission.CONVERT_TRIAL_MEMBER);
    case "MEMBER_DIRECT_NEW":
      return hasPermission(role, AppPermission.CREATE_DIRECT_MEMBER);
    case "BELT_CHANGE":
    case "BELT_SIM_DEMO":
      return hasPermission(role, AppPermission.CHANGE_BELT);
    case "BELT_SUGGESTION_REVIEW":
      return hasPermission(role, AppPermission.DECIDE_BELT_SUGGESTION);
    case "RETRO_DATE_SELECT":
    case "RETRO_CREATE":
      return hasPermission(role, AppPermission.CREATE_RETROSPECTIVE_SESSION);
    default:
      return true;
  }
}

function cloneProposals(): PhotoProposal[] {
  return initialPhotoProposals.map((proposal) => ({ ...proposal }));
}

const initialWorkflow: WorkflowState = {
  trainingStarted: false,
  captureMethod: null,
  captureActivityRecorded: false,
  attendanceReviewed: false,
};

function proposalMemberIds(proposals: readonly PhotoProposal[]): Set<string> {
  return new Set(
    proposals.flatMap((proposal) =>
      proposal.resolved && proposal.selectedMemberId ? [proposal.selectedMemberId] : [],
    ),
  );
}

export default function App() {
  const sessions = useMemo(() => createTodaySessions(new Date()), []);

  // Anwesenheits-Workflow
  const [screen, setScreen] = useState<AppScreen>("LOGIN");
  const [selectedSession, setSelectedSession] = useState<TrainingSessionMock>(() =>
    suggestSession(sessions),
  );
  const [attendance, setAttendance] = useState<AttendanceState>(() =>
    createInitialAttendance(initialMembers, selectedSession),
  );
  const [photoModeUsed, setPhotoModeUsed] = useState(false);
  const [proposals, setProposals] = useState<PhotoProposal[]>(cloneProposals);
  const [workflow, setWorkflow] = useState<WorkflowState>(initialWorkflow);
  const [demoRole, setDemoRole] = useState<DemoRoleValue>(DemoRole.BOARD);

  // Probetraining-State
  const [trialParticipants, setTrialParticipants] = useState<TrialParticipant[]>(() => [
    ...initialTrialParticipants,
  ]);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const [selectedTrialAttendanceIds, setSelectedTrialAttendanceIds] = useState<string[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<HistoricalTrainingSession[]>(() => [
    ...initialHistoricalSessions,
  ]);
  const [nextRetrospectiveId] = useState(() =>
    createRetrospectiveSessionIdGenerator(initialHistoricalSessions.map((session) => session.id)),
  );

  // Mitglieder-State (für neue/umgewandelte Mitglieder)
  const [members, setMembers] = useState<Member[]>(() => [...initialMembers]);

  // Gürtel-State
  const [beltHistory, setBeltHistory] = useState<BeltHistoryEntry[]>(() => [
    ...initialBeltHistory,
    ...beltHistoryExtended,
  ]);
  const [beltSuggestions, setBeltSuggestions] = useState<BeltSuggestion[]>(() => [
    ...initialBeltSuggestions,
  ]);
  const [selectedBeltMemberId, setSelectedBeltMemberId] = useState<string | null>(null);

  // Hilfsfunktionen
  const selectedTrialParticipant = trialParticipants.find((p) => p.id === selectedTrialId) ?? null;
  const selectedTrialAttended = selectedTrialParticipant
    ? computeTrialSessionCount(selectedTrialParticipant.id, trainingHistory).attended
    : 0;
  const selectedBeltMember = members.find((m) => m.id === selectedBeltMemberId) ?? null;
  const isBoard = demoRole === DemoRole.BOARD;
  const canManageTrials = hasPermission(demoRole, AppPermission.MANAGE_TRIAL_PROFILES);
  const canCreateDirectMember = hasPermission(demoRole, AppPermission.CREATE_DIRECT_MEMBER);
  const canChangeBelt = hasPermission(demoRole, AppPermission.CHANGE_BELT);
  const canDecideBeltSuggestion = hasPermission(demoRole, AppPermission.DECIDE_BELT_SUGGESTION);

  const addAuditEntry = (entry: AuditEntry) => {
    setAuditEntries((prev) => [entry, ...prev]);
  };

  // Probetraining-Helfer
  const updateTrialParticipant = (updated: TrialParticipant) => {
    setTrialParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Anwesenheits-Workflow-Hilfsfunktionen
  const activeProposals = photoModeUsed ? proposals : [];
  const unresolvedProposalCount = activeProposals.filter((proposal) => !proposal.resolved).length;
  const blockedTrialParticipants = blockedTrialParticipantsInSession(
    selectedTrialAttendanceIds,
    trialParticipants,
    trainingHistory,
  );
  const completion = useMemo(
    () =>
      canCompleteSession(
        selectedSession,
        attendance,
        unresolvedProposalCount,
        blockedTrialParticipants,
      ),
    [selectedSession, attendance, unresolvedProposalCount, blockedTrialParticipants],
  );

  const workflowMessages = [
    ...(workflow.captureMethod ? [] : ["Es wurde noch keine Erfassungsart begonnen."]),
    ...(workflow.captureActivityRecorded
      ? []
      : ["Die Anwesenheit wurde noch nicht aktiv erfasst."]),
    ...(workflow.attendanceReviewed ? [] : ["Die Anwesenheitsliste wurde noch nicht geprüft."]),
  ];
  const canSave = completion.allowed && workflowMessages.length === 0;

  const resetWorkflowForSession = () => {
    setWorkflow({ ...initialWorkflow, trainingStarted: true });
  };

  const markCaptureActivity = () => {
    setWorkflow((current) => ({
      ...current,
      captureActivityRecorded: true,
      attendanceReviewed: false,
    }));
  };

  const synchronizeProposalAttendance = (
    previous: readonly PhotoProposal[],
    next: readonly PhotoProposal[],
  ) => {
    const previousIds = proposalMemberIds(previous);
    const nextIds = proposalMemberIds(next);
    setAttendance((current) => {
      const updated = { ...current };
      previousIds.forEach((memberId) => {
        if (
          !nextIds.has(memberId) &&
          updated[memberId]?.sessionRole === SessionRole.PARTICIPANT &&
          updated[memberId].captureSource === CaptureSource.PHOTO_ASSISTED
        ) {
          updated[memberId] = {
            presenceStatus: PresenceStatus.ABSENT,
            sessionRole: null,
            captureSource: CaptureSource.MANUAL,
          };
        }
      });
      nextIds.forEach((memberId) => {
        updated[memberId] = {
          presenceStatus: PresenceStatus.PRESENT,
          sessionRole: updated[memberId]?.sessionRole ?? SessionRole.PARTICIPANT,
          captureSource: CaptureSource.PHOTO_ASSISTED,
        };
      });
      return updated;
    });
  };

  const selectSession = (session: TrainingSessionMock) => {
    setSelectedSession(session);
    setAttendance(createInitialAttendance(members, session));
    setSelectedTrialAttendanceIds([]);
    setPhotoModeUsed(false);
    setProposals(cloneProposals());
    resetWorkflowForSession();
    setScreen("LEADERSHIP");
  };

  const beginTraining = () => {
    if (hasParallelSessionChoice(sessions, selectedSession)) {
      setScreen("SESSION_SELECT");
      return;
    }
    setAttendance(createInitialAttendance(members, selectedSession));
    setSelectedTrialAttendanceIds([]);
    setPhotoModeUsed(false);
    setProposals(cloneProposals());
    resetWorkflowForSession();
    setScreen("LEADERSHIP");
  };

  const changeResponsible = (memberId: string) => {
    setAttendance((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([id, selection]) => {
        if (selection.sessionRole === SessionRole.RESPONSIBLE_TRAINER) {
          next[id] = {
            presenceStatus: PresenceStatus.PRESENT,
            sessionRole: SessionRole.PARTICIPANT,
            captureSource: CaptureSource.MANUAL,
          };
        }
      });
      next[memberId] = {
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: SessionRole.RESPONSIBLE_TRAINER,
        captureSource: CaptureSource.MANUAL,
      };
      return next;
    });
    setSelectedSession((current) => ({
      ...current,
      responsibleTrainerId: memberId,
      assistantTrainerIds: current.assistantTrainerIds.filter((id) => id !== memberId),
    }));
  };

  const toggleAssistant = (memberId: string) => {
    setAttendance((current) => {
      const selection = current[memberId];
      const selected = selection?.sessionRole === SessionRole.ASSISTANT_TRAINER;
      return {
        ...current,
        [memberId]: {
          presenceStatus: PresenceStatus.PRESENT,
          sessionRole: selected ? SessionRole.PARTICIPANT : SessionRole.ASSISTANT_TRAINER,
          captureSource: CaptureSource.MANUAL,
        },
      };
    });
  };

  const toggleAttendance = (memberId: string) => {
    if (memberId === selectedSession.responsibleTrainerId) return;
    setAttendance((current) => {
      const present = current[memberId]?.presenceStatus === PresenceStatus.PRESENT;
      return {
        ...current,
        [memberId]: present
          ? {
              presenceStatus: PresenceStatus.ABSENT,
              sessionRole: null,
              captureSource: CaptureSource.MANUAL,
            }
          : {
              presenceStatus: PresenceStatus.PRESENT,
              sessionRole: SessionRole.PARTICIPANT,
              captureSource: CaptureSource.MANUAL,
            },
      };
    });
    markCaptureActivity();
  };

  const toggleTrialAttendance = (participantId: string) => {
    setSelectedTrialAttendanceIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
    markCaptureActivity();
  };

  const persistCurrentSession = () => {
    if (!canSave || trainingHistory.some((session) => session.id === selectedSession.id)) return;
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(selectedSession.startsAt);
    const records: AttendanceRecord[] = attendanceRecordsForSession(
      selectedSession,
      attendance,
    ).map((record) => ({
      ...record,
      membershipStatusAtTime: PersonMembershipStatus.ACTIVE_MEMBER,
    }));
    records.push(
      ...selectedTrialAttendanceIds.map((memberId) => ({
        sessionId: selectedSession.id,
        memberId,
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: SessionRole.PARTICIPANT,
        captureSource: CaptureSource.MANUAL,
        membershipStatusAtTime: PersonMembershipStatus.TRIAL,
      })),
    );
    const completedAt = new Date().toISOString();
    const historicalSession: HistoricalTrainingSession = {
      id: selectedSession.id,
      date,
      startsAt: selectedSession.startsAt.toISOString(),
      endsAt: selectedSession.endsAt.toISOString(),
      timeZone: "Europe/Berlin",
      name: selectedSession.name,
      trainingType: selectedSession.trainingType,
      scheduledSlotId: selectedSession.scheduledSlotId,
      dojoId: selectedSession.dojoId,
      dojoNameSnapshot: selectedSession.dojoNameSnapshot,
      dojo: selectedSession.dojo,
      status: TrainingSessionStatus.COMPLETED,
      attendance: records,
      completedAt,
      completedBy: demoRole,
    };
    setTrainingHistory((current) => [...current, historicalSession]);
    const overrideAudits: AuditEntry[] = [];
    const updatedTrialParticipants = trialParticipants.map((participant) => {
      if (!selectedTrialAttendanceIds.includes(participant.id)) return participant;
      let updated: TrialParticipant = {
        ...participant,
        firstTrialDate: participant.firstTrialDate ?? date,
        lastTrialDate: date,
      };
      const attended = computeTrialSessionCount(participant.id, trainingHistory).attended;
      if (
        participant.overrideStatus === "ONE_ADDITIONAL_SESSION_APPROVED" &&
        !participant.overrideUsed &&
        attended === 4
      ) {
        const used = useTrialOverride(
          participant,
          attended,
          demoRole,
          completedAt,
          selectedSession.id,
        );
        updated = { ...updated, ...used.updatedParticipant };
        overrideAudits.push(used.auditEntry);
      }
      return updated;
    });
    setTrialParticipants(updatedTrialParticipants);
    overrideAudits.forEach(addAuditEntry);
    addAuditEntry({
      id: `audit-session-${selectedSession.id}`,
      occurredAt: completedAt,
      actor: demoRole,
      action: "TRAINING_SESSION_COMPLETED",
      object: `TrainingSession:${selectedSession.id}`,
      previousValue: null,
      newValue: `${records.length} Anwesenheiten`,
      reason: null,
    });
  };

  const changeRole = (memberId: string, role: SessionRole) => {
    if (role === SessionRole.RESPONSIBLE_TRAINER) {
      changeResponsible(memberId);
      return;
    }
    setAttendance((current) => ({
      ...current,
      [memberId]: {
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: role,
        captureSource: CaptureSource.MANUAL,
      },
    }));
    markCaptureActivity();
  };

  const resolveProposal = (
    proposalId: string,
    action: ProposalDecision,
    selectedMemberId?: string,
  ) => {
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal) return;
    if (action === "CONFIRM_CANDIDATE" && proposal.status === "UNBEKANNT") return;
    if (action === "SELECT_MEMBER" && !selectedMemberId) return;

    let nextProposal: PhotoProposal;
    if (action === "RESET") {
      nextProposal = {
        ...proposal,
        resolved: false,
        resolutionAction: null,
        selectedMemberId: undefined,
      };
    } else if (action === "CONFIRM_CANDIDATE" && proposal.candidateMemberId) {
      nextProposal = {
        ...proposal,
        resolved: true,
        resolutionAction: "CONFIRMED_MEMBER",
        selectedMemberId: proposal.candidateMemberId,
      };
    } else if (action === "SELECT_MEMBER" && selectedMemberId) {
      nextProposal = {
        ...proposal,
        resolved: true,
        resolutionAction: "SELECTED_MEMBER",
        selectedMemberId,
      };
    } else if (action === "MARK_UNKNOWN") {
      nextProposal = {
        ...proposal,
        resolved: true,
        resolutionAction: "MARKED_UNKNOWN",
        selectedMemberId: undefined,
      };
    } else if (action === "DISCARD") {
      nextProposal = {
        ...proposal,
        resolved: true,
        resolutionAction: "DISCARDED",
        selectedMemberId: undefined,
      };
    } else {
      return;
    }

    const nextProposals = proposals.map((item) => (item.id === proposalId ? nextProposal : item));
    synchronizeProposalAttendance(proposals, nextProposals);
    setProposals(nextProposals);
    markCaptureActivity();
  };

  const startManualCapture = () => {
    if (photoModeUsed) {
      synchronizeProposalAttendance(proposals, []);
    }
    setPhotoModeUsed(false);
    setProposals(cloneProposals());
    setWorkflow((current) => ({
      ...current,
      captureMethod: "MANUAL",
      captureActivityRecorded: false,
      attendanceReviewed: false,
    }));
    setScreen("MANUAL");
  };

  const startPhotoCapture = () => {
    const nextProposals = cloneProposals();
    synchronizeProposalAttendance(photoModeUsed ? proposals : [], nextProposals);
    setProposals(nextProposals);
    setPhotoModeUsed(true);
    setWorkflow((current) => ({
      ...current,
      captureMethod: "PHOTO_DEMO",
      captureActivityRecorded: false,
      attendanceReviewed: false,
    }));
    setScreen("PHOTO_DEMO");
  };

  const reviewAttendance = () => {
    setWorkflow((current) => ({ ...current, attendanceReviewed: true }));
    setScreen("SUMMARY");
  };

  const editManualAttendance = () => {
    if (workflow.captureMethod === "PHOTO_DEMO") {
      startManualCapture();
      return;
    }
    setWorkflow((current) => ({ ...current, attendanceReviewed: false }));
    setScreen("MANUAL");
  };

  const navigate = (next: AppScreen) => {
    if (!canAccessScreen(demoRole, next)) {
      setScreen("MANAGEMENT");
      return;
    }
    if (next === "MANUAL") {
      if (!workflow.trainingStarted) setScreen("LEADERSHIP");
      else if (!workflow.captureMethod) setScreen("CAPTURE_METHOD");
      else setScreen(workflow.captureMethod === "MANUAL" ? "MANUAL" : "PHOTO_REVIEW");
      return;
    }
    if (next === "SUMMARY") {
      if (!workflow.trainingStarted) setScreen("LEADERSHIP");
      else if (!workflow.captureMethod) setScreen("CAPTURE_METHOD");
      else if (!workflow.attendanceReviewed)
        setScreen(workflow.captureMethod === "MANUAL" ? "MANUAL" : "PHOTO_REVIEW");
      else setScreen("SUMMARY");
      return;
    }
    setScreen(next);
  };

  const startNextSession = () => {
    const next =
      sessions.find((session) => session.startsAt >= selectedSession.endsAt) ?? sessions[0]!;
    selectSession(next);
  };

  // Bestehende Mitglieds-IDs und -Nummern für ID-Generatoren
  const existingMemberIds = [
    ...members.map((member) => member.id),
    ...trialParticipants.map((participant) => participant.id),
  ];
  const existingMemberNumbers = members.map((m) => m.memberNumber ?? m.id);
  const existingPersons = [
    ...trialParticipants.map((participant) => ({
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      birthDate: participant.birthDate,
    })),
    ...members.map((member) => {
      const [commaLast, commaFirst] = member.name.split(",").map((part) => part.trim());
      const parts = member.name.trim().split(/\s+/);
      return {
        id: member.id,
        firstName: commaFirst || parts[0] || member.name,
        lastName: commaFirst ? commaLast || "Mitglied" : parts.slice(1).join(" ") || "Mitglied",
        birthDate: member.birthDate ?? "0000",
      };
    }),
  ];

  const accessibleScreen = canAccessScreen(demoRole, screen) ? screen : "MANAGEMENT";
  let content;
  switch (accessibleScreen) {
    // ------------------------------------------------------------------
    // Bestehende Anwesenheits-Screens (unverändert)
    // ------------------------------------------------------------------
    case "LOGIN":
      content = <LoginScreen onLogin={() => setScreen("START")} />;
      break;
    case "START":
      content = (
        <StartScreen
          members={members}
          selectedSession={selectedSession}
          sessions={sessions}
          requiresExplicitSelection={hasParallelSessionChoice(sessions, selectedSession)}
          onChooseSession={() => setScreen("SESSION_SELECT")}
          onSelectHistory={() => setScreen("STATS")}
          onStart={beginTraining}
        />
      );
      break;
    case "SESSION_SELECT":
      content = (
        <SessionSelectScreen
          selectedId={selectedSession.id}
          sessions={sessions}
          onBack={() => setScreen("START")}
          onSelect={selectSession}
        />
      );
      break;
    case "LEADERSHIP":
      content = (
        <LeadershipScreen
          attendance={attendance}
          members={members}
          responsibleId={selectedSession.responsibleTrainerId}
          onAssistantToggle={toggleAssistant}
          onBack={() => setScreen("START")}
          onContinue={() => setScreen("CAPTURE_METHOD")}
          onResponsibleChange={changeResponsible}
        />
      );
      break;
    case "CAPTURE_METHOD":
      content = (
        <CaptureMethodScreen
          onBack={() => setScreen("LEADERSHIP")}
          onManual={startManualCapture}
          onPhoto={startPhotoCapture}
        />
      );
      break;
    case "MANUAL":
      content = (
        <ManualAttendanceScreen
          attendance={attendance}
          members={members}
          trialParticipants={trialParticipants}
          selectedTrialIds={selectedTrialAttendanceIds}
          responsibleId={selectedSession.responsibleTrainerId}
          onBack={() => setScreen("CAPTURE_METHOD")}
          onReview={reviewAttendance}
          onRoleChange={changeRole}
          onToggleAttendance={toggleAttendance}
          onToggleTrial={toggleTrialAttendance}
        />
      );
      break;
    case "PHOTO_DEMO":
      content = (
        <PhotoDemoScreen
          onBack={() => setScreen("CAPTURE_METHOD")}
          onComplete={() => {
            markCaptureActivity();
            setScreen("PHOTO_REVIEW");
          }}
        />
      );
      break;
    case "PHOTO_REVIEW":
      content = (
        <PhotoReviewScreen
          members={members}
          proposals={proposals}
          onBack={() => setScreen("PHOTO_DEMO")}
          onManual={startManualCapture}
          onResolve={resolveProposal}
          onSummary={reviewAttendance}
        />
      );
      break;
    case "SUMMARY":
      content = (
        <SummaryScreen
          attendance={attendance}
          trialParticipants={trialParticipants}
          selectedTrialIds={selectedTrialAttendanceIds}
          canSave={canSave}
          members={members}
          proposals={activeProposals}
          session={selectedSession}
          validationMessages={[...completion.messages, ...workflowMessages]}
          onManual={editManualAttendance}
          onPhotoReview={() => setScreen(photoModeUsed ? "PHOTO_REVIEW" : "CAPTURE_METHOD")}
          onSave={() => {
            if (canSave) {
              persistCurrentSession();
              setScreen("COMPLETE");
            }
          }}
        />
      );
      break;
    case "COMPLETE":
      content = (
        <CompleteScreen
          attendance={attendance}
          selectedTrialIds={selectedTrialAttendanceIds}
          members={members}
          session={selectedSession}
          onHome={() => {
            setScreen("START");
          }}
          onNext={() => {
            startNextSession();
          }}
          onOverview={() => setScreen("STATS")}
        />
      );
      break;
    case "STATS":
      content = (
        <ReportingScreen
          demoRole={demoRole}
          members={members}
          history={trainingHistory}
          onBack={() => setScreen("START")}
        />
      );
      break;

    // ------------------------------------------------------------------
    // Paket 1.2 – Probetraining
    // ------------------------------------------------------------------
    case "TRIAL_LIST":
      content = (
        <TrialListScreen
          participants={trialParticipants}
          history={trainingHistory}
          onSelect={(id) => {
            setSelectedTrialId(id);
            setScreen("TRIAL_PROFILE");
          }}
          onNew={() => navigate("TRIAL_NEW")}
          onBack={() => setScreen("START")}
        />
      );
      break;
    case "TRIAL_NEW":
      content = (
        <TrialNewScreen
          existingParticipants={trialParticipants}
          existingPersons={existingPersons}
          isBoard={isBoard}
          onSave={(participant) => {
            if (!canManageTrials) return;
            setTrialParticipants((prev) => [...prev, participant]);
            setSelectedTrialId(participant.id);
            setScreen("TRIAL_PROFILE");
          }}
          onBack={() => setScreen("TRIAL_LIST")}
        />
      );
      break;
    case "TRIAL_PROFILE":
      content = selectedTrialParticipant ? (
        <TrialProfileScreen
          participant={selectedTrialParticipant}
          history={trainingHistory}
          onContractView={() => navigate("TRIAL_CONTRACT")}
          onBoardOverride={
            hasPermission(demoRole, AppPermission.GRANT_TRIAL_OVERRIDE) &&
            selectedTrialParticipant.active &&
            selectedTrialParticipant.membershipStatus === PersonMembershipStatus.TRIAL &&
            (selectedTrialParticipant.contractStatus === ContractStatus.NOT_ISSUED ||
              selectedTrialParticipant.contractStatus === ContractStatus.ISSUED) &&
            selectedTrialParticipant.overrideStatus === "NONE" &&
            selectedTrialAttended === 4
              ? () => navigate("TRIAL_BOARD_OVERRIDE")
              : undefined
          }
          onConvert={
            hasPermission(demoRole, AppPermission.CONVERT_TRIAL_MEMBER) &&
            checkConversionEligibility(selectedTrialParticipant).eligible
              ? () => navigate("TRIAL_CONVERT")
              : undefined
          }
          onBack={() => setScreen("TRIAL_LIST")}
        />
      ) : null;
      break;
    case "TRIAL_CONTRACT":
      content = selectedTrialParticipant ? (
        <TrialContractScreen
          participant={selectedTrialParticipant}
          isBoard={isBoard}
          onUpdate={(updated) => {
            if (!canManageTrials) return;
            if (
              updated.contractStatus === ContractStatus.MEMBERSHIP_ACTIVATED &&
              !hasPermission(demoRole, AppPermission.ACTIVATE_CONTRACT)
            )
              return;
            updateTrialParticipant(updated);
          }}
          onBack={() => setScreen("TRIAL_PROFILE")}
        />
      ) : null;
      break;

    // ------------------------------------------------------------------
    // Paket 1.3 – Vorstandsausnahme, Umwandlung, Direktanlage
    // ------------------------------------------------------------------
    case "TRIAL_BOARD_OVERRIDE":
      content = selectedTrialParticipant ? (
        <BoardOverrideScreen
          participant={selectedTrialParticipant}
          attendedTrialCount={selectedTrialAttended}
          onSave={(updated, audit) => {
            if (!hasPermission(demoRole, AppPermission.GRANT_TRIAL_OVERRIDE)) return;
            updateTrialParticipant(updated);
            addAuditEntry(audit);
            setScreen("TRIAL_PROFILE");
          }}
          onBack={() => setScreen("TRIAL_PROFILE")}
        />
      ) : null;
      break;
    case "TRIAL_CONVERT":
      content = selectedTrialParticipant ? (
        <TrialConversionScreen
          participant={selectedTrialParticipant}
          existingMemberNumbers={existingMemberNumbers}
          history={trainingHistory}
          onConvert={(result: ConversionResult) => {
            if (!hasPermission(demoRole, AppPermission.CONVERT_TRIAL_MEMBER)) return;
            updateTrialParticipant(result.updatedParticipant);
            const participant = result.updatedParticipant;
            setMembers((current) =>
              current.some((member) => member.id === participant.id)
                ? current
                : [
                    ...current,
                    {
                      id: participant.id,
                      memberNumber: result.memberNumber,
                      name: `${participant.firstName} ${participant.lastName}`,
                      initials:
                        `${participant.firstName[0] ?? ""}${participant.lastName[0] ?? ""}`.toUpperCase(),
                      gender: participant.gender,
                      birthDate: participant.birthDate,
                      beltColor: (participant.beltColor ?? "WEISS") as Member["beltColor"],
                      beltGrade: participant.beltGrade ?? "10. Kyu",
                      qualification: result.qualification,
                      active: true,
                      trainingsVisited: trainingHistory.filter((session) =>
                        session.attendance.some(
                          (record) =>
                            record.memberId === participant.id &&
                            record.presenceStatus === PresenceStatus.PRESENT,
                        ),
                      ).length,
                      responsibleAssignments: 0,
                      assistantAssignments: 0,
                    },
                  ],
            );
            addAuditEntry(result.auditEntry);
            setScreen("TRIAL_LIST");
          }}
          onBack={() => setScreen("TRIAL_PROFILE")}
        />
      ) : null;
      break;
    case "MEMBER_DIRECT_NEW":
      content = (
        <DirectMemberNewScreen
          existingMemberIds={existingMemberIds}
          existingMemberNumbers={existingMemberNumbers}
          existingPersons={existingPersons}
          onSave={(result: DirectMemberResult, audit: AuditEntry) => {
            if (!canCreateDirectMember) return;
            // Neues Mitglied als vereinfachtes Member-Objekt in die Liste aufnehmen
            const newMember: Member = {
              id: result.memberId,
              memberNumber: result.memberNumber,
              name: result.displayName,
              initials:
                result.displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase() || "??",
              gender: result.gender,
              birthDate: result.birthDate,
              contactPhone: result.contactPhone,
              beltColor: result.beltColor as Member["beltColor"],
              beltGrade: result.beltGrade,
              qualification: result.qualification,
              active: true,
              trainingsVisited: 0,
              responsibleAssignments: 0,
              assistantAssignments: 0,
            };
            setMembers((prev) => [...prev, newMember]);
            addAuditEntry(audit);
            setScreen("START");
          }}
          onBack={() => setScreen("START")}
        />
      );
      break;
    case "TRIAL_REPORT":
      content = (
        <TrialReportScreen
          participants={trialParticipants}
          history={trainingHistory}
          onSelectParticipant={(id) => {
            setSelectedTrialId(id);
            setScreen("TRIAL_PROFILE");
          }}
          onBack={() => setScreen("STATS")}
        />
      );
      break;

    // ------------------------------------------------------------------
    // Paket 1.2 – Bildvorschlag-Review
    // ------------------------------------------------------------------
    case "BELT_SUGGESTION_REVIEW":
      content = (
        <BeltSuggestionReviewScreen
          suggestions={beltSuggestions}
          members={members}
          existingHistoryIds={beltHistory.map((e) => e.id)}
          actorName={demoRole}
          canEdit={canDecideBeltSuggestion}
          onDecide={(updated, newEntry) => {
            if (!canDecideBeltSuggestion) return;
            setBeltSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            if (newEntry) {
              setBeltHistory((prev) => [...prev, newEntry]);
              // Mitglied aktualisieren
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === newEntry.personId
                    ? {
                        ...m,
                        beltColor: newEntry.newBeltColor as Member["beltColor"],
                        beltGrade: newEntry.newBeltGrade,
                      }
                    : m,
                ),
              );
            }
          }}
          onBack={() => setScreen("START")}
        />
      );
      break;

    // ------------------------------------------------------------------
    // Paket 1.4 – Gürtelverwaltung
    // ------------------------------------------------------------------
    case "BELT_HISTORY":
      content = selectedBeltMember ? (
        <BeltHistoryScreen
          member={selectedBeltMember}
          history={beltHistory}
          canEdit={canChangeBelt}
          onChangesBelt={() => navigate("BELT_CHANGE")}
          onBack={() => setScreen("BELT_REPORT")}
        />
      ) : null;
      break;
    case "BELT_CHANGE":
      content = selectedBeltMember ? (
        <BeltChangeDialog
          member={selectedBeltMember}
          existingHistoryIds={beltHistory.map((e) => e.id)}
          actorName={demoRole}
          onConfirm={(entry) => {
            if (!canChangeBelt) return;
            setBeltHistory((prev) => [...prev, entry]);
            setMembers((prev) =>
              prev.map((m) =>
                m.id === entry.personId
                  ? {
                      ...m,
                      beltColor: entry.newBeltColor as Member["beltColor"],
                      beltGrade: entry.newBeltGrade,
                    }
                  : m,
              ),
            );
            setScreen("BELT_HISTORY");
          }}
          onCancel={() => setScreen("BELT_HISTORY")}
        />
      ) : null;
      break;
    case "BELT_REPORT":
      content = (
        <BeltReportScreen
          members={members}
          beltHistory={beltHistory}
          beltSuggestions={beltSuggestions}
          onMemberSelect={(id) => {
            setSelectedBeltMemberId(id);
            setScreen("BELT_HISTORY");
          }}
          onBack={() => setScreen("STATS")}
        />
      );
      break;
    case "BELT_SIM_DEMO":
      content = (
        <BeltSimulationDemoScreen
          members={members}
          onBack={() => setScreen("BELT_REPORT")}
          onSuggestionCreated={(suggestion) => {
            if (!canChangeBelt) return;
            setBeltSuggestions((prev) => [...prev, suggestion]);
            navigate("BELT_SUGGESTION_REVIEW");
          }}
        />
      );
      break;

    // ------------------------------------------------------------------
    // Verwaltungs-Hub
    // ------------------------------------------------------------------
    case "MANAGEMENT":
      content = (
        <ManagementScreen
          openBeltSuggestionsCount={beltSuggestions.filter((s) => s.status === "OPEN").length}
          canManageTrials={canManageTrials}
          canCreateDirectMember={canCreateDirectMember}
          canManageBelts={canChangeBelt}
          canDecideBeltSuggestions={canDecideBeltSuggestion}
          onTrialList={() => navigate("TRIAL_LIST")}
          onNewMember={() => navigate("MEMBER_DIRECT_NEW")}
          onBeltReport={() => navigate("BELT_REPORT")}
          onBeltSuggestions={() => navigate("BELT_SUGGESTION_REVIEW")}
          onBeltSimulation={() => navigate("BELT_SIM_DEMO")}
          onRetroEntry={() => navigate("RETRO_DATE_SELECT")}
          recentRetrospectiveSessions={trainingHistory.filter((session) =>
            session.id.startsWith("retro-"),
          )}
          auditCount={auditEntries.length}
          auditEntries={auditEntries}
        />
      );
      break;

    // ------------------------------------------------------------------
    // Paket 1.6 – Nachtragserfassung
    // ------------------------------------------------------------------
    case "RETRO_DATE_SELECT":
      content = (
        <RetrospectiveSessionScreen
          members={members}
          trialParticipants={trialParticipants}
          history={trainingHistory}
          actorRole={demoRole}
          onSave={(input: RetrospectiveSessionInput) => {
            if (!hasPermission(demoRole, AppPermission.CREATE_RETROSPECTIVE_SESSION)) return;
            const { session, auditEntry } = createRetrospectiveSession(
              nextRetrospectiveId(),
              input,
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Europe/Berlin",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date()),
            );
            const historicalSession: HistoricalTrainingSession = {
              ...session,
              trainingType: session.trainingType as TrainingType,
            };
            setTrainingHistory((current) => [...current, historicalSession]);
            addAuditEntry(auditEntry);
            setScreen("MANAGEMENT");
          }}
          onBack={() => setScreen("MANAGEMENT")}
        />
      );
      break;

    default:
      content = null;
  }

  return (
    <AppShell
      demoRole={demoRole}
      reviewEnabled={workflow.attendanceReviewed}
      screen={screen}
      onDemoRoleChange={setDemoRole}
      onNavigate={navigate}
    >
      {content}
    </AppShell>
  );
}
