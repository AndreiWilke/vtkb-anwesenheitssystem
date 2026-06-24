/**
 * Paket 1.2 + 1.3 – Probetraining-Screens
 *
 * Screens:
 *   TrialListScreen         – Liste aller Probetrainingsteilnehmer
 *   TrialNewScreen          – Neuanlage mit Dublettenpruefung
 *   TrialProfileScreen      – Profilansicht + Teilnahmeverlauf
 *   TrialContractScreen     – Vertragsstatus-Workflow
 *   BoardOverrideScreen     – Vorstandsausnahme erteilen (Paket 1.3)
 *   TrialConversionScreen   – Umwandlung Trial → Mitglied (Paket 1.3)
 *   DirectMemberNewScreen   – Direktanlage Mitglied ohne Probetraining (Paket 1.3)
 *
 * Alle Screens arbeiten mit fiktiven Demo-Daten (kein Netzwerkzugriff).
 * Kein Echtname, keine biometrischen Daten, keine Kinderbilder.
 */

import {
  BELT_CATALOG,
  ContractStatus,
  MemberQualification,
  PersonMembershipStatus,
  TrialOverrideStatus,
  canTransitionContract,
  checkTrialEligibility,
  checkConversionEligibility,
  checkForDuplicates,
  convertTrialParticipantToMember,
  createDirectMember,
  createTrialParticipantIdGenerator,
  grantBoardOverride,
  formatGermanDate,
  isValidGermanDate,
  parseGermanDate,
  type PersonForDuplicateCheck,
} from "@vtkb/shared";
import React, { useState } from "react";

import type {
  AuditEntry,
  ConversionResult,
  DirectMemberResult,
  HistoricalTrainingSession,
  TrialParticipant,
} from "./types";
import {
  buildNewTrialParticipant,
  computeTrialSessionCount,
  getTrialWarning,
} from "./trialWorkflow";
import { createMemberNumberGenerator, createPersonIdGenerator } from "@vtkb/shared";
import { GermanDateInput } from "./components";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function contractStatusLabel(status: string): string {
  switch (status) {
    case ContractStatus.NOT_ISSUED:
      return "Nicht ausgestellt";
    case ContractStatus.ISSUED:
      return "Ausgestellt (ausstehend)";
    case ContractStatus.RECEIVED:
      return "Eingegangen";
    case ContractStatus.MEMBERSHIP_ACTIVATED:
      return "Mitgliedschaft aktiviert";
    default:
      return status;
  }
}

function genderLabel(gender: string): string {
  switch (gender) {
    case "MAENNLICH":
      return "Männlich";
    case "WEIBLICH":
      return "Weiblich";
    default:
      return gender;
  }
}

// ---------------------------------------------------------------------------
// TrialListScreen
// ---------------------------------------------------------------------------

interface TrialListScreenProps {
  participants: readonly TrialParticipant[];
  history: readonly HistoricalTrainingSession[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
}

export function TrialListScreen({
  participants,
  history,
  onSelect,
  onNew,
  onBack,
}: TrialListScreenProps) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "BLOCKED">("ACTIVE");

  const displayed = participants.filter((p) => {
    if (filter === "ACTIVE") return p.active && p.membershipStatus === PersonMembershipStatus.TRIAL;
    if (filter === "BLOCKED") {
      const { attended } = computeTrialSessionCount(p.id, history);
      return (
        p.active &&
        !checkTrialEligibility({
          attendedCount: attended,
          contractStatus: p.contractStatus,
          membershipStatus: p.membershipStatus,
          overrideStatus: p.overrideStatus,
          overrideUsed: p.overrideUsed,
        }).allowed
      );
    }
    return true;
  });

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Probetraining</h1>
        <button className="btn-primary" onClick={onNew}>
          + Neu
        </button>
      </header>

