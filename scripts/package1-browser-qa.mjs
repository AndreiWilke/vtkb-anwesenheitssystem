import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const screenshotDir = join(tmpdir(), "vtkb-package-1-1-browser-qa");
const resultsFile = join(screenshotDir, "qa-results.json");

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

const results = [];
const screenshotPath = (name) => join(screenshotDir, name);

async function checkViewport(name, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    throw new Error(`${name}: horizontaler Overflow ${JSON.stringify(dimensions)}`);
  }
  await page.screenshot({ path: screenshotPath(`start-${name}.png`), fullPage: true });
  results.push({ name, width, height, ...dimensions, horizontalOverflow: false });
}

for (const viewport of [
  ["375", 375, 812],
  ["390", 390, 844],
  ["430", 430, 932],
  ["tablet", 768, 1024],
  ["desktop", 1280, 900],
]) {
  await checkViewport(...viewport);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Training starten/ }).click();
await page.getByRole("button", { name: /Erfassungsart wählen/ }).click();
await page.getByRole("button", { name: /Manuell erfassen/ }).click();
await page.getByRole("button", { name: "Maro Beispiel anwesend setzen" }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("manual-attendance-390.png") });
await page.getByRole("button", { name: /Gäste und Probetraining/ }).click();
await page.getByLabel("Vorname oder Anzeigename").fill("Gast Demo QA");
await page.getByRole("button", { name: "Manuell hinzufügen" }).click();
await page.getByRole("button", { name: "Zur Anwesenheitsliste" }).click();
await page.getByRole("button", { name: /Gesamtliste prüfen/ }).click();
const manualSave = page.getByRole("button", { name: "Liste geprüft und speichern" });
if (!(await manualSave.isEnabled())) throw new Error("Manueller Ablauf ist nicht speicherbar");
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("summary-390.png") });
await manualSave.click();
await page.getByRole("heading", { name: "Liste lokal gespeichert" }).waitFor();
results.push({ flow: "manual", completed: true, guestWithoutBiometrics: true });

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Training starten/ }).click();
await page.getByRole("button", { name: /Erfassungsart wählen/ }).click();
await page.getByRole("button", { name: /Fotoassistenz – nur Demo/ }).click();
await page.getByText(/keine Bilder werden aufgenommen oder verarbeitet/i).waitFor();
await page.getByRole("button", { name: "Demo-Analyse starten" }).click();
await page.getByRole("heading", { name: "Demo-Vorschläge prüfen" }).waitFor();

const preselectedProposal = page.getByTestId("proposal-1");
if ((await preselectedProposal.getByText("Sicher vorausgewählt").count()) !== 1) {
  throw new Error("Der eindeutige Vorschlag ist nicht sichtbar vorausgewählt");
}

const uncertainProposal = page.getByTestId("proposal-2");
await uncertainProposal.getByRole("button", { name: "Bestätigen" }).click();
await uncertainProposal.getByText("Person bestätigt").waitFor();

const unknownProposal = page.getByTestId("proposal-3");
if ((await unknownProposal.getByRole("button", { name: "Bestätigen" }).count()) !== 0) {
  throw new Error("Ein unbekanntes Gesicht bietet unzulässig eine allgemeine Bestätigung an");
}
await unknownProposal.getByRole("button", { name: "Als Gast erfassen" }).click();
await unknownProposal.getByText("Als Gast erfasst").waitFor();

const duplicateProposal = page.getByTestId("proposal-4");
await duplicateProposal.getByRole("button", { name: "Bestätigen" }).click();
await duplicateProposal.getByText("Person bestätigt").waitFor();

await page.getByText("Alle Vorschläge geklärt").waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("photo-review-390.png") });
await page.getByRole("button", { name: "Gesamtliste öffnen" }).click();
const photoSave = page.getByRole("button", { name: "Liste geprüft und speichern" });
if (!(await photoSave.isEnabled()))
  throw new Error("Geklärter Foto-Demoablauf ist nicht speicherbar");
