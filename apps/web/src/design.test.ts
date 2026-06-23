import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(resolve(webRoot, "index.html"), "utf8");
const styles = readFileSync(resolve(import.meta.dirname, "styles.css"), "utf8");
const components = readFileSync(resolve(import.meta.dirname, "components.tsx"), "utf8");

describe("Dojo-Design und Assets", () => {
  it("lädt keine externen Google-Schriften", () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis|fonts\.gstatic/i);
  });

  it("liefert offizielles Logo und lokalen SVG-Fallback", () => {
    expect(existsSync(resolve(webRoot, "public", "VTKBLogo.png"))).toBe(true);
    expect(existsSync(resolve(webRoot, "public", "icon.svg"))).toBe(true);
    expect(components).toContain("VTKBLogo.png");
    expect(components).toContain("icon.svg");
  });

  it("definiert die zentralen Dojo-Tokens und entfernt das Wellenmuster", () => {
    for (const token of [
      "--paper",
      "--paper-soft",
      "--ink",
      "--ink-muted",
      "--line",
      "--line-soft",
      "--red",
      "--red-strong",
      "--red-tint",
      "--success",
      "--warning",
      "--shadow-card",
      "--radius-card",
      "--radius-control",
    ]) {
      expect(styles).toContain(token);
    }
    expect(styles).not.toContain("data:image/svg+xml");
  });
});
