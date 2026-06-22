import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { BarChart3, ClipboardCheck, Home, LogOut, Menu, Settings, Users } from "lucide-react";
import { DemoRole, type DemoRole as DemoRoleValue } from "@vtkb/shared";

import type { AppScreen, BeltColor } from "./types";

interface AppShellProps extends PropsWithChildren {
  screen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  reviewEnabled: boolean;
  demoRole: DemoRoleValue;
  onDemoRoleChange: (role: DemoRoleValue) => void;
}

const MANAGEMENT_SCREENS: readonly AppScreen[] = [
  "MANAGEMENT",
  "TRIAL_LIST", "TRIAL_NEW", "TRIAL_PROFILE", "TRIAL_CONTRACT",
  "TRIAL_BOARD_OVERRIDE", "TRIAL_CONVERT", "MEMBER_DIRECT_NEW",
  "BELT_HISTORY", "BELT_CHANGE", "BELT_SIM_DEMO", "BELT_SUGGESTION_REVIEW",
];

const BASE_NAV: ReadonlyArray<{ label: string; screen: AppScreen; icon: typeof Home }> = [
  { label: "Start", screen: "START", icon: Home },
  { label: "Erfassung", screen: "MANUAL", icon: Users },
  { label: "Prüfung", screen: "SUMMARY", icon: ClipboardCheck },
  { label: "Auswertung", screen: "STATS", icon: BarChart3 },
];

const MGMT_NAV_ITEM = { label: "Verwaltung", screen: "MANAGEMENT" as AppScreen, icon: Settings };

export function ToriiMark(): ReactNode {
  return (
    <svg aria-hidden="true" className="torii-mark" viewBox="0 0 48 48">
      <path d="M7 10h34M11 16h26M14 16v24M34 16v24M10 40h28M20 23v17M28 23v17" />
    </svg>
  );
}

export function AppShell({
  children,
  reviewEnabled,
  screen,
  demoRole,
  onDemoRoleChange,
  onNavigate,
}: AppShellProps) {
  const hideNav = screen === "LOGIN";
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => onNavigate("START")}>
          <ToriiMark />
          <span>
            <strong>VTKB Berlin</strong>
            <small>Anwesenheit · lokale Demo</small>
          </span>
        </button>
        <div className="header-actions">
          {screen === "LOGIN" ? null : (
            <label className="demo-role-switch">
              <span>Demo-Rolle</span>
              <select
                aria-label="Demo-Rolle wechseln"
                value={demoRole}
                onChange={(event) => onDemoRoleChange(event.target.value as DemoRoleValue)}
              >
                <option value={DemoRole.BOARD}>Vorstand</option>
                <option value={DemoRole.TRAINER}>Trainer</option>
                <option value={DemoRole.TREASURER}>Kassenwart</option>
              </select>
            </label>
          )}
          <button
            aria-label={screen === "LOGIN" ? "Menü" : "Demo abmelden"}
            className="icon-button"
            type="button"
            onClick={() => onNavigate(screen === "LOGIN" ? "START" : "LOGIN")}
          >
            {screen === "LOGIN" ? <Menu /> : <LogOut />}
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {hideNav ? null : (
        <nav aria-label="Hauptnavigation" className="bottom-nav">
          {[
            ...BASE_NAV,
            ...(demoRole === DemoRole.BOARD || demoRole === DemoRole.TRAINER
              ? [MGMT_NAV_ITEM]
              : []),
          ].map((item) => {
            const Icon = item.icon;
            const disabled = item.screen === "SUMMARY" && !reviewEnabled;
            const active =
              screen === item.screen ||
              (item.screen === "MANUAL" &&
                ["LEADERSHIP", "CAPTURE_METHOD", "GUESTS", "PHOTO_DEMO", "PHOTO_REVIEW"].includes(
                  screen,
                )) ||
              (item.screen === "MANAGEMENT" && MANAGEMENT_SCREENS.includes(screen));
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={active ? "nav-item active" : "nav-item"}
                disabled={disabled}
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.screen)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  backLabel,
  onBack,
}: {
  title: string;
  description?: string;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <div className="page-heading">
      {onBack ? (
        <button className="text-button" type="button" onClick={onBack}>
          ← {backLabel ?? "Zurück"}
        </button>
      ) : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function PrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`primary-button ${className}`.trim()} type="button" {...props} />;
}

export function SecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`secondary-button ${className}`.trim()} type="button" {...props} />;
}

export function MemberAvatar({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return <span className={muted ? "avatar muted" : "avatar"}>{initials}</span>;
}

const beltLabels: Record<BeltColor, string> = {
  WEISS: "Weiß",
  GELB: "Gelb",
  ORANGE: "Orange",
  GRUEN: "Grün",
  BLAU: "Blau",
  BRAUN: "Braun",
  SCHWARZ: "Schwarz",
};

export function BeltMark({ color, grade }: { color: BeltColor; grade: string }) {
  return (
    <span className="belt-mark">
      <span aria-hidden="true" className={`belt-dot belt-${color.toLowerCase()}`} />
      <span>
        {beltLabels[color]} · {grade}
      </span>
    </span>
  );
}

export function StatusTag({
  tone,
  children,
}: PropsWithChildren<{ tone: "good" | "warn" | "muted" | "red" }>) {
  return <span className={`status-tag ${tone}`}>{children}</span>;
}