const summaryTotal = Number(await page.getByTestId("summary-total").locator("strong").innerText());
const visibleSummaryPeople = await page.locator(".summary-person").count();
const visibleGuests = await page.getByTestId("summary-guests").locator(".summary-person").count();
const mikaEntries = await page.getByText("Mika Beispiel", { exact: true }).count();
if (summaryTotal !== visibleSummaryPeople) {
  throw new Error(
    `Gesamtsumme ${summaryTotal} entspricht nicht ${visibleSummaryPeople} sichtbaren Einzelgruppen`,
  );
}
if (visibleGuests !== 1)
  throw new Error(`Erwartet wurde genau ein Gast, erhalten: ${visibleGuests}`);
if (mikaEntries !== 1)
  throw new Error(`Der vorausgewählte Vorschlag wurde ${mikaEntries}-mal statt einmal gezählt`);
if (summaryTotal !== 5) throw new Error(`Unerwartete Foto-Demo-Gesamtsumme: ${summaryTotal}`);
results.push({
  flow: "photo-demo",
  completed: true,
  cameraAccess: false,
  unresolved: 0,
  preselectedMemberCount: mikaEntries,
  uncertainDecision: "confirmed",
  unknownDecision: "guest",
  guestCount: visibleGuests,
  duplicateCountedOnce: true,
  summaryTotal,
  visibleSummaryPeople,
});

await page.getByRole("button", { name: "Auswertung" }).click();
await page.getByRole("heading", { name: "Auswertung und Aufwandsentschädigung" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("statistics-390.png") });
await assertNoHorizontalOverflow("Dashboard 390");
results.push({ screen: "statistics", reachable: true });

async function assertNoHorizontalOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    throw new Error(`${label}: horizontaler Overflow ${JSON.stringify(dimensions)}`);
  }
}

await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole("button", { name: "Dashboard" }).click();
await page.getByRole("heading", { name: "Auswertungsdashboard" }).waitFor();
await page.getByText("Abgeschlossene Einheiten").waitFor();
await assertNoHorizontalOverflow("Dashboard Desktop");
await page.screenshot({ path: screenshotPath("dashboard-desktop.png"), fullPage: true });
results.push({ screen: "board-dashboard", completed: true });

await page.getByRole("button", { name: "Mitglieder" }).click();
await page.getByRole("heading", { name: "Auswertung – Mitglieder und Schüler" }).waitFor();
await page.getByLabel("Person filtern").fill("Aiko");
await page.getByRole("button", { name: /Aiko Beispiel/ }).click();
await page.getByRole("heading", { name: "Aiko Beispiel" }).waitFor();
await page.getByLabel("Funktion filtern").selectOption("RESPONSIBLE_TRAINER");
await assertNoHorizontalOverflow("Mitgliedsdetail Desktop");
await page.setViewportSize({ width: 390, height: 844 });
await assertNoHorizontalOverflow("Mitgliedsdetail 390");
await page.screenshot({ path: screenshotPath("member-detail-390.png"), fullPage: true });
await page.setViewportSize({ width: 1280, height: 900 });
results.push({ flow: "member-reporting", completed: true });

await page.getByRole("button", { name: "Trainer" }).click();
await page.getByRole("heading", { name: "Auswertung – Trainer und Assistenztrainer" }).waitFor();
await page.getByRole("button", { name: /Aiko Beispiel/ }).click();
await page.getByText(/Abrechnungsfähig Juni 2026/).waitFor();
results.push({ flow: "trainer-reporting", completed: true });

await page.getByRole("button", { name: "Vergütungssätze" }).click();
await page.getByRole("heading", { name: "Vergütungssätze" }).waitFor();
const responsibleRate = page.getByLabel(/Betrag Verantwortlicher Trainer/);
await responsibleRate.fill("25,00");
await page.getByRole("button", { name: "Satz lokal speichern" }).first().click();

