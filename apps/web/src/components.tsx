import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { BarChart3, ClipboardCheck, Home, LogOut, Menu, Users } from "lucide-react";

import type { AppScreen, BeltColor } from "./types";

interface AppShellProps extends PropsWithChildren {
  screen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const navItems: ReadonlyArray<{ label: string; screen: AppScreen; icon: typeof Home }> = [
  { label: "Start", screen: "START", icon: Home },
  { label: "Erfassung", screen: "MANUAL", icon: Users },
  { label: "Prüfung", screen: "SUMMARY", icon: ClipboardCheck },
  { label: "Auswertung", screen: "STATS", icon: BarChart3 },
];

export function ToriiMark(): ReactNode {
  return (
    <svg aria-hidden="true" className="torii-mark" viewBox="0 0 48 48">
      <path d="M7 10h34M11 16h26M14 16v24M34 16v24M10 40h28M20 23v17M28 23v17" />
    </svg>
  );
}

export function AppShell({ children, screen, onNavigate }: AppShellProps) {
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
        <button
          aria-label={screen === "LOGIN" ? "Menü" : "Demo abmelden"}
          className="icon-button"
          type="button"
          onClick={() => onNavigate(screen === "LOGIN" ? "START" : "LOGIN")}
        >
          {screen === "LOGIN" ? <Menu /> : <LogOut />}
        </button>
      </header>
      <main className="app-main">{children}</main>
      {hideNav ? null : (
        <nav aria-label="Hauptnavigation" className="bottom-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              screen === item.screen ||
              (item.screen === "MANUAL" &&
                ["LEADERSHIP", "CAPTURE_METHOD", "GUESTS", "PHOTO_DEMO", "PHOTO_REVIEW"].includes(
                  screen,
                ));
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={active ? "nav-item active" : "nav-item"}
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
