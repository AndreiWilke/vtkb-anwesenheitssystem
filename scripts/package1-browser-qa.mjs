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
const confirmButtons = page.getByRole("button", { name: "Bestätigen" });
for (const button of await confirmButtons.all()) {
  if (await button.isEnabled()) await button.click();
}
await page.getByText("Alle Vorschläge geklärt").waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("photo-review-390.png") });
await page.getByRole("button", { name: "Gesamtliste öffnen" }).click();
const photoSave = page.getByRole("button", { name: "Liste geprüft und speichern" });
if (!(await photoSave.isEnabled()))
  throw new Error("Geklärter Foto-Demoablauf ist nicht speicherbar");
results.push({ flow: "photo-demo", completed: true, cameraAccess: false, unresolved: 0 });

await page.getByRole("button", { name: "Auswertung" }).click();
await page.getByRole("heading", { name: "Auswertung · Demo" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: screenshotPath("statistics-390.png") });
results.push({ screen: "statistics", reachable: true });

if (consoleErrors.length) throw new Error(`Browser-Konsole: ${consoleErrors.join(" | ")}`);
await writeFile(resultsFile, `${JSON.stringify({ results, consoleErrors }, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
