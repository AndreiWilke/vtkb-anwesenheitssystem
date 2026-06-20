import { useMemo, useState } from "react";
import { PresenceStatus, SessionRole } from "@vtkb/shared";

import { AppShell } from "./components";
import {
  CaptureMethodScreen,
  CompleteScreen,
  GuestScreen,
  LeadershipScreen,
  LoginScreen,
  ManualAttendanceScreen,
  PhotoDemoScreen,
  PhotoReviewScreen,
  SessionSelectScreen,
  StartScreen,
  StatsScreen,
  SummaryScreen,
} from "./screens";
import { createTodaySessions, initialPhotoProposals, members } from "./mockData";
import type {
  AppScreen,
  AttendanceState,
  LocalGuest,
  PhotoProposal,
  TrainingSessionMock,
} from "./types";
import { canCompleteSession, createInitialAttendance, suggestSession } from "./workflow";

function cloneProposals(): PhotoProposal[] {
  return initialPhotoProposals.map((proposal) => ({ ...proposal }));
}

export default function App() {
  const sessions = useMemo(() => createTodaySessions(), []);
  const [screen, setScreen] = useState<AppScreen>("START");
  const [selectedSession, setSelectedSession] = useState<TrainingSessionMock>(() =>
    suggestSession(sessions),
  );
  const [attendance, setAttendance] = useState<AttendanceState>(() =>
    createInitialAttendance(members, suggestSession(sessions)),
  );
  const [guests, setGuests] = useState<LocalGuest[]>([]);
  const [photoModeUsed, setPhotoModeUsed] = useState(false);
  const [proposals, setProposals] = useState<PhotoProposal[]>(cloneProposals);

  const activeProposals = photoModeUsed ? proposals : [];
  const unresolvedProposalCount = activeProposals.filter((proposal) => !proposal.resolved).length;
  const completion = canCompleteSession(
    selectedSession,
    attendance,
    guests,
    unresolvedProposalCount,
  );

  const selectSession = (session: TrainingSessionMock) => {
    setSelectedSession(session);
    setAttendance(createInitialAttendance(members, session));
    setGuests([]);
    setPhotoModeUsed(false);
    setProposals(cloneProposals());
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
  };

  const addGuest = (guest: Omit<LocalGuest, "id">) => {
    setGuests((current) => [
      ...current,
      { ...guest, id: `guest-${String(current.length + 1).padStart(2, "0")}` },
    ]);
  };

  const resolveProposal = (
    proposalId: string,
    action: "CONFIRM" | "UNKNOWN" | "DISCARD" | "GUEST" | "ALTERNATE",
  ) => {
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal) return;
    const chosenMemberId =
      action === "ALTERNATE" ? proposal.alternateMemberId : proposal.candidateMemberId;
    if ((action === "CONFIRM" || action === "ALTERNATE") && chosenMemberId) {
      setAttendance((current) => ({
        ...current,
        [chosenMemberId]: {
          presenceStatus: PresenceStatus.PRESENT,
          sessionRole: current[chosenMemberId]?.sessionRole ?? SessionRole.PARTICIPANT,
        },
      }));
    }
    if (action === "GUEST") {
      setGuests((current) => [
        ...current,
        {
          id: `guest-photo-demo-${proposalId}`,
          firstName: `Gast Demo ${current.length + 1}`,
          kind: "GAST",
        },
      ]);
    }
    setProposals((current) =>
      current.map((item) => (item.id === proposalId ? { ...item, resolved: true } : item)),
    );
  };

  const navigate = (next: AppScreen) => {
    if (next === "MANUAL") {
      setScreen("MANUAL");
      return;
    }
    setScreen(next);
  };

  const startNextSession = () => {
    const next =
      sessions.find((session) => session.startsAt >= selectedSession.endsAt) ?? sessions[0]!;
    selectSession(next);
  };

  let content;
  switch (screen) {
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
          onStart={() => setScreen("LEADERSHIP")}
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
          onManual={() => setScreen("MANUAL")}
          onPhoto={() => {
            setPhotoModeUsed(true);
            setScreen("PHOTO_DEMO");
          }}
        />
      );
      break;
    case "MANUAL":
      content = (
        <ManualAttendanceScreen
          attendance={attendance}
          guestCount={guests.length}
          members={members}
          responsibleId={selectedSession.responsibleTrainerId}
          onBack={() => setScreen("CAPTURE_METHOD")}
          onGuests={() => setScreen("GUESTS")}
          onReview={() => setScreen("SUMMARY")}
          onRoleChange={changeRole}
          onToggleAttendance={toggleAttendance}
        />
      );
      break;
    case "GUESTS":
      content = (
        <GuestScreen
          guests={guests}
          onAdd={addGuest}
          onBack={() => setScreen("MANUAL")}
          onRemove={(id) => setGuests((current) => current.filter((guest) => guest.id !== id))}
        />
      );
      break;
    case "PHOTO_DEMO":
      content = (
        <PhotoDemoScreen
          onBack={() => setScreen("CAPTURE_METHOD")}
          onComplete={() => setScreen("PHOTO_REVIEW")}
        />
      );
      break;
    case "PHOTO_REVIEW":
      content = (
        <PhotoReviewScreen
          members={members}
          proposals={proposals}
          onBack={() => setScreen("PHOTO_DEMO")}
          onManual={() => setScreen("MANUAL")}
          onResolve={resolveProposal}
          onSummary={() => setScreen("SUMMARY")}
        />
      );
      break;
    case "SUMMARY":
      content = (
        <SummaryScreen
          attendance={attendance}
          canSave={completion.allowed}
          guests={guests}
          members={members}
          proposals={activeProposals}
          session={selectedSession}
          validationMessages={completion.messages}
          onManual={() => setScreen("MANUAL")}
          onPhotoReview={() => setScreen(photoModeUsed ? "PHOTO_REVIEW" : "CAPTURE_METHOD")}
          onSave={() => setScreen("COMPLETE")}
        />
      );
      break;
    case "COMPLETE":
      content = (
        <CompleteScreen
          attendance={attendance}
          guests={guests}
          members={members}
          session={selectedSession}
          onHome={() => setScreen("START")}
          onNext={startNextSession}
          onOverview={() => setScreen("STATS")}
        />
      );
      break;
    case "STATS":
      content = <StatsScreen members={members} onBack={() => setScreen("START")} />;
      break;
  }

  return (
    <AppShell screen={screen} onNavigate={navigate}>
      {content}
    </AppShell>
  );
}