      <div className="filter-tabs">
        {(["ACTIVE", "BLOCKED", "ALL"] as const).map((f) => (
          <button
            key={f}
            className={`filter-tab${filter === f ? " filter-tab--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ACTIVE" ? "Aktiv" : f === "BLOCKED" ? "Gesperrt" : "Alle"}
          </button>
        ))}
      </div>

      <ul className="trial-list">
        {displayed.length === 0 && <li className="trial-list__empty">Keine Einträge.</li>}
        {displayed.map((p) => {
          const { attended, remaining } = computeTrialSessionCount(p.id, history);
          const warning = getTrialWarning(p, history);
          return (
            <li
              key={p.id}
              className={`trial-list__item${warning?.kind === "BLOCKED" ? " trial-list__item--blocked" : ""}`}
              onClick={() => onSelect(p.id)}
            >
              <div className="trial-list__name">{p.displayName}</div>
              <div className="trial-list__meta">
                {genderLabel(p.gender)} · {p.birthDate.slice(0, 4)} · {attended}/{4} Einheiten
                {remaining > 0 && ` (${remaining} verbl.)`}
              </div>
              <div className="trial-list__status">
                {contractStatusLabel(p.contractStatus)}
                {warning?.kind === "BLOCKED" && (
                  <span className="badge badge--error"> ⛔ Gesperrt</span>
                )}
                {warning?.kind === "CONTRACT_NEEDED" && (
                  <span className="badge badge--warn"> ⚠ Vertrag vorbereiten</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialNewScreen
// ---------------------------------------------------------------------------

interface TrialNewScreenProps {
  existingParticipants: readonly TrialParticipant[];
  existingPersons: readonly PersonForDuplicateCheck[];
  onSave: (participant: TrialParticipant) => void;
  onBack: () => void;
  /** Nur BOARD darf Dubletten bewusst ueberschreiben */
  isBoard: boolean;
}

interface NewForm {
  firstName: string;
  lastName: string;
  gender: "MAENNLICH" | "WEIBLICH";
  birthDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string;
}

const emptyForm: NewForm = {
  firstName: "",
  lastName: "",
  gender: "MAENNLICH",
  birthDate: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  note: "",
};

export function TrialNewScreen({
  existingParticipants,
  existingPersons,
  onSave,
  onBack,
  isBoard,
}: TrialNewScreenProps) {
  const [form, setForm] = useState<NewForm>(emptyForm);
  const [duplicates, setDuplicates] = useState<PersonForDuplicateCheck[]>([]);
  const [forceCreate, setForceCreate] = useState(false);
  const [errors, setErrors] = useState<Partial<NewForm>>({});

  function validate(): boolean {
    const errs: Partial<NewForm> = {};
    if (!form.firstName.trim()) errs.firstName = "Pflichtfeld";
    if (!form.lastName.trim()) errs.lastName = "Pflichtfeld";
    if (!isValidGermanDate(form.birthDate)) {
      errs.birthDate = "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleCheck() {
    if (!validate()) return;
    const result = checkForDuplicates(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: parseGermanDate(form.birthDate)!,
      },
      existingPersons,
    );
    if (result.hasProbableDuplicate && !forceCreate) {
      setDuplicates(result.matches);
    } else {
      handleCreate();
    }
  }

  function handleCreate() {
    const birthDate = parseGermanDate(form.birthDate);
    if (!birthDate) {
      setErrors((current) => ({
        ...current,
        birthDate: "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.",
      }));
      return;
    }
    const nextId = createTrialParticipantIdGenerator(existingParticipants.map((p) => p.id));
    const id = nextId();
    const participant = buildNewTrialParticipant(
      id,
      {
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        birthDate,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        note: form.note || undefined,
      },
      new Date().toISOString(),
    );
    onSave(participant);
  }

  function field(key: keyof NewForm, label: string, type = "text") {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setDuplicates([]);
      setForceCreate(false);
    };
    return (
      <label className="form-field">
        <span className="form-field__label">{label}</span>
        {type === "date" ? (
          <GermanDateInput
            aria-label={label}
            className={`form-field__input${errors[key] ? " form-field__input--error" : ""}`}
            value={form[key]}
            onChange={handleChange}
          />
        ) : (
          <input
            className={`form-field__input${errors[key] ? " form-field__input--error" : ""}`}
            type={type}
            value={form[key]}
            onChange={handleChange}
          />
        )}
        {errors[key] && <span className="form-field__error">{errors[key]}</span>}
      </label>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Neues Probetraining</h1>
      </header>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleCheck();
        }}
      >
        <fieldset className="form-group">
          <legend>Personalien</legend>
          {field("firstName", "Vorname")}
          {field("lastName", "Nachname")}
          <label className="form-field">
            <span className="form-field__label">Geschlecht</span>
            <select
              className="form-field__input"
              value={form.gender}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gender: e.target.value as "MAENNLICH" | "WEIBLICH" }))
              }
            >
              <option value="MAENNLICH">Männlich</option>
              <option value="WEIBLICH">Weiblich</option>
            </select>
          </label>
          {field("birthDate", "Geburtsdatum", "date")}
          {field("contactPhone", "Telefonnummer", "tel")}
        </fieldset>

        <fieldset className="form-group">
          <legend>Kontakt (optional)</legend>
          {field("contactName", "Kontaktperson")}
          {field("contactEmail", "E-Mail")}
        </fieldset>

        {field("note", "Notiz (optional)")}

        {duplicates.length > 0 && (
          <div className="duplicate-warning">
            <p className="duplicate-warning__title">⚠ Mögliche Dublette erkannt:</p>
            <ul>
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.firstName} {d.lastName} ({d.birthDate.slice(0, 4)})
                </li>
              ))}
            </ul>
            {isBoard ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setForceCreate(true);
                  handleCreate();
                }}
              >
                Trotzdem neu anlegen (Vorstand)
              </button>
            ) : (
              <p className="duplicate-warning__note">
                Nur der Vorstand kann eine bewusste Neuanlage trotz Dublette durchführen.
              </p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Anlegen & Dublette prüfen
          </button>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialProfileScreen
// ---------------------------------------------------------------------------

interface TrialProfileScreenProps {
  participant: TrialParticipant;
  history: readonly HistoricalTrainingSession[];
  onContractView: () => void;
  onBoardOverride?: () => void;
  onConvert?: () => void;
  onBack: () => void;
}

export function TrialProfileScreen({
  participant,
  history,
  onContractView,
  onBoardOverride,
  onConvert,
  onBack,
}: TrialProfileScreenProps) {
  const { attended, remaining } = computeTrialSessionCount(participant.id, history);
  const warning = getTrialWarning(participant, history);

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>{participant.displayName}</h1>
      </header>

      {warning && (
        <div className={`notice notice--${warning.kind === "BLOCKED" ? "error" : "warn"}`}>
          {warning.message}
        </div>
      )}

      <section className="detail-section">
        <h2 className="detail-section__title">Stammdaten</h2>
        <dl className="detail-list">
          <dt>Geschlecht</dt>
          <dd>{genderLabel(participant.gender)}</dd>
          <dt>Geburtsdatum</dt>
          <dd>{formatGermanDate(participant.birthDate)}</dd>
          <dt>Erstellt am</dt>
          <dd>{formatGermanDate(participant.createdAt.slice(0, 10))}</dd>
          {participant.beltColor && (
            <>
              <dt>Gürtel</dt>
              <dd>
                {participant.beltColor} – {participant.beltGrade}
              </dd>
            </>
          )}
          {participant.note && (
            <>
              <dt>Notiz</dt>
              <dd>{participant.note}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="detail-section">
        <h2 className="detail-section__title">Probetraining</h2>
        <dl className="detail-list">
          <dt>Besuchte Einheiten</dt>
          <dd>
            <div className="progress-bar" aria-label={`${attended} von 4 Einheiten`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`progress-bar__segment${i < attended ? " progress-bar__segment--filled" : ""}`}
                />
              ))}
            </div>
            {attended} / 4 (noch {remaining} kostenfrei)
          </dd>
          <dt>Erstes Training</dt>
          <dd>{participant.firstTrialDate ? formatGermanDate(participant.firstTrialDate) : "–"}</dd>
          <dt>Letztes Training</dt>
          <dd>{participant.lastTrialDate ? formatGermanDate(participant.lastTrialDate) : "–"}</dd>
        </dl>

        {participant.overrideStatus === TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED && (
          <div className="notice notice--info">
            Vorstandsausnahme genehmigt
            {participant.overrideReason ? `: ${participant.overrideReason}` : ""}. Status:{" "}
            {participant.overrideUsed ? "bereits genutzt" : "noch nicht genutzt"}.
          </div>
        )}
      </section>

      <section className="detail-section">
        <h2 className="detail-section__title">Vertrag</h2>
        <p>{contractStatusLabel(participant.contractStatus)}</p>
        <button className="btn-secondary" onClick={onContractView}>
          Vertragsstatus verwalten →
        </button>
        {onConvert && participant.membershipStatus === PersonMembershipStatus.TRIAL ? (
          <button className="btn-secondary" onClick={onConvert}>
            Profil in Mitglied umwandeln →
          </button>
        ) : null}
        {onBoardOverride && participant.membershipStatus === PersonMembershipStatus.TRIAL ? (
          <button className="btn-secondary" onClick={onBoardOverride}>
            Vorstandsausnahme prüfen →
          </button>
        ) : null}
      </section>

      {participant.contactName || participant.contactEmail || participant.contactPhone ? (
        <section className="detail-section">
          <h2 className="detail-section__title">Kontakt</h2>
          <dl className="detail-list">
            {participant.contactName && (
              <>
                <dt>Person</dt>
                <dd>{participant.contactName}</dd>
              </>
            )}
            {participant.contactPhone && (
              <>
                <dt>Telefon</dt>
                <dd>{participant.contactPhone}</dd>
              </>
            )}
            {participant.contactEmail && (
              <>
                <dt>E-Mail</dt>
                <dd>{participant.contactEmail}</dd>
              </>
            )}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialContractScreen
// ---------------------------------------------------------------------------

interface TrialContractScreenProps {
  participant: TrialParticipant;
  onUpdate: (updated: TrialParticipant) => void;
  onBack: () => void;
  /** Nur BOARD darf Vertrag aktivieren */
  isBoard: boolean;
}

const CONTRACT_STEPS = [
  ContractStatus.NOT_ISSUED,
  ContractStatus.ISSUED,
  ContractStatus.RECEIVED,
  ContractStatus.MEMBERSHIP_ACTIVATED,
] as const;

export function TrialContractScreen({
  participant,
  onUpdate,
  onBack,
  isBoard,
}: TrialContractScreenProps) {
  function advance() {
    const currentIdx = CONTRACT_STEPS.indexOf(participant.contractStatus);
    const next = CONTRACT_STEPS[currentIdx + 1];
    if (!next) return;
    if (!canTransitionContract(participant.contractStatus, next)) return;
    if (next === ContractStatus.MEMBERSHIP_ACTIVATED && !isBoard) return;
    onUpdate({
      ...participant,
      contractStatus: next,
      membershipStatus:
        next === ContractStatus.MEMBERSHIP_ACTIVATED
          ? PersonMembershipStatus.ACTIVE_MEMBER
          : participant.membershipStatus,
    });
  }

  function retract() {
    if (!canTransitionContract(participant.contractStatus, ContractStatus.NOT_ISSUED)) return;
    onUpdate({ ...participant, contractStatus: ContractStatus.NOT_ISSUED });
  }

  const currentIdx = CONTRACT_STEPS.indexOf(participant.contractStatus);
  const nextStep = CONTRACT_STEPS[currentIdx + 1];
  const nextStepLabel = nextStep ? contractStatusLabel(nextStep) : null;
  const canAdvance =
    !!nextStep &&
    canTransitionContract(participant.contractStatus, nextStep) &&
    (nextStep !== ContractStatus.MEMBERSHIP_ACTIVATED || isBoard);

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Vertragsmanagement</h1>
      </header>

      <p className="screen-subtitle">{participant.displayName}</p>

      <ol className="contract-steps">
        {CONTRACT_STEPS.map((step, idx) => (
          <li
            key={step}
            className={`contract-step${idx < currentIdx ? " contract-step--done" : ""}${idx === currentIdx ? " contract-step--current" : ""}`}
          >
            {contractStatusLabel(step)}
            {idx === currentIdx && <span className="contract-step__badge"> ← aktuell</span>}
          </li>
        ))}
      </ol>

      <div className="form-actions">
        {canAdvance ? (
          <button className="btn-primary" onClick={advance}>
            Weiter: {nextStepLabel}
          </button>
        ) : null}
        {participant.contractStatus === ContractStatus.ISSUED && (
          <button className="btn-secondary" onClick={retract}>
            Zurücksetzen auf „Nicht ausgestellt"
          </button>
        )}
        {nextStep === ContractStatus.MEMBERSHIP_ACTIVATED && !isBoard && (
          <p className="notice notice--info">
            Nur der Vorstand kann die Mitgliedschaft aktivieren.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paket 1.3 – BoardOverrideScreen
// ---------------------------------------------------------------------------

interface BoardOverrideScreenProps {
  participant: TrialParticipant;
  attendedTrialCount: number;
  onSave: (updated: TrialParticipant, audit: AuditEntry) => void;
  onBack: () => void;
}

export function BoardOverrideScreen({
  participant,
  attendedTrialCount,
  onSave,
  onBack,
}: BoardOverrideScreenProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const alreadyGranted =
    participant.overrideStatus === TrialOverrideStatus.ONE_ADDITIONAL_SESSION_APPROVED;

  function handleGrant() {
    if (!reason.trim()) {
      setError("Bitte eine Begründung eingeben.");
      return;
    }
    try {
      const result = grantBoardOverride({
        participant,
        attendedTrialCount,
        grantedBy: "Vorstand Demo",
        grantedAt: new Date().toISOString(),
        reason: reason.trim(),
      });
      onSave(result.updatedParticipant, result.auditEntry);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Vorstandsausnahme</h1>
      </header>

      <p className="screen-subtitle">{participant.displayName}</p>

      {alreadyGranted ? (
        <div className="notice notice--info">
          <strong>Ausnahme bereits erteilt.</strong>
          <br />
          Grund: {participant.overrideReason ?? "–"}
          <br />
          Von: {participant.overrideGrantedBy ?? "–"}
          <br />
          Status: {participant.overrideUsed ? "⚠ bereits genutzt" : "✓ noch nicht genutzt"}
        </div>
      ) : (
        <>
          <div className="notice notice--warn">
            Die Vorstandsausnahme erlaubt <strong>genau eine</strong> weitere kostenlose
            Probeeinheit über das reguläre Limit von 4 hinaus. Sie kann pro Person nur einmal
            erteilt werden.
          </div>
          <p className="screen-subtitle">
            Nachgewiesene reguläre Besuche: {attendedTrialCount} von 4. Eine Erteilung ist nur exakt
            nach dem vierten Besuch möglich.
          </p>

          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleGrant();
            }}
          >
            <label className="form-field">
              <span className="form-field__label">Begründung (Pflicht)</span>
              <textarea
                className={`form-field__input form-field__textarea${error ? " form-field__input--error" : ""}`}
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                placeholder="z. B. Terminkonflikt beim Vertragseingang, Krankheit..."
              />
              {error && <span className="form-field__error">{error}</span>}
            </label>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={attendedTrialCount !== 4}>
                Ausnahme erteilen
              </button>
              <button type="button" className="btn-secondary" onClick={onBack}>
                Abbrechen
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paket 1.3 – TrialConversionScreen
// ---------------------------------------------------------------------------

interface TrialConversionScreenProps {
  participant: TrialParticipant;
  existingMemberNumbers: readonly string[];
  history: readonly HistoricalTrainingSession[];
  onConvert: (result: ConversionResult) => void;
  onBack: () => void;
}

export function TrialConversionScreen({
  participant,
  existingMemberNumbers,
  history,
  onConvert,
  onBack,
}: TrialConversionScreenProps) {
  const eligibility = checkConversionEligibility(participant);
  const { attended } = computeTrialSessionCount(participant.id, history);
  const [qualification, setQualification] = useState<string>(MemberQualification.NONE);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  function handleConvert() {
    if (!confirmed) return;
    const nextMemberNumber = createMemberNumberGenerator(existingMemberNumbers)();
    try {
      const result = convertTrialParticipantToMember({
        participant,
        memberNumber: nextMemberNumber,
        existingMemberNumbers,
        qualification:
          qualification as (typeof MemberQualification)[keyof typeof MemberQualification],
        convertedBy: "Vorstand Demo",
        convertedAt: new Date().toISOString(),
        note: note.trim() || undefined,
      });
      onConvert(result);
    } catch (err) {
      console.error(err);
    }
  }

  if (!eligibility.eligible) {
    return (
      <div className="screen">
        <header className="screen-header">
          <button className="btn-back" onClick={onBack}>
            ← Zurück
          </button>
          <h1>Umwandlung zum Mitglied</h1>
        </header>
        <div className="notice notice--error">Umwandlung nicht möglich: {eligibility.reason}</div>
        <button className="btn-secondary" onClick={onBack}>
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Umwandlung zum Mitglied</h1>
      </header>

      <p className="screen-subtitle">{participant.displayName}</p>

      <section className="detail-section">
        <h2 className="detail-section__title">Probetraining-Zusammenfassung</h2>
        <dl className="detail-list">
          <dt>Besuchte Einheiten</dt>
          <dd>{attended}</dd>
          <dt>Erstes Training</dt>
          <dd>{participant.firstTrialDate ? formatGermanDate(participant.firstTrialDate) : "–"}</dd>
          <dt>Letztes Training</dt>
          <dd>{participant.lastTrialDate ? formatGermanDate(participant.lastTrialDate) : "–"}</dd>
          <dt>Vertragsstatus</dt>
          <dd>{participant.contractStatus}</dd>
          {participant.beltColor && (
            <>
              <dt>Gürtel</dt>
              <dd>
                {participant.beltColor} – {participant.beltGrade}
              </dd>
            </>
          )}
        </dl>
      </section>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleConvert();
        }}
      >
        <label className="form-field">
          <span className="form-field__label">Qualifikation</span>
          <select
            className="form-field__input"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
          >
            <option value={MemberQualification.NONE}>Keine (Teilnehmer)</option>
            <option value={MemberQualification.ASSISTANT_TRAINER}>Assistenztrainer</option>
            <option value={MemberQualification.TRAINER}>Trainer</option>
          </select>
        </label>

        <label className="form-field">
          <span className="form-field__label">Notiz zur Umwandlung (optional)</span>
          <input
            className="form-field__input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <label className="form-field form-field--checkbox">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            Ich bestätige die Umwandlung von <strong>{participant.displayName}</strong> zum
            regulären Mitglied. Die gesamte Anwesenheitshistorie bleibt erhalten.
          </span>
        </label>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={!confirmed}>
            Jetzt umwandeln
          </button>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paket 1.3 – DirectMemberNewScreen
// ---------------------------------------------------------------------------

interface DirectMemberNewScreenProps {
  existingMemberIds: readonly string[];
  existingMemberNumbers: readonly string[];
  existingPersons: readonly PersonForDuplicateCheck[];
  onSave: (result: DirectMemberResult, audit: AuditEntry) => void;
  onBack: () => void;
}

interface DirectForm {
  firstName: string;
  lastName: string;
  gender: "MAENNLICH" | "WEIBLICH";
  birthDate: string;
  contactPhone: string;
  beltIndex: string;
  qualification: string;
  note: string;
}

const emptyDirectForm: DirectForm = {
  firstName: "",
  lastName: "",
  gender: "MAENNLICH",
  birthDate: "",
  contactPhone: "",
  beltIndex: "0",
  qualification: MemberQualification.NONE,
  note: "",
};

export function DirectMemberNewScreen({
  existingMemberIds,
  existingMemberNumbers,
  existingPersons,
  onSave,
  onBack,
}: DirectMemberNewScreenProps) {
  const [form, setForm] = useState<DirectForm>(emptyDirectForm);
  const [errors, setErrors] = useState<Partial<DirectForm>>({});

  function validate(): boolean {
    const errs: Partial<DirectForm> = {};
    if (!form.firstName.trim()) errs.firstName = "Pflichtfeld";
    if (!form.lastName.trim()) errs.lastName = "Pflichtfeld";
    if (!isValidGermanDate(form.birthDate)) {
      errs.birthDate = "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const birthDate = parseGermanDate(form.birthDate);
    if (!birthDate) return;
    const beltEntry = BELT_CATALOG[Number(form.beltIndex)] ?? BELT_CATALOG[0];
    const nextId = createPersonIdGenerator(existingMemberIds)();
    const nextNumber = createMemberNumberGenerator(existingMemberNumbers)();
    try {
      const result = createDirectMember({
        id: nextId,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        birthDate,
        contactPhone: form.contactPhone || undefined,
        beltColor: beltEntry?.color,
        beltGrade: beltEntry?.grade,
        qualification:
          form.qualification as (typeof MemberQualification)[keyof typeof MemberQualification],
        memberNumber: nextNumber,
        existingPersonIds: existingMemberIds,
        existingMemberNumbers,
        existingPersons,
        createdBy: "Vorstand Demo",
        createdAt: new Date().toISOString(),
        note: form.note || undefined,
      });
      onSave(result, result.auditEntry);
    } catch (err) {
      console.error(err);
    }
  }

  function field(key: keyof DirectForm, label: string, type = "text") {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
    return (
      <label className="form-field">
        <span className="form-field__label">{label}</span>
        {type === "date" ? (
          <GermanDateInput
            aria-label={label}
            className={`form-field__input${errors[key] ? " form-field__input--error" : ""}`}
            value={form[key]}
            onChange={handleChange}
          />
        ) : (
          <input
            className={`form-field__input${errors[key] ? " form-field__input--error" : ""}`}
            type={type}
            value={form[key]}
            onChange={handleChange}
          />
        )}
        {errors[key] && <span className="form-field__error">{errors[key]}</span>}
      </label>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>Direkt-Mitglied anlegen</h1>
      </header>

      <div className="notice notice--info">
        Direkte Mitgliedsanlage ohne Probetraining – z. B. bei Vereinswechsel oder
        Vorstandseinladung.
      </div>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <fieldset className="form-group">
          <legend>Personalien</legend>
          {field("firstName", "Vorname")}
          {field("lastName", "Nachname")}
          <label className="form-field">
            <span className="form-field__label">Geschlecht</span>
            <select
              className="form-field__input"
              value={form.gender}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gender: e.target.value as "MAENNLICH" | "WEIBLICH" }))
              }
            >
              <option value="MAENNLICH">Männlich</option>
              <option value="WEIBLICH">Weiblich</option>
            </select>
          </label>
          {field("birthDate", "Geburtsdatum", "date")}
          {field("contactPhone", "Telefonnummer", "tel")}
        </fieldset>

        <fieldset className="form-group">
          <legend>Karate</legend>
          <label className="form-field">
            <span className="form-field__label">Gürtel</span>
            <select
              className="form-field__input"
              value={form.beltIndex}
              onChange={(e) => setForm((prev) => ({ ...prev, beltIndex: e.target.value }))}
            >
              {BELT_CATALOG.map((level, idx) => (
                <option key={idx} value={idx}>
                  {level.grade} – {level.color.replace("_", "-")}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Qualifikation</span>
            <select
              className="form-field__input"
              value={form.qualification}
              onChange={(e) => setForm((prev) => ({ ...prev, qualification: e.target.value }))}
            >
              <option value={MemberQualification.NONE}>Keine (Teilnehmer)</option>
              <option value={MemberQualification.ASSISTANT_TRAINER}>Assistenztrainer</option>
              <option value={MemberQualification.TRAINER}>Trainer</option>
            </select>
          </label>
        </fieldset>

        {field("note", "Notiz (optional)")}

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Mitglied anlegen
          </button>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
