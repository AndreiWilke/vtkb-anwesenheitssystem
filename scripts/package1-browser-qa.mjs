import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const screenshotDir = new URL("../docs/screenshots/package1/", import.meta.url);
const resultsFile = new URL("../docs/screenshots/package1/qa-results.json", import.meta.url);

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

const results = [];
const screenshotPath = (name) => fileURLToPath(new URL(name, screenshotDir));

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
await page.getByRole("heading", { name: "Auswertung · Demo" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("statistics-390.png") });
results.push({ screen: "statistics", reachable: true });

if (consoleErrors.length) throw new Error(`Browser-Konsole: ${consoleErrors.join(" | ")}`);
await writeFile(resultsFile, `${JSON.stringify({ results, consoleErrors }, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
