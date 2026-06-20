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

async function openPhotoReview(user: ReturnType<typeof userEvent.setup>) {
  await openCaptureMethod(user);
  await user.click(screen.getByRole("button", { name: /Fotoassistenz – nur Demo/ }));
  await user.click(screen.getByRole("button", { name: "Demo-Analyse starten" }));
  await waitFor(
    () =>
      expect(screen.getByRole("heading", { name: "Demo-Vorschläge prüfen" })).toBeInTheDocument(),
    { timeout: 1500 },
  );
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

  it("vergibt nach Entfernen und erneutem Hinzufügen weiterhin eindeutige Gast-IDs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openManualAttendance(user);
    await user.click(screen.getByRole("button", { name: /Gäste und Probetraining/ }));

    const nameInput = screen.getByLabelText("Vorname oder Anzeigename");
    await user.type(nameInput, "Gast Eins");
    await user.click(screen.getByRole("button", { name: "Manuell hinzufügen" }));
    await user.type(nameInput, "Gast Zwei");
    await user.click(screen.getByRole("button", { name: "Manuell hinzufügen" }));
    const firstIds = screen
      .getAllByTestId("guest-row")
      .map((row) => row.getAttribute("data-guest-id"));
    await user.click(screen.getByRole("button", { name: "Gast Eins entfernen" }));
    await user.type(nameInput, "Gast Drei");
    await user.click(screen.getByRole("button", { name: "Manuell hinzufügen" }));
    const finalIds = screen
      .getAllByTestId("guest-row")
      .map((row) => row.getAttribute("data-guest-id"));

    expect(new Set([...firstIds, ...finalIds]).size).toBe(3);
    expect(finalIds).toEqual(["guest-002", "guest-003"]);
    await user.click(screen.getByRole("button", { name: "Zur Anwesenheitsliste" }));
    await user.click(screen.getByRole("button", { name: /Gesamtliste prüfen/ }));
    expect(screen.getByRole("button", { name: "Liste geprüft und speichern" })).toBeEnabled();
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
    await user.click(screen.getByRole("button", { name: "Maro Beispiel anwesend setzen" }));
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

  it("verhindert das Umgehen der Erfassung über die Hauptnavigation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(within(nav).getByRole("button", { name: "Prüfung" })).toBeDisabled();
    await user.click(within(nav).getByRole("button", { name: "Erfassung" }));
    expect(screen.getByRole("heading", { name: "Trainingsleitung" })).toBeInTheDocument();
  });

  it("wertet einen verantwortlichen Trainer allein nicht als vollständig erfasste Liste", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openManualAttendance(user);
    await user.click(screen.getByRole("button", { name: /Gesamtliste prüfen/ }));
    expect(screen.getByText("Die Anwesenheit wurde noch nicht aktiv erfasst.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liste geprüft und speichern" })).toBeDisabled();
  });

  it("übernimmt den sicheren Fotovorschlag sichtbar und genau einmal in die Anwesenheit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const preselected = screen.getByTestId("proposal-1");
    expect(within(preselected).getByText("Sicher vorausgewählt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(screen.getAllByText("Mika Beispiel")).toHaveLength(1);
    expect(within(screen.getByTestId("summary-total")).getByText("2")).toBeInTheDocument();
  });

  it("bietet für ein unbekanntes Gesicht keine allgemeine Bestätigung an", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const unknown = screen.getByTestId("proposal-3");
    expect(within(unknown).queryByRole("button", { name: "Bestätigen" })).not.toBeInTheDocument();
    expect(within(unknown).getByRole("button", { name: "Mitglied auswählen" })).toBeEnabled();
  });

  it("markiert ein unbekanntes Gesicht ohne Anwesenheitseintrag als geklärt", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const unknown = screen.getByTestId("proposal-3");
    await user.click(within(unknown).getByRole("button", { name: "Als unbekannt markieren" }));
    expect(within(unknown).getByText("Als unbekannt markiert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(within(screen.getByTestId("summary-total")).getByText("2")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("summary-guests")).getByText("Keine Gäste"),
    ).toBeInTheDocument();
  });

  it("erfasst ein unbekanntes Gesicht genau einmal als manuellen Gast", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const unknown = screen.getByTestId("proposal-3");
    await user.click(within(unknown).getByRole("button", { name: "Als Gast erfassen" }));
    await user.click(within(unknown).getByRole("button", { name: "Als Gast erfassen" }));
    expect(within(unknown).getByText("Als Gast erfasst")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(
      within(screen.getByTestId("summary-guests")).getAllByText(/Gast Demo guest-/),
    ).toHaveLength(1);
  });

  it("wählt für ein unbekanntes Gesicht sichtbar genau das ausgewählte Mitglied", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const unknown = screen.getByTestId("proposal-3");
    await user.click(within(unknown).getByRole("button", { name: "Mitglied auswählen" }));
    const dialog = screen.getByRole("dialog", {
      name: "Mitglied für Foto-Demovorschlag auswählen",
    });
    await user.type(within(dialog).getByLabelText("Mitglied für Vorschlag suchen"), "Maro");
    await user.click(within(dialog).getByRole("button", { name: /Maro Beispiel/ }));
    await user.click(
      within(dialog).getByRole("button", { name: "Ausgewähltes Mitglied übernehmen" }),
    );
    expect(within(unknown).getByText("Andere Person gewählt")).toBeInTheDocument();
    expect(within(unknown).getByText("Maro Beispiel")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(screen.getAllByText("Maro Beispiel")).toHaveLength(1);
  });

  it("verwirft ein unbekanntes Gesicht ohne Anwesenheitseintrag", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const unknown = screen.getByTestId("proposal-3");
    await user.click(within(unknown).getByRole("button", { name: "Verwerfen" }));
    expect(within(unknown).getByText("Verworfen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(within(screen.getByTestId("summary-total")).getByText("2")).toBeInTheDocument();
  });

  it("zeigt bei Andere Person eine echte Auswahl mit Bestätigung und Abbruch", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const uncertain = screen.getByTestId("proposal-2");
    await user.click(within(uncertain).getByRole("button", { name: "Andere Person" }));
    const dialog = screen.getByRole("dialog", {
      name: "Mitglied für Foto-Demovorschlag auswählen",
    });
    expect(within(dialog).getByRole("button", { name: "Abbrechen" })).toBeEnabled();
    await user.clear(within(dialog).getByLabelText("Mitglied für Vorschlag suchen"));
    await user.type(within(dialog).getByLabelText("Mitglied für Vorschlag suchen"), "Nami");
    await user.click(within(dialog).getByRole("button", { name: /Nami Beispiel/ }));
    await user.click(
      within(dialog).getByRole("button", { name: "Ausgewähltes Mitglied übernehmen" }),
    );
    expect(within(uncertain).getByText("Nami Beispiel")).toBeInTheDocument();
    expect(within(uncertain).getByText("Andere Person gewählt")).toBeInTheDocument();
  });

  it("kann eine sichere Vorauswahl vor dem Speichern zurücknehmen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    const preselected = screen.getByTestId("proposal-1");
    await user.click(
      within(preselected).getByRole("button", { name: "Entscheidung zurücknehmen" }),
    );
    expect(within(preselected).getByText("Offen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gesamtliste öffnen" }));
    expect(screen.queryByText("Mika Beispiel")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("summary-total")).getByText("1")).toBeInTheDocument();
  });
});