await page.getByRole("button", { name: "Abrechnung" }).click();
await page.getByRole("heading", { name: "Aufwandsentschädigung", exact: true }).waitFor();
const compensationDownloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: /CSV Aufwandsentschädigung/ }).click();
const compensationDownload = await compensationDownloadPromise;
if (compensationDownload.suggestedFilename() !== "aufwandsentschaedigung.csv") {
  throw new Error("Unerwarteter CSV-Dateiname für Aufwandsentschädigung");
}
await page.getByRole("button", { name: /Aiko Beispiel/ }).click();
await page.getByRole("heading", { name: /Aiko Beispiel · Juni 2026/ }).waitFor();
const totalBeforeCorrection = await page.locator(".grand-total dd").innerText();
await page.getByRole("button", { name: "Korrektur hinzufügen" }).click();
await page.getByLabel("Korrekturbetrag").fill("5,00");
await page.getByLabel("Korrekturbegründung").fill("Zusätzliche Lehrgangsvergütung · fiktive QA");
await page.getByRole("button", { name: "Korrektur speichern" }).click();
const totalAfterCorrection = await page.locator(".grand-total dd").innerText();
if (totalBeforeCorrection === totalAfterCorrection)
  throw new Error("Korrektur änderte den Entwurf nicht");
await page.getByRole("button", { name: "Als geprüft markieren" }).click();
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Freigeben" }).click();
await page.getByText("Freigegebener Snapshot – unveränderlich").waitFor();
const approvedTotal = await page.locator(".grand-total dd").innerText();

await page.getByRole("button", { name: "Vergütungssätze" }).click();
await responsibleRate.fill("30,00");
await page.getByRole("button", { name: "Satz lokal speichern" }).first().click();
await page.getByRole("button", { name: "Abrechnung" }).click();
await page.getByRole("button", { name: /Aiko Beispiel/ }).click();
if ((await page.locator(".grand-total dd").innerText()) !== approvedTotal) {
  throw new Error("Freigegebener Snapshot änderte sich nach Satzänderung");
}
results.push({ flow: "draft-rate-correction-approval-snapshot", completed: true });

await page.getByLabel("Demo-Rolle wechseln").selectOption("TREASURER");
await page.getByRole("button", { name: "Als bezahlt markieren" }).waitFor();
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Als bezahlt markieren" }).click();
await page.getByText("bezahlt", { exact: true }).waitFor();
await page.getByRole("button", { name: "Zahlungsliste" }).click();
await page.getByRole("heading", { name: "Zahlungsliste" }).waitFor();
const paymentDownloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: /Zahlungsliste CSV/ }).click();
const paymentDownload = await paymentDownloadPromise;
if (paymentDownload.suggestedFilename() !== "zahlungsliste.csv") {
  throw new Error("Unerwarteter CSV-Dateiname der Zahlungsliste");
}
results.push({ flow: "treasurer-payment", completed: true });

await page.getByLabel("Demo-Rolle wechseln").selectOption("TRAINER");
await page.getByRole("button", { name: "Meine Übersicht" }).waitFor();
if ((await page.getByRole("button", { name: "Vergütungssätze" }).count()) !== 0) {
  throw new Error("Trainer sieht unzulässig die Vergütungssatzverwaltung");
}
await page.setViewportSize({ width: 375, height: 812 });
await assertNoHorizontalOverflow("Eigene Trainerübersicht 375");
await page.screenshot({ path: screenshotPath("own-trainer-375.png"), fullPage: true });
results.push({ flow: "role-switching", completed: true });

await page.emulateMedia({ media: "print" });
if (await page.locator(".app-header").isVisible())
  throw new Error("App-Header bleibt im Druck sichtbar");
await page.emulateMedia({ media: "screen" });
results.push({ flow: "print-view", completed: true });

if (consoleErrors.length) throw new Error(`Browser-Konsole: ${consoleErrors.join(" | ")}`);
await writeFile(
  resultsFile,
  `${JSON.stringify({ results, consoleErrors, artifacts: screenshotDir }, null, 2)}\n`,
);
await browser.close();
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
