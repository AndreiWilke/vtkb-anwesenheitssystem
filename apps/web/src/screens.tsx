import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { MemberQualification, PresenceStatus, SessionRole } from "@vtkb/shared";

import {
  BeltMark,
  MemberAvatar,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  StatusTag,
  ToriiMark,
} from "./components";
import { completedSessionHistory } from "./mockData";
import type {
  AttendanceState,
  BeltColor,
  Gender,
  LocalGuest,
  Member,
  ProposalDecision,
  PhotoProposal,
  TrainingSessionMock,
} from "./types";
import { presentMemberIds, sessionUiStatus } from "./workflow";
import { clubDateFormatter, clubTimeFormatter } from "./time";

function formatSessionTime(session: TrainingSessionMock) {
  return `${clubTimeFormatter.format(session.startsAt)}–${clubTimeFormatter.format(session.endsAt)} Uhr`;
}

function memberName(members: readonly Member[], id: string) {
  return members.find((member) => member.id === id)?.name ?? "Nicht zugeordnet";
}

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="login-screen">
      <div className="login-mark">
        <ToriiMark />
      </div>
      <h1>VTKB Anwesenheit</h1>
      <p>Lokaler klickbarer UX-Prototyp mit ausschließlich fiktiven Daten.</p>
      <div className="demo-notice compact">
        <Info aria-hidden="true" />
        <span>Kein echtes Konto, keine Cloudverbindung und keine produktive Anmeldung.</span>
      </div>
      <label className="field-label" htmlFor="demo-user">
        Demo-Rolle
      </label>
      <select defaultValue="trainer-a" id="demo-user">
        <option value="trainer-a">Trainer A · fiktiv</option>
        <option value="assistant-b">Assistenz B · fiktiv</option>
      </select>
      <PrimaryButton onClick={onLogin}>Demo lokal öffnen</PrimaryButton>
    </section>
  );
}

