import { useMemo, useState } from "react";
import {
  DemoRole,
  CaptureSource,
  PresenceStatus,
  SessionRole,
  TrainingSessionStatus,
  type AttendanceRecord,
  createRetrospectiveSession,
  createRetrospectiveSessionIdGenerator,
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
import { canCompleteSession, createInitialAttendance, suggestSession } from "./workflow";
import { historicalSessions, recordHistoricalSession } from "./reportingMockData";
import { blockedTrialParticipantsInSession } from "./trialWorkflow";

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
  const [screen, setScreen] = useState<AppScreen>("START");
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
    ...historicalSessions,
  ]);
  const [nextRetrospectiveId] = useState(() =>
    createRetrospectiveSessionIdGenerator(historicalSessions.map((session) => session.id)),
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
  const selectedBeltMember = members.find((m) => m.id === selectedBeltMemberId) ?? null;
  const isBoard = demoRole === DemoRole.BOARD;

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
        if (!nextIds.has(memberId) && updated[memberId]?.sessionRole === SessionRole.PARTICIPANT) {
          updated[memberId] = { presenceStatus: PresenceStatus.ABSENT, sessionRole: null };
        }
      });
      nextIds.forEach((memberId) => {
        updated[memberId] = {
          presenceStatus: PresenceStatus.PRESENT,
          sessionRole: updated[memberId]?.sessionRole ?? SessionRole.PARTICIPANT,
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
          };
        }
      });
      next[memberId] = {
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: SessionRole.RESPONSIBLE_TRAINER,
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
          ? { presenceStatus: PresenceStatus.ABSENT, sessionRole: null }
          : { presenceStatus: PresenceStatus.PRESENT, sessionRole: SessionRole.PARTICIPANT },
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
    const records: AttendanceRecord[] = Object.entries(attendance)
      .filter(([, selection]) => selection.presenceStatus === PresenceStatus.PRESENT)
      .map(([memberId, selection]) => ({
        sessionId: selectedSession.id,
        memberId,
        presenceStatus: selection.presenceStatus,
        sessionRole: selection.sessionRole,
        captureSource: CaptureSource.MANUAL,
      }));
    records.push(
      ...selectedTrialAttendanceIds.map((memberId) => ({
        sessionId: selectedSession.id,
        memberId,
        presenceStatus: PresenceStatus.PRESENT,
        sessionRole: SessionRole.PARTICIPANT,
        captureSource: CaptureSource.MANUAL,
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
      trainingType: "GRUNDLAGENTRAINING",
      dojo: selectedSession.dojo,
      status: TrainingSessionStatus.COMPLETED,
      attendance: records,
      completedAt,
      completedBy: demoRole,
    };
    recordHistoricalSession(historicalSession);
    setTrainingHistory((current) => [...current, historicalSession]);
    setTrialParticipants((current) =>
      current.map((participant) =>
        selectedTrialAttendanceIds.includes(participant.id)
          ? {
              ...participant,
              firstTrialDate: participant.firstTrialDate ?? date,
              lastTrialDate: date,
              overrideUsed:
                participant.overrideStatus === "ONE_ADDITIONAL_SESSION_APPROVED"
                  ? true
                  : participant.overrideUsed,
            }
          : participant,
      ),
    );
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
      [memberId]: { presenceStatus: PresenceStatus.PRESENT, sessionRole: role },
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
  const existingMemberIds = members.map((m) => m.id);
  const existingMemberNumbers = members.map((m) => m.memberNumber ?? m.id);

  let content;
  switch (screen) {
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
        <ReportingScreen demoRole={demoRole} members={members} onBack={() => setScreen("START")} />
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
          onNew={() => setScreen("TRIAL_NEW")}
          onBack={() => setScreen("START")}
        />
      );
      break;
    case "TRIAL_NEW":
      content = (
        <TrialNewScreen
          existingParticipants={trialParticipants}
          isBoard={isBoard}
          onSave={(participant) => {
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
          onContractView={() => setScreen("TRIAL_CONTRACT")}
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
          onSave={(updated, audit) => {
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
          onSave={(result: DirectMemberResult, audit: AuditEntry) => {
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
          canEdit={isBoard || demoRole === DemoRole.TRAINER}
          onDecide={(updated, newEntry) => {
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
          canEdit={isBoard || demoRole === DemoRole.TRAINER}
          onChangesBelt={() => setScreen("BELT_CHANGE")}
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
            setBeltSuggestions((prev) => [...prev, suggestion]);
            setScreen("BELT_SUGGESTION_REVIEW");
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
          onTrialList={() => setScreen("TRIAL_LIST")}
          onNewMember={() => setScreen("MEMBER_DIRECT_NEW")}
          onBeltReport={() => setScreen("BELT_REPORT")}
          onBeltSuggestions={() => setScreen("BELT_SUGGESTION_REVIEW")}
          onRetroEntry={() => setScreen("RETRO_DATE_SELECT")}
          recentRetrospectiveSessions={trainingHistory.filter((session) =>
            session.id.startsWith("retro-"),
          )}
          auditCount={auditEntries.length}
          auditEntries={auditEntries}
          canCreateRetrospective={isBoard}
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
          onSave={(input: RetrospectiveSessionInput) => {
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
            recordHistoricalSession(historicalSession);
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
