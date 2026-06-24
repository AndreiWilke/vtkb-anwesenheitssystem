import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("portables Browser-QA", () => {
  it("beendet den Preview-Prozess auch beim bewusst provozierten Browser-Startfehler", () => {
    const output = execFileSync(
      process.execPath,
      [resolve(process.cwd(), "scripts", "package1-browser-qa.mjs")],
      {
        encoding: "utf8",
        env: { ...process.env, VTKB_QA_LIFECYCLE_SELF_TEST: "true" },
        timeout: 10_000,
      },
    );
    expect(output).toContain("lifecycle-self-test:cleanup-ok");
  });
});
