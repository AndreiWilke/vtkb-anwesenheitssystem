// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(() => cleanup());

async function openCaptureMethod(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Training starten/ }));
  await user.click(screen.getByRole("button", { name: /Erfassungsart wählen/ }));
}

async function openManualAttendance(user: ReturnType<typeof userEvent.setup>) {
  await openCaptureMethod(user);
  await user.click(screen.getByRole("button", { name: /Manuell erfassen/ }));
}

describe("klickbarer Paket-1-Prototyp", () => {
  it("rendert auf der Startseite eine vorgeschlagene Einheit", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("Vorgeschlagen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Training starten/ })).toBeEnabled();
  });

  it("schaltet die manuelle Anwesenheit per Antippen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openManualAttendance(user);
    const toggle = screen.getByRole("button", { name: "Maro Beispiel anwesend setzen" });
    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Maro Beispiel abwesend setzen" }),
    ).toBeInTheDocument();
  });

  it("erfasst einen Gast manuell ohne biometrische Felder", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openManualAttendance(user);
    await user.click(screen.getByRole("button", { name: /Gäste und Probetraining/ }));
    await user.type(screen.getByLabelText("Vorname oder Anzeigename"), "Gast A");
    await user.click(screen.getByRole("button", { name: "Manuell hinzufügen" }));
    expect(screen.getByText("Gast A")).toBeInTheDocument();
    expect(
      screen.getByText(/Keine Einwilligung, keine Referenzbilder, keine Enrollment-ID/),
    ).toBeInTheDocument();
  });

  it("blockiert die Speicherung mit offenen Foto-Demovorschlaegen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCaptureMethod(user);
    await user.click(screen.getByRole("button", { name: /Fotoassistenz – nur Demo/ }));
    expect(
      screen.getByText(/keine Bilder werden aufgenommen oder verarbeitet/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Demo-Analyse starten" }));
    await waitFor(
      () =>
        expect(screen.getByRole("heading", { name: "Demo-Vorschläge prüfen" })).toBeInTheDocument(),
      { timeout: 1500 },
    );
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(screen.getByRole("button", { name: "Liste geprüft und speichern" })).toBeDisabled();
    expect(screen.getByText(/Foto-Demovorschlag/)).toBeInTheDocument();
  });

  it("speichert eine gueltige manuelle Liste lokal", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openManualAttendance(user);
    await user.click(screen.getByRole("button", { name: /Gesamtliste prüfen/ }));
    const save = screen.getByRole("button", { name: "Liste geprüft und speichern" });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(screen.getByRole("heading", { name: "Liste lokal gespeichert" })).toBeInTheDocument();
  });

  it("stellt die mobile Hauptnavigation bereit", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(nav).toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    expect(screen.getByRole("heading", { name: "Auswertung · Demo" })).toBeInTheDocument();
  });
});
