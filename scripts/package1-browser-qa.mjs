import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cwd, env, execPath, exit } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

async function terminateProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(2_000)]);
}

async function withGuaranteedCleanup(work, cleanup) {
  try {
    return await work();
  } finally {
    await cleanup();
  }
}

async function lifecycleSelfTest() {
  let child;
  let expectedFailure = false;
  try {
    await withGuaranteedCleanup(
      async () => {
        child = spawn(execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
        await once(child, "spawn");
        throw new Error("simulierter Browser-Startfehler");
      },
      async () => terminateProcess(child),
    );
  } catch (error) {
    expectedFailure = error instanceof Error && error.message === "simulierter Browser-Startfehler";
  }
  if (
    !expectedFailure ||
    !child?.killed ||
    (child.exitCode === null && child.signalCode === null)
  ) {
    throw new Error("Lifecycle-Selbsttest konnte den Preview-Prozess nicht zuverlässig beenden.");
  }
  console.log("lifecycle-self-test:cleanup-ok");
}

if (env.VTKB_QA_LIFECYCLE_SELF_TEST === "true") {
  await lifecycleSelfTest();
  exit(0);
}

const baseUrl = "http://127.0.0.1:4173";
const artifactDir = join(tmpdir(), "vtkb-package-1-7-browser-qa");
await mkdir(artifactDir, { recursive: true });

let preview;
let browser;

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

await withGuaranteedCleanup(
  async () => {
    preview = spawn(
      execPath,
      [resolve(cwd(), "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1"],
      { cwd: resolve(cwd(), "apps", "web"), stdio: "pipe" },
    );
    await waitForPreview();
    if (env.VTKB_QA_FAIL_AFTER_PREVIEW === "true") {
      throw new Error("Absichtlich simulierter Browser-Startfehler.");
    }
    const channel = env.VTKB_QA_BROWSER_CHANNEL?.trim();
    browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true });
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
      const sessionChoice = page.getByRole("heading", { name: "Trainingseinheit auswählen" });
      if ((await sessionChoice.count()) === 1) {
        await page.locator(".session-option").first().click();
      }
      await page.getByRole("button", { name: /Erfassungsart wählen/ }).click();
      await page.getByRole("button", { name: /Manuell erfassen/ }).click();
    }

    async function openApp() {
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const login = page.getByRole("button", { name: "Demo lokal öffnen" });
      if ((await login.count()) === 1) await login.click();
      await page.getByRole("heading", { name: "Start" }).waitFor();
    }

    for (const [name, width, height] of [
      ["375", 375, 812],
      ["390", 390, 844],
      ["430", 430, 932],
      ["768", 768, 1024],
      ["1280", 1280, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await openApp();
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
    await openApp();
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

    await openApp();
    await page.getByRole("button", { name: /Training starten/ }).click();
    if ((await page.getByRole("heading", { name: "Trainingseinheit auswählen" }).count()) === 1) {
      await page.locator(".session-option").first().click();
    }
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

    await openApp();
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("button", { name: "Verwaltung" })
      .click();
    await page.getByRole("button", { name: /Einheit nachträglich erstellen/ }).click();
    const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const [yesterdayYear, yesterdayMonth, yesterdayDay] = yesterdayIso.split("-");
    await page.getByLabel("Datum").fill(`${yesterdayDay}.${yesterdayMonth}.${yesterdayYear}`);
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

    const roleExpectations = {
      BOARD: { trials: 1, members: 1, belts: 1, suggestions: 1 },
      TRAINER: { trials: 1, members: 0, belts: 1, suggestions: 1 },
      ASSISTANT_TRAINER: { trials: 0, members: 0, belts: 1, suggestions: 1 },
      TREASURER: { trials: 0, members: 0, belts: 0, suggestions: 0 },
    };
    const roleNavigationItems = {};
    for (const [role, expected] of Object.entries(roleExpectations)) {
      await page.getByLabel("Demo-Rolle wechseln").selectOption(role);
      const roleNav = page.getByRole("navigation", { name: "Hauptnavigation" });
      const itemCount = await roleNav.getByRole("button").count();
      const managementButton = roleNav.getByRole("button", { name: "Verwaltung" });
      if (itemCount !== 5 || !(await managementButton.isEnabled())) {
        throw new Error(`Nachtragserfassung ist für Rolle ${role} nicht erreichbar.`);
      }
      await managementButton.click();
      const actual = {
        trials: await page.getByRole("button", { name: /Probetraining-Liste/ }).count(),
        members: await page.getByRole("button", { name: /Neues Mitglied anlegen/ }).count(),
        belts: await page.getByRole("button", { name: /Gürtelauswertung/ }).count(),
        suggestions: await page.getByRole("button", { name: /Bildvorschläge prüfen/ }).count(),
      };
      if (
        (await page.getByRole("button", { name: /Einheit nachträglich erstellen/ }).count()) !==
          1 ||
        Object.entries(expected).some(([key, value]) => actual[key] !== value)
      ) {
        throw new Error(`Verwaltungsrechte für Rolle ${role} sind inkonsistent.`);
      }
      roleNavigationItems[role] = { itemCount, ...actual };
    }
    results.push({ flow: "role-navigation", roleNavigationItems });
    console.log("flow:role-navigation:ok");

    if (consoleErrors.length) throw new Error(`Browser-Konsole: ${consoleErrors.join(" | ")}`);
    if (failedAssets.length) throw new Error(`404-Assets: ${failedAssets.join(" | ")}`);
    await writeFile(
      join(artifactDir, "qa-results.json"),
      `${JSON.stringify({ results, consoleErrors, failedAssets, artifactDir }, null, 2)}\n`,
    );
    console.log(JSON.stringify({ results, consoleErrors, failedAssets, artifactDir }, null, 2));
  },
  async () => {
    if (browser) await browser.close();
    await terminateProcess(preview);
  },
);