export function StartScreen({
  sessions,
  selectedSession,
  members,
  onStart,
  onChooseSession,
  onSelectHistory,
}: {
  sessions: readonly TrainingSessionMock[];
  selectedSession: TrainingSessionMock;
  members: readonly Member[];
  onStart: () => void;
  onChooseSession: () => void;
  onSelectHistory: () => void;
}) {
  const following = sessions.find((session) => session.startsAt >= selectedSession.endsAt);
  return (
    <section>
      <PageHeading title="Start" description={clubDateFormatter.format(new Date())} />
      <div className="section-label">Heute empfohlen</div>
      <article className="session-focus">
        <div className="session-title-row">
          <CalendarDays aria-hidden="true" />
          <div>
            <h2>{selectedSession.name}</h2>
            <StatusTag tone="good">Vorgeschlagen</StatusTag>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>
              <Clock3 aria-hidden="true" />
              Zeit
            </dt>
            <dd>{formatSessionTime(selectedSession)}</dd>
          </div>
          <div>
            <dt>
              <MapPin aria-hidden="true" />
              Dojo
            </dt>
            <dd>{selectedSession.dojo}</dd>
          </div>
          <div>
            <dt>
              <Users aria-hidden="true" />
              Verantwortlich
            </dt>
            <dd>{memberName(members, selectedSession.responsibleTrainerId)}</dd>
          </div>
        </dl>
        <PrimaryButton onClick={onStart}>
          Training starten <ArrowRight aria-hidden="true" />
        </PrimaryButton>
        <button className="text-button centered" type="button" onClick={onChooseSession}>
          Andere Einheit auswählen
        </button>
      </article>

      {following ? (
        <section className="open-section">
          <div className="section-label">Direkt anschließend</div>
          <button className="session-row" type="button" onClick={onChooseSession}>
            <span>
              <strong>{following.name}</strong>
              <small>
                {formatSessionTime(following)} · {following.dojo}
              </small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </section>
      ) : null}

      <section className="open-section">
        <div className="section-heading-row">
          <div className="section-label">Zuletzt abgeschlossen</div>
          <button className="text-button" type="button" onClick={onSelectHistory}>
            Auswertung
          </button>
        </div>
        <div className="history-list">
          {completedSessionHistory.map((item) => (
            <div className="history-row" key={item.id}>
              <span>{item.label}</span>
              <strong>{item.count} anwesend</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function SessionSelectScreen({
  sessions,
  selectedId,
  retroDate,
  onSelect,
  onBack,
}: {
  sessions: readonly TrainingSessionMock[];
  selectedId: string;
  retroDate?: string;
  onSelect: (session: TrainingSessionMock) => void;
  onBack: () => void;
}) {
  return (
    <section>
      <PageHeading
        title={retroDate ? "Nachtrag – Einheit auswählen" : "Trainingseinheit auswählen"}
        description="Kein fester Kader: Alle aktiven Mitglieder können jede Einheit besuchen."
        onBack={onBack}
      />
      {retroDate ? (
        <div className="demo-notice">
          <History aria-hidden="true" />
          <span>
            <strong>Nachtragserfassung</strong> – Datum: {retroDate}
          </span>
        </div>
      ) : null}
      <div className="session-list">
        {sessions.map((session) => {
          const status = sessionUiStatus(session);
          return (
            <button
              className={session.id === selectedId ? "session-option selected" : "session-option"}
              key={session.id}
              type="button"
              onClick={() => onSelect(session)}
            >
              <span className="session-date">{clubDateFormatter.format(session.startsAt)}</span>
              <strong>{session.name}</strong>
              <span>
                {formatSessionTime(session)} · {session.dojo}
              </span>
              <div className="session-option-right">
                <StatusTag
                  tone={status === "LAEUFT" ? "good" : status === "BEENDET" ? "muted" : "warn"}
                >
                  {status === "LAEUFT" ? "Läuft" : status === "BEENDET" ? "Beendet" : "Bevorstehend"}
                </StatusTag>
                {session.id === selectedId ? (
                  <CheckCircle2 aria-label="Ausgewählt" />
                ) : (
                  <ChevronRight aria-hidden="true" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function LeadershipScreen({
  members,
  attendance,
  responsibleId,
  onResponsibleChange,
  onAssistantToggle,
  onContinue,
  onBack,
}: {
  members: readonly Member[];
  attendance: AttendanceState;
  responsibleId: string;
  onResponsibleChange: (memberId: string) => void;
  onAssistantToggle: (memberId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const trainerCandidates = members.filter(
    (member) => member.qualification === MemberQualification.TRAINER,
  );
  const assistantCandidates = members.filter(
    (member) => member.qualification !== MemberQualification.NONE && member.id !== responsibleId,
  );
  return (
    <section>
      <PageHeading
        title="Trainingsleitung"
        description="Dauerhafte Qualifikation und heutige Funktion bleiben getrennt."
        onBack={onBack}
      />
      <fieldset className="choice-group">
        <legend>Genau ein verantwortlicher Trainer</legend>
        {trainerCandidates.map((member) => (
          <label className="choice-row" key={member.id}>
            <input
              checked={responsibleId === member.id}
              name="responsible"
              type="radio"
              onChange={() => onResponsibleChange(member.id)}
            />
            <MemberAvatar initials={member.initials} />
            <span>
              <strong>{member.name}</strong>
              <small>Trainerqualifikation · heute verantwortlich</small>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="choice-group">
        <legend>Assistenztrainer · optional mehrere</legend>
        {assistantCandidates.map((member) => {
          const selected = attendance[member.id]?.sessionRole === SessionRole.ASSISTANT_TRAINER;
          return (
            <label className="choice-row" key={member.id}>
              <input
                checked={selected}
                type="checkbox"
                onChange={() => onAssistantToggle(member.id)}
              />
              <MemberAvatar initials={member.initials} />
              <span>
                <strong>{member.name}</strong>
                <small>
                  {member.qualification === MemberQualification.TRAINER
                    ? "Trainerqualifikation"
                    : "Assistenzqualifikation"}{" "}
                  · setzt automatisch anwesend
                </small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <PrimaryButton onClick={onContinue}>
        Erfassungsart wählen <ArrowRight aria-hidden="true" />
      </PrimaryButton>
    </section>
  );
}

export function CaptureMethodScreen({
  onManual,
  onPhoto,
  onBack,
}: {
  onManual: () => void;
  onPhoto: () => void;
  onBack: () => void;
}) {
  return (
    <section>
      <PageHeading
        title="Anwesenheit erfassen"
        description="Beide Wege führen zur gleichen geprüften Anwesenheitsliste."
        onBack={onBack}
      />
      <button className="method-option primary-method" type="button" onClick={onManual}>
        <Users aria-hidden="true" />
        <span>
          <strong>Manuell erfassen</strong>
          <small>Vollständige Hauptfunktion · schnell antippen, suchen und filtern</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <button className="method-option" type="button" onClick={onPhoto}>
        <Camera aria-hidden="true" />
        <span>
          <strong>Fotoassistenz – nur Demo</strong>
          <small>Keine Kamera, keine Bilder, keine Gesichtserkennung</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <div className="demo-notice">
        <ShieldCheck aria-hidden="true" />
        <span>Die manuelle Erfassung bleibt jederzeit vollständig und gleichwertig nutzbar.</span>
      </div>
    </section>
  );
}

export function ManualAttendanceScreen({
  members,
  attendance,
  responsibleId,
  onToggleAttendance,
  onRoleChange,
  onReview,
  onBack,
}: {
  members: readonly Member[];
  attendance: AttendanceState;
  responsibleId: string;
  onToggleAttendance: (memberId: string) => void;
  onRoleChange: (memberId: string, role: SessionRole) => void;
  onReview: () => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [gender, setGender] = useState<Gender | "ALLE">("ALLE");
  const [belt, setBelt] = useState<BeltColor | "ALLE">("ALLE");
  const [trainersOnly, setTrainersOnly] = useState(false);
  const visibleMembers = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("de");
    return members.filter((member) => {
      if (query && !member.name.toLocaleLowerCase("de").includes(query)) return false;
      if (gender !== "ALLE" && member.gender !== gender) return false;
      if (belt !== "ALLE" && member.beltColor !== belt) return false;
      if (trainersOnly && member.qualification === MemberQualification.NONE) return false;
      return true;
    });
  }, [gender, belt, deferredSearch, members, trainersOnly]);
  const presentCount = presentMemberIds(attendance).length;
  return (
    <section>
      <PageHeading
        title="Manuelle Schnellerfassung"
        description="Standardmäßig abwesend. Antippen setzt den Status eindeutig."
        onBack={onBack}
      />
      <div className="sticky-tools">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Mitglied suchen</span>
          <input
            aria-label="Mitglied suchen"
            placeholder="Mitglied suchen …"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="filter-grid">
          <select
            aria-label="Geschlecht filtern"
            value={gender}
            onChange={(event) => setGender(event.target.value as Gender | "ALLE")}
          >
            <option value="ALLE">Alle</option>
            <option value="MAENNLICH">Männlich</option>
            <option value="WEIBLICH">Weiblich</option>
          </select>
          <select
            aria-label="Gürtelfarbe filtern"
            value={belt}
            onChange={(event) => setBelt(event.target.value as BeltColor | "ALLE")}
          >
            <option value="ALLE">Alle Gürtel</option>
            {["WEISS", "GELB", "ORANGE", "GRUEN", "BLAU", "BRAUN", "SCHWARZ"].map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <label className="checkbox-filter">
            <input
              checked={trainersOnly}
              type="checkbox"
              onChange={(event) => setTrainersOnly(event.target.checked)}
            />
            Nur Qualifizierte
          </label>
        </div>
        <div className="attendance-counter">
          <span>
            <strong>{presentCount}</strong> anwesend
          </span>
          <span>{visibleMembers.length} sichtbar</span>
        </div>
      </div>
      <div className="member-list">
        {visibleMembers.map((member) => {
          const selection = attendance[member.id];
          const present = selection?.presenceStatus === PresenceStatus.PRESENT;
          const locked = member.id === responsibleId;
          return (
            <article
              className={`${present ? "member-row present" : "member-row"}${locked ? " locked" : ""}`}
              key={member.id}
            >
              <button
                aria-label={
                  locked
                    ? `${member.name} – Verantwortlicher Trainer, immer anwesend`
                    : `${member.name} ${present ? "abwesend setzen" : "anwesend setzen"}`
                }
                className="member-main"
                disabled={locked}
                type="button"
                onClick={() => onToggleAttendance(member.id)}
              >
                <MemberAvatar initials={member.initials} muted={!present} />
                <span>
                  <strong>{member.name}</strong>
                  <small>
                    {locked
                      ? "Verantwortlicher Trainer"
                      : member.gender === "WEIBLICH"
                        ? "Weiblich"
                        : "Männlich"}
                  </small>
                  <BeltMark color={member.beltColor} grade={member.beltGrade} />
                </span>
                <span className={present ? "presence-switch on" : "presence-switch"}>
                  {present ? (
                    <>
                      <Check aria-hidden="true" />
                      Anwesend
                    </>
                  ) : (
                    <>
                      <X aria-hidden="true" />
                      Abwesend
                    </>
                  )}
                </span>
              </button>
              {present ? (
                <select
                  aria-label={`Funktion von ${member.name}`}
                  disabled={locked}
                  value={selection.sessionRole ?? SessionRole.PARTICIPANT}
                  onChange={(event) => onRoleChange(member.id, event.target.value as SessionRole)}
                >
                  <option value={SessionRole.PARTICIPANT}>Teilnehmer</option>
                  {member.qualification !== MemberQualification.NONE ? (
                    <option value={SessionRole.ASSISTANT_TRAINER}>Assistenztrainer</option>
                  ) : null}
                  {member.qualification === MemberQualification.TRAINER ? (
                    <option value={SessionRole.RESPONSIBLE_TRAINER}>
                      Verantwortlicher Trainer
                    </option>
                  ) : null}
                </select>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className="action-stack">
        <PrimaryButton onClick={onReview}>
          Gesamtliste prüfen <ArrowRight aria-hidden="true" />
        </PrimaryButton>
      </div>
    </section>
  );
}

export function GuestScreen({
  guests,
  onAdd,
  onRemove,
  onBack,
}: {
  guests: readonly LocalGuest[];
  onAdd: (guest: Omit<LocalGuest, "id">) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [kind, setKind] = useState<LocalGuest["kind"]>("GAST");
  const submit = () => {
    if (!firstName.trim()) return;
    onAdd({
      firstName: firstName.trim(),
      ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      kind,
    });
    setFirstName("");
    setLastName("");
  };
  return (
    <section>
      <PageHeading
        title="Gäste und Probetraining"
        description="Ausschließlich manuelle lokale Mockerfassung – ohne Biometrie."
        onBack={onBack}
      />
      <div className="demo-notice">
        <ShieldCheck aria-hidden="true" />
        <span>
          Keine Einwilligung, keine Referenzbilder, keine Enrollment-ID und keine Gesichtserkennung.
        </span>
      </div>
      <div className="form-grid">
        <label>
          <span>Vorname oder Anzeigename</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </label>
        <label>
          <span>Nachname · optional</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </label>
        <label>
          <span>Art</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as LocalGuest["kind"])}
          >
            <option value="GAST">Gast</option>
          </select>
        </label>
        <PrimaryButton disabled={!firstName.trim()} onClick={submit}>
          Manuell hinzufügen
        </PrimaryButton>
      </div>
      <div className="guest-list">
        {guests.length === 0 ? (
          <p className="empty-state">Noch keine Gäste erfasst.</p>
        ) : (
          guests.map((guest) => (
            <div
              className="guest-row"
              data-guest-id={guest.id}
              data-testid="guest-row"
              key={guest.id}
            >
              <MemberAvatar initials="G" />
              <span>
                <strong>
                  {guest.firstName} {guest.lastName ?? ""}
                </strong>
                <small>{guest.kind === "GAST" ? "Gast" : "Probetraining"}</small>
              </span>
              <button
                aria-label={`${guest.firstName} entfernen`}
                className="icon-button"
                type="button"
                onClick={() => onRemove(guest.id)}
              >
                <X />
              </button>
            </div>
          ))
        )}
      </div>
      <PrimaryButton onClick={onBack}>Zur Anwesenheitsliste</PrimaryButton>
    </section>
  );
}

export function PhotoDemoScreen({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const startDemo = () => {
    setProcessing(true);
    window.setTimeout(onComplete, 650);
  };
  return (
    <section>
      <PageHeading
        title="Fotoassistenz – Demo"
        description="Drei überlappende Aufnahmebereiche als rein visuelle Simulation."
        onBack={onBack}
      />
      <div className="demo-notice strong">
        <Info aria-hidden="true" />
        <span>
          <strong>Demo – keine Bilder werden aufgenommen oder verarbeitet.</strong>
          <small>Es gibt keinen Kamerazugriff und keine Gesichtserkennung.</small>
        </span>
      </div>
      <div className="capture-zones">
        {["Links", "Mitte", "Rechts"].map((label, index) => (
          <article className="capture-zone" key={label}>
            <div className="abstract-group" aria-hidden="true">
              {Array.from({ length: 5 }, (_, person) => (
                <span key={person} />
              ))}
            </div>
            <div>
              <strong>
                {index + 1}. Bereich {label}
              </strong>
              <StatusTag tone={index === 1 ? "warn" : "good"}>
                {index === 1 ? "Licht prüfen" : "Demoqualität gut"}
              </StatusTag>
            </div>
          </article>
        ))}
      </div>
      {processing ? (
        <div aria-live="polite" className="processing-state">
          <span className="spinner" />
          <strong>Demo-Vorschläge werden lokal vorbereitet …</strong>
        </div>
      ) : null}
      <PrimaryButton disabled={processing} onClick={startDemo}>
        {processing ? "Simulation läuft" : "Demo-Analyse starten"}
      </PrimaryButton>
      <SecondaryButton onClick={onBack}>Stattdessen manuell erfassen</SecondaryButton>
    </section>
  );
}

const proposalLabels: Record<PhotoProposal["status"], string> = {
  EINDEUTIG: "Eindeutiger Vorschlag",
  PRUEFEN: "Bitte prüfen",
  UNBEKANNT: "Unbekannt",
  DUBLETTE: "Mögliche Dublette",
};

const resolutionLabels: Record<NonNullable<PhotoProposal["resolutionAction"]>, string> = {
  PRESELECTED_MEMBER: "Sicher vorausgewählt",
  CONFIRMED_MEMBER: "Person bestätigt",
  SELECTED_MEMBER: "Andere Person gewählt",
  MARKED_UNKNOWN: "Als unbekannt markiert",
  GUEST_CREATED: "Als Gast erfasst",
  DISCARDED: "Verworfen",
};

export function PhotoReviewScreen({
  proposals,
  members,
  onResolve,
  onSummary,
  onManual,
  onBack,
}: {
  proposals: readonly PhotoProposal[];
  members: readonly Member[];
  onResolve: (id: string, action: ProposalDecision, selectedMemberId?: string) => void;
  onSummary: () => void;
  onManual: () => void;
  onBack: () => void;
}) {
  const unresolved = proposals.filter((proposal) => !proposal.resolved).length;
  const [pickerProposalId, setPickerProposalId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerMemberId, setPickerMemberId] = useState<string | null>(null);
  const pickerProposal = proposals.find((proposal) => proposal.id === pickerProposalId);
  const pickerMembers = members.filter((member) =>
    member.name.toLocaleLowerCase("de").includes(pickerSearch.trim().toLocaleLowerCase("de")),
  );
  const openPicker = (proposal: PhotoProposal) => {
    setPickerProposalId(proposal.id);
    setPickerMemberId(proposal.selectedMemberId ?? proposal.candidateMemberId ?? null);
    setPickerSearch("");
  };
  const closePicker = () => {
    setPickerProposalId(null);
    setPickerMemberId(null);
    setPickerSearch("");
  };
  const confirmPicker = () => {
    if (!pickerProposal || !pickerMemberId) return;
    onResolve(pickerProposal.id, "SELECT_MEMBER", pickerMemberId);
    closePicker();
  };
  return (
    <section>
      <PageHeading
        title="Demo-Vorschläge prüfen"
        description="Die Demo macht nur Vorschläge. Die Entscheidung trifft immer der Trainer."
        onBack={onBack}
      />
      <div className="demo-notice compact">
        <Info aria-hidden="true" />
        <span>Keine Bilder wurden aufgenommen oder verarbeitet.</span>
      </div>
      <div className="proposal-list">
        {proposals.map((proposal) => {
          const candidate = members.find((member) => member.id === proposal.candidateMemberId);
          const selectedMember = members.find((member) => member.id === proposal.selectedMemberId);
          const displayedMember = selectedMember ?? candidate;
          return (
            <article
              className={`proposal-row proposal-${proposal.status.toLowerCase()}`}
              data-testid={proposal.id}
              key={proposal.id}
            >
              <div className="face-placeholder" aria-label="Neutraler Gesichtsausschnitt">
                <span />
              </div>
              <div className="proposal-person">
                {displayedMember ? (
                  <MemberAvatar initials={displayedMember.initials} />
                ) : (
                  <MemberAvatar initials="?" muted />
                )}
                <span>
                  <small>{proposalLabels[proposal.status]}</small>
                  <strong>{displayedMember?.name ?? "Keine sichere Zuordnung"}</strong>
                  {displayedMember ? (
                    <BeltMark color={displayedMember.beltColor} grade={displayedMember.beltGrade} />
                  ) : null}
                </span>
              </div>
              <StatusTag
                tone={
                  proposal.resolved ? "good" : proposal.status === "UNBEKANNT" ? "muted" : "warn"
                }
              >
                {proposal.resolutionAction ? resolutionLabels[proposal.resolutionAction] : "Offen"}
              </StatusTag>
              <div className="proposal-actions">
                {!proposal.resolved ? (
                  <>
                    {proposal.status !== "UNBEKANNT" && proposal.candidateMemberId ? (
                      <button type="button" onClick={() => onResolve(proposal.id, "CONFIRM_CANDIDATE")}>
                        Bestätigen
                      </button>
                    ) : null}
                    <button type="button" onClick={() => openPicker(proposal)}>
                      {proposal.status === "UNBEKANNT" ? "Mitglied auswählen" : "Andere Person"}
                    </button>
                    <button type="button" onClick={() => onResolve(proposal.id, "MARK_UNKNOWN")}>
                      Als unbekannt markieren
                    </button>
                    <button type="button" onClick={() => onResolve(proposal.id, "DISCARD")}>
                      Verwerfen
                    </button>
                    <button type="button" onClick={() => onResolve(proposal.id, "CREATE_GUEST")}>
                      Als Gast erfassen
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onResolve(proposal.id, "RESET")}>
                    Entscheidung zurücknehmen
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="review-footer">
        <strong>
          {unresolved === 0 ? "Alle Vorschläge geklärt" : `${unresolved} Vorschläge ungeklärt`}
        </strong>
        <PrimaryButton onClick={onSummary}>Gesamtliste öffnen</PrimaryButton>
        <SecondaryButton onClick={onManual}>Zur manuellen Liste</SecondaryButton>
      </div>
      {pickerProposal ? (
        <div className="member-picker-backdrop">
          <section
            aria-label="Mitglied für Foto-Demovorschlag auswählen"
            aria-modal="true"
            className="member-picker"
            role="dialog"
          >
            <PageHeading
              title={pickerProposal.status === "UNBEKANNT" ? "Mitglied auswählen" : "Andere Person"}
              description="Mitglied antippen zum sofortigen Übernehmen."
            />
            <label className="search-field">
              <Search aria-hidden="true" />
              <input
                aria-label="Mitglied für Vorschlag suchen"
                placeholder="Mitglied suchen …"
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
              />
            </label>
            <div className="member-picker-list">
              {pickerMembers.map((member) => (
                <button
                  className="member-picker-option"
                  key={member.id}
                  type="button"
                  onClick={() => {
                    onResolve(pickerProposal.id, "SELECT_MEMBER", member.id);
                    closePicker();
                  }}
                >
                  <MemberAvatar initials={member.initials} />
                  <span>
                    <strong>{member.name}</strong>
                    <BeltMark color={member.beltColor} grade={member.beltGrade} />
                  </span>
                </button>
              ))}
            </div>
            <div className="action-stack">
              <SecondaryButton onClick={closePicker}>Abbrechen</SecondaryButton>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function SummaryScreen({
  session,
  members,
  attendance,
  guests,
  proposals,
  validationMessages,
  canSave,
  onSave,
  onManual,
  onPhotoReview,
}: {
  session: TrainingSessionMock;
  members: readonly Member[];
  attendance: AttendanceState;
  guests: readonly LocalGuest[];
  proposals: readonly PhotoProposal[];
  validationMessages: readonly string[];
  canSave: boolean;
  onSave: () => void;
  onManual: () => void;
  onPhotoReview: () => void;
}) {
  const byRole = (role: SessionRole) =>
    members.filter(
      (member) =>
        attendance[member.id]?.presenceStatus === PresenceStatus.PRESENT &&
        attendance[member.id]?.sessionRole === role,
    );
  const responsible = byRole(SessionRole.RESPONSIBLE_TRAINER);
  const assistants = byRole(SessionRole.ASSISTANT_TRAINER);
  const participants = byRole(SessionRole.PARTICIPANT);
  const unresolved = proposals.filter((proposal) => !proposal.resolved).length;
  const total = responsible.length + assistants.length + participants.length + guests.length;
  const group = (title: string, values: readonly Member[]) => (
    <section className="summary-group">
      <h2>
        {title}
        <span>{values.length}</span>
      </h2>
      {values.length === 0 ? (
        <p>Keine Personen</p>
      ) : (
        values.map((member) => (
          <div className="summary-person" key={member.id}>
            <MemberAvatar initials={member.initials} />
            <span>{member.name}</span>
            <BeltMark color={member.beltColor} grade={member.beltGrade} />
          </div>
        ))
      )}
    </section>
  );
  return (
    <section>
      <PageHeading
        title="Gesamtliste prüfen"
        description={`${session.name} · ${formatSessionTime(session)} · ${session.dojo}`}
      />
      <div className="summary-total" data-testid="summary-total">
        <span>Gesamt anwesend</span>
        <strong>{total}</strong>
      </div>
      {group("Verantwortlicher Trainer", responsible)}
      {group("Assistenztrainer", assistants)}
      {group("Teilnehmer", participants)}
      <section className="summary-group" data-testid="summary-guests">
        <h2>
          Gäste<span>{guests.length}</span>
        </h2>
        {guests.length === 0 ? (
          <p>Keine Gäste</p>
        ) : (
          guests.map((guest) => (
            <div className="summary-person" key={guest.id}>
              <MemberAvatar initials="G" />
              <span>
                {guest.firstName} {guest.lastName ?? ""}
              </span>
              <StatusTag tone="muted">Manuell</StatusTag>
            </div>
          ))
        )}
      </section>
      <button
        className={unresolved ? "unresolved-box" : "unresolved-box resolved"}
        type="button"
        onClick={onPhotoReview}
      >
        <span>Ungeklärte Foto-Demovorschläge</span>
        <strong>{unresolved}</strong>
        <ChevronRight aria-hidden="true" />
      </button>
      {validationMessages.length ? (
        <div className="validation-box" role="alert">
          <strong>Speichern noch nicht möglich</strong>
          <ul>
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="success-box">
          <CheckCircle2 aria-hidden="true" />
          Liste ist fachlich vollständig und ohne Doppelzählung.
        </div>
      )}
      <div className="action-stack">
        <SecondaryButton onClick={onManual}>Anwesenheit bearbeiten</SecondaryButton>
        <PrimaryButton disabled={!canSave} onClick={onSave}>
          Liste geprüft und speichern
        </PrimaryButton>
      </div>
    </section>
  );
}

export function CompleteScreen({
  session,
  members,
  attendance,
  guests,
  onOverview,
  onNext,
  onHome,
}: {
  session: TrainingSessionMock;
  members: readonly Member[];
  attendance: AttendanceState;
  guests: readonly LocalGuest[];
  onOverview: () => void;
  onNext: () => void;
  onHome: () => void;
}) {
  const present = presentMemberIds(attendance);
  const responsible = present.find(
    (id) => attendance[id]?.sessionRole === SessionRole.RESPONSIBLE_TRAINER,
  );
  const assistants = present.filter(
    (id) => attendance[id]?.sessionRole === SessionRole.ASSISTANT_TRAINER,
  );
  return (
    <section className="completion-screen">
      <CheckCircle2 className="completion-icon" aria-hidden="true" />
      <h1>Liste lokal gespeichert</h1>
      <p>Die Mockspeicherung gilt nur bis zum Neuladen dieser Seite.</p>
      <dl className="completion-details">
        <div>
          <dt>Einheit</dt>
          <dd>{session.name}</dd>
        </div>
        <div>
          <dt>Datum und Zeit</dt>
          <dd>
            {clubDateFormatter.format(session.startsAt)} · {formatSessionTime(session)}
          </dd>
        </div>
        <div>
          <dt>Dojo</dt>
          <dd>{session.dojo}</dd>
        </div>
        <div>
          <dt>Verantwortlich</dt>
          <dd>{responsible ? memberName(members, responsible) : "–"}</dd>
        </div>
        <div>
          <dt>Assistenz</dt>
          <dd>
            {assistants.length
              ? assistants.map((id) => memberName(members, id)).join(", ")
              : "Keine"}
          </dd>
        </div>
        <div>
          <dt>Gesamt</dt>
          <dd>{present.length + guests.length} Personen</dd>
        </div>
      </dl>
      <div className="demo-notice">
        <ShieldCheck aria-hidden="true" />
        <span>
          In der späteren Produktivlösung werden temporäre Bilder unmittelbar nach der Bestätigung
          gelöscht.
        </span>
      </div>
      <PrimaryButton onClick={onOverview}>Übersicht öffnen</PrimaryButton>
      <SecondaryButton onClick={onNext}>Nächste Einheit starten</SecondaryButton>
      <button className="text-button centered" type="button" onClick={onHome}>
        Startseite
      </button>
    </section>
  );
}

export function StatsScreen({
  members,
  onBack,
}: {
  members: readonly Member[];
  onBack: () => void;
}) {
  const ranking = [...members].sort((a, b) => b.trainingsVisited - a.trainingsVisited).slice(0, 10);
  const weekdayData = [
    { label: "Dienstag", value: 38 },
    { label: "Donnerstag", value: 47 },
    { label: "Samstag", value: 29 },
  ];
  return (
    <section>
      <PageHeading
        title="Auswertung · Demo"
        description="Ausschließlich aus lokalen fiktiven Mockdaten und Gürtelstammdaten."
        onBack={onBack}
      />
      <div className="metric-strip">
        <div>
          <strong>40</strong>
          <span>aktive Mitglieder</span>
        </div>
        <div>
          <strong>114</strong>
          <span>Demo-Teilnahmen</span>
        </div>
        <div>
          <strong>18</strong>
          <span>Trainereinsätze</span>
        </div>
      </div>
      <section className="stats-section">
        <h2>Besuchte Trainingseinheiten</h2>
        <div className="ranking-list">
          {ranking.map((member, index) => (
            <div className="ranking-row" key={member.id}>
              <span className="rank">{index + 1}</span>
              <MemberAvatar initials={member.initials} />
              <span>
                <strong>{member.name}</strong>
                <BeltMark color={member.beltColor} grade={member.beltGrade} />
              </span>
              <strong>{member.trainingsVisited}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="stats-section">
        <h2>Verteilung nach Trainingstagen</h2>
        <div className="bar-chart">
          {weekdayData.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <div>
                <i style={{ width: `${item.value * 2}%` }} />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="stats-section">
        <h2>Einsätze nach Funktion</h2>
        <div className="role-stats">
          {members
            .filter((member) => member.qualification !== MemberQualification.NONE)
            .map((member) => (
              <div key={member.id}>
                <MemberAvatar initials={member.initials} />
                <span>
                  <strong>{member.name}</strong>
                  <small>
                    Verantwortlich {member.responsibleAssignments} · Assistenz{" "}
                    {member.assistantAssignments}
                  </small>
                </span>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}

export function ManagementScreen({
  openBeltSuggestionsCount,
  onTrialList,
  onNewMember,
  onBeltReport,
  onBeltSuggestions,
  onRetroEntry,
}: {
  openBeltSuggestionsCount: number;
  onTrialList: () => void;
  onNewMember: () => void;
  onBeltReport: () => void;
  onBeltSuggestions: () => void;
  onRetroEntry: () => void;
}) {
  return (
    <section className="management-screen">
      <PageHeading
        title="Verwaltung"
        description="Mitglieder, Probetraining und Gürtelverwaltung"
      />

      <div className="mgmt-section">
        <h2>Training</h2>
        <button className="mgmt-card" type="button" onClick={onRetroEntry}>
          <History aria-hidden="true" />
          <span>
            <strong>Nachtrag erfassen</strong>
            <small>Anwesenheit für ein vergangenes Training nachträglich eintragen</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="mgmt-section">
        <h2>Probetraining</h2>
        <button className="mgmt-card" type="button" onClick={onTrialList}>
          <Users aria-hidden="true" />
          <span>
            <strong>Probetraining-Liste</strong>
            <small>Teilnehmer verwalten, Vertrag erfassen, Mitglied anlegen</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="mgmt-section">
        <h2>Mitglieder</h2>
        <button className="mgmt-card" type="button" onClick={onNewMember}>
          <UserPlus aria-hidden="true" />
          <span>
            <strong>Neues Mitglied anlegen</strong>
            <small>Direktaufnahme ohne Probetraining</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="mgmt-section">
        <h2>Gürtel</h2>
        <button className="mgmt-card" type="button" onClick={onBeltReport}>
          <Award aria-hidden="true" />
          <span>
            <strong>Gürtelauswertung</strong>
            <small>Gürteleintrag ändern, Gürtelhistorie einsehen</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="mgmt-card" type="button" onClick={onBeltSuggestions}>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Bildvorschläge prüfen</strong>
            <small>
              {openBeltSuggestionsCount > 0
                ? `${openBeltSuggestionsCount} offene Vorschläge`
                : "Keine offenen Vorschläge"}
            </small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function RetroDateSelectScreen({
  onSelect,
  onBack,
}: {
  onSelect: (date: string) => void;
  onBack: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!date) {
      setError("Bitte ein Datum auswählen.");
      return;
    }
    if (date >= today) {
      setError("Das Datum muss in der Vergangenheit liegen.");
      return;
    }
    onSelect(date);
  };

  return (
    <section>
      <PageHeading
        title="Nachtragserfassung"
        description="Anwesenheit für ein vergangenes Training nachträglich eintragen."
        onBack={onBack}
      />
      <div className="demo-notice">
        <Info aria-hidden="true" />
        <span>
          Trainingseinheiten werden für das gewählte Datum generiert. Der vollständige
          Erfassungsworkflow läuft wie gewohnt ab.
        </span>
      </div>
      <div className="form-grid">
        <label>
          <span>Trainingsdatum</span>
          <input
            max={
              new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)
            }
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
      <div className="action-stack">
        <PrimaryButton disabled={!date} onClick={handleContinue}>
          Einheit auswählen <ArrowRight aria-hidden="true" />
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Abbrechen</SecondaryButton>
      </div>
    </section>
  );
}
