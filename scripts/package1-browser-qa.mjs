import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cwd, execPath } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const artifactDir = join(tmpdir(), "vtkb-package-1-7-browser-qa");
await mkdir(artifactDir, { recursive: true });

const preview = spawn(
  execPath,
  [resolve(cwd(), "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1"],
  { cwd: resolve(cwd(), "apps", "web"), stdio: "pipe" },
);

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const ok = await new Promise((resolve) => {
        const request = get(baseUrl, (response) => {
          response.resume();
          resolve((response.statusCode ?? 500) < 400);
        });
        request.on("error", () => resolve(false));
      });
      if (ok) return;
    } catch {
      // Der Preview-Server startet noch.
    }
    await delay(250);
  }
  throw new Error("Der lokale Preview-Server wurde nicht rechtzeitig erreichbar.");
}

await waitForPreview();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const failedAssets = [];
const results = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() === 404) failedAssets.push(response.url());
});

async function assertNoOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("*")]
      .filter(
        (element) =>
          element.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
      )
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      })),
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    throw new Error(`${label}: horizontaler Overflow ${JSON.stringify(dimensions)}`);
  }
}

async function openManualCapture() {
  await page.getByRole("button", { name: /Training starten/ }).click();
  await page.getByRole("button", { name: /Erfassungsart wählen/ }).click();
  await page.getByRole("button", { name: /Manuell erfassen/ }).click();
}

try {
  for (const [name, width, height] of [
    ["375", 375, 812],
    ["390", 390, 844],
    ["430", 430, 932],
    ["768", 768, 1024],
    ["1280", 1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Start" }).waitFor();
    await assertNoOverflow(`Start ${name}`);
    const logo = page.getByRole("img", { name: "VTKB Berlin Vereinslogo" });
    if (!(await logo.isVisible())) throw new Error(`${name}: Vereinslogo nicht sichtbar`);
    const loaded = await logo.evaluate((element) => element.naturalWidth > 0);
    if (!loaded) throw new Error(`${name}: Logo und Fallback konnten nicht geladen werden`);
    await page.screenshot({ path: join(artifactDir, `start-${name}.png`), fullPage: true });
    results.push({ viewport: name, horizontalOverflow: false, logoLoaded: true });
    console.log(`viewport:${name}:ok`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const boardNav = page.getByRole("navigation", { name: "Hauptnavigation" });
  if ((await boardNav.getByRole("button").count()) !== 5) {
    throw new Error("Vorstandsnavigation ist nicht vollständig.");
  }

  await openManualCapture();
  for (const beltText of [
    "Weiß-Rot · 9. Kyu",
    "Weiß-Gelb · 9a. Kyu",
    "Violett · 4. Kyu",
    "Schwarz · 9. Dan",
  ]) {
    if ((await page.getByText(beltText, { exact: true }).count()) === 0) {
      throw new Error(`Gürtelanzeige fehlt: ${beltText}`);
    }
  }
  await assertNoOverflow("Manuelle Erfassung 390");
  results.push({ flow: "belt-visuals", twoToneBelts: true, violet: true, ninthDan: true });
  console.log("flow:belt-visuals:ok");

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Training starten/ }).click();
  await page.getByRole("button", { name: /Erfassungsart wählen/ }).click();
  await page.getByRole("button", { name: /Fotoassistenz – nur Demo/ }).click();
  await page.getByRole("button", { name: "Demo-Analyse starten" }).click();
  await page.getByRole("heading", { name: "Demo-Vorschläge prüfen" }).waitFor();
  const unknown = page.getByTestId("proposal-3");
  if ((await unknown.getByRole("button", { name: /Als G.st erfassen/ }).count()) !== 0) {
    throw new Error("Unbekannte Fotozuordnung bietet eine unzulässige Fremdperson-Aktion an.");
  }
  for (const allowed of ["Mitglied auswählen", "Als unbekannt markieren", "Verwerfen"]) {
    if ((await unknown.getByRole("button", { name: allowed }).count()) !== 1) {
      throw new Error(`Zulässige Fotoaktion fehlt: ${allowed}`);
    }
  }
  results.push({ flow: "photo-unknown", createsExternalPerson: false });
  console.log("flow:photo-unknown:ok");

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Verwaltung" })
    .click();
  await page.getByRole("button", { name: /Einheit nachträglich erstellen/ }).click();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Datum").fill(yesterday);
  await page.getByLabel("Bezeichnung").fill("Fiktive Browser-QA Nachtragseinheit");
  await page
    .getByLabel("Grund für die Nachtragserfassung")
    .fill("Fiktive Browser-QA Dokumentation");
  await page.getByRole("button", { name: /Trainer festlegen/ }).click();
  await page.getByRole("button", { name: "Anwesenheit erfassen" }).click();
  const firstAttendance = page.locator(".retrospective-attendance .check-row").first();
  await firstAttendance.click();
  await page.getByRole("button", { name: "Liste prüfen" }).click();
  await page.getByRole("button", { name: "Nachtrag speichern und abschließen" }).click();
  await page
    .getByTestId("retrospective-history")
    .getByText("Fiktive Browser-QA Nachtragseinheit")
    .waitFor();
  await page.getByTestId("runtime-audit").getByText("RETROSPECTIVE_SESSION_CREATED").waitFor();
  await assertNoOverflow("Nachtragshistorie 390");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(artifactDir, "retrospective-complete-390.png"),
    fullPage: true,
  });
  results.push({ flow: "retrospective-session", completed: true, history: true, audit: true });
  console.log("flow:retrospective-session:ok");

  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Auswertung" })
    .click();
  await page.getByRole("heading", { name: "Auswertung und Aufwandsentschädigung" }).waitFor();
  await page.getByRole("button", { name: "Mitglieder" }).click();
  await page.getByRole("button", { name: /Aiko Beispiel/ }).click();
  await page.getByText("Fiktive Browser-QA Nachtragseinheit").waitFor();
  await assertNoOverflow("Nachtrag in Auswertung 390");
  results.push({ flow: "retrospective-reporting", visible: true });
  console.log("flow:retrospective-reporting:ok");

  await page.getByLabel("Demo-Rolle wechseln").selectOption("TREASURER");
  const treasurerNav = page.getByRole("navigation", { name: "Hauptnavigation" });
  if ((await treasurerNav.getByRole("button").count()) !== 4) {
    throw new Error("Kassenwartnavigation enthält unzulässige Verwaltungsfunktion.");
  }
  results.push({ flow: "role-navigation", boardItems: 5, treasurerItems: 4 });
  console.log("flow:role-navigation:ok");

  if (consoleErrors.length) throw new Error(`Browser-Konsole: ${consoleErrors.join(" | ")}`);
  if (failedAssets.length) throw new Error(`404-Assets: ${failedAssets.join(" | ")}`);
  await writeFile(
    join(artifactDir, "qa-results.json"),
    `${JSON.stringify({ results, consoleErrors, failedAssets, artifactDir }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ results, consoleErrors, failedAssets, artifactDir }, null, 2));
} finally {
  await browser.close();
  preview.kill();
}
