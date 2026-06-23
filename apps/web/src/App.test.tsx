// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    expect(
      screen.getByRole("heading", { name: "Auswertung und Aufwandsentschädigung" }),
    ).toBeInTheDocument();
  });

  it("enthält keinerlei Gastaktion mehr im Fotoablauf", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPhotoReview(user);
    expect(screen.queryByText(/Als Gast erfassen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gäste und Probetraining/i)).not.toBeInTheDocument();
  });

  it("erstellt eine Nachtragseinheit vollständig und zeigt sie in der Historie", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Verwaltung" }));
    await user.click(screen.getByRole("button", { name: /Einheit nachträglich erstellen/ }));
    await user.type(screen.getByLabelText("Datum"), "2026-06-20");
    await user.type(screen.getByLabelText("Bezeichnung"), "Fiktive Nachtragseinheit");
    await user.type(
      screen.getByLabelText("Grund für die Nachtragserfassung"),
      "Fiktive Dokumentationskorrektur",
    );
    await user.click(screen.getByRole("button", { name: /Trainer festlegen/ }));
    await user.click(screen.getByRole("button", { name: "Anwesenheit erfassen" }));
    await user.click(screen.getByRole("button", { name: "Liste prüfen" }));
    await user.click(screen.getByRole("button", { name: "Nachtrag speichern und abschließen" }));
    expect(screen.getByRole("heading", { name: "Verwaltung" })).toBeInTheDocument();
    expect(
      within(screen.getByTestId("retrospective-history")).getByText("Fiktive Nachtragseinheit"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("runtime-audit")).getByText("RETROSPECTIVE_SESSION_CREATED"),
    ).toBeInTheDocument();
  });

  it("öffnet Mitgliederübersicht und berechnetes Mitgliedsdetail", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    await user.click(screen.getByRole("button", { name: "Mitglieder" }));
    expect(
      screen.getByRole("heading", { name: "Auswertung – Mitglieder und Schüler" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Dauerhafte Qualifikation filtern")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Aiko Beispiel/ }));
    expect(screen.getByRole("heading", { name: "Aiko Beispiel" })).toBeInTheDocument();
    expect(screen.getAllByText(/Einheiten/).length).toBeGreaterThan(0);
  });

  it("begrenzt die Trainer-Demoansicht auf die eigene Abrechnung", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Demo-Rolle wechseln"), "TRAINER");
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    expect(screen.getByRole("button", { name: "Meine Übersicht" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vergütungssätze" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Aiko Beispiel · Juni 2026/ })).toBeInTheDocument();
  });

  it("zeigt dem Kassenwart die Zahlungsliste statt Vorstandsfunktionen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Demo-Rolle wechseln"), "TREASURER");
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    expect(screen.getByRole("heading", { name: "Zahlungsliste" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vergütungssätze" })).not.toBeInTheDocument();
  });

  it("zeigt ungültige Korrekturbeträge verständlich und stürzt nicht ab", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    await user.click(screen.getByRole("button", { name: "Abrechnung" }));
    await user.click(screen.getByRole("button", { name: /Aiko Beispiel/ }));
    await user.click(screen.getByRole("button", { name: "Korrektur hinzufügen" }));
    await user.type(screen.getByLabelText("Korrekturbetrag"), "abc");
    expect(screen.getByRole("alert")).toHaveTextContent("gültigen Eurobetrag");
    expect(screen.getByRole("button", { name: "Korrektur speichern" })).toBeDisabled();
  });

  it("blockiert die Prüfung sichtbar bei fehlendem Vergütungssatz", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    await user.click(screen.getByRole("button", { name: "Vergütungssätze" }));
    await user.click(screen.getAllByRole("checkbox", { name: "aktiv" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Satz lokal speichern" })[0]!);
    await user.click(screen.getByRole("button", { name: "Abrechnung" }));
    await user.click(screen.getByRole("button", { name: /Aiko Beispiel/ }));
    expect(screen.getAllByText(/Kein aktiver Vergütungssatz/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Als geprüft markieren" })).toBeDisabled();
  });

  it("zeigt nach Stornierung keine Bearbeitungsaktionen", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    await user.click(within(nav).getByRole("button", { name: "Auswertung" }));
    await user.click(screen.getByRole("button", { name: "Abrechnung" }));
    await user.click(screen.getByRole("button", { name: /Aiko Beispiel/ }));
    await user.click(screen.getByRole("button", { name: "Stornieren" }));
    expect(screen.getByText(/Storniert vor Freigabe/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Korrektur hinzufügen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Freigeben" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Als bezahlt markieren" })).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Gast/)).not.toBeInTheDocument();
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

  it("legt einen neuen Vergütungssatz an und protokolliert ihn", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(screen.getByRole("navigation", { name: "Hauptnavigation" })).getByRole("button", {
        name: "Auswertung",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Vergütungssätze" }));
    await user.click(screen.getByRole("button", { name: "Neuen Vergütungssatz anlegen" }));
    await user.type(screen.getByLabelText("Bezeichnung neuer Vergütungssatz"), "Juli-Satz");
    await user.selectOptions(
      screen.getByLabelText("Rolle neuer Vergütungssatz"),
      "RESPONSIBLE_TRAINER",
    );
    await user.type(screen.getByLabelText("Betrag neuer Vergütungssatz"), "25,00");
    await user.type(screen.getByLabelText("Gültig ab neuer Vergütungssatz"), "2026-07-01");
    await user.click(screen.getByLabelText("Neuer Vergütungssatz aktiv"));
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByDisplayValue("Juli-Satz")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Audit" }));
    expect(screen.getByText(/Vergütungssatz angelegt/)).toBeInTheDocument();
    expect(screen.getByText(/Juli-Satz/)).toBeInTheDocument();
  });

  it("verwirft einen neuen Satz bei Abbruch und lehnt Überlappungen sichtbar ab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(screen.getByRole("navigation", { name: "Hauptnavigation" })).getByRole("button", {
        name: "Auswertung",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Vergütungssätze" }));
    await user.click(screen.getByRole("button", { name: "Neuen Vergütungssatz anlegen" }));
    await user.type(screen.getByLabelText("Bezeichnung neuer Vergütungssatz"), "Abbruch-Satz");
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByDisplayValue("Abbruch-Satz")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Neuen Vergütungssatz anlegen" }));
    await user.type(screen.getByLabelText("Bezeichnung neuer Vergütungssatz"), "Überlappung");
    await user.type(screen.getByLabelText("Betrag neuer Vergütungssatz"), "25,00");
    await user.type(screen.getByLabelText("Gültig ab neuer Vergütungssatz"), "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("alert")).toHaveTextContent("überschneiden");
    expect(screen.getByRole("heading", { name: "Neuer Vergütungssatz" })).toBeInTheDocument();
  });
});
