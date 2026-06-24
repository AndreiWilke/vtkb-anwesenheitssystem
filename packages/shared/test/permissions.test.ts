import { describe, expect, it } from "vitest";

import { AppPermission, DemoRole, hasPermission } from "../src/index.js";

describe("Rollenberechtigungen", () => {
  it.each(Object.values(DemoRole))("erlaubt %s die Nachtragserfassung", (role) => {
    expect(hasPermission(role, AppPermission.CREATE_RETROSPECTIVE_SESSION)).toBe(true);
  });

  it("beschränkt direkte Mitgliedsanlage und Vorstandsfunktionen auf den Vorstand", () => {
    for (const permission of [
      AppPermission.CREATE_DIRECT_MEMBER,
      AppPermission.ACTIVATE_CONTRACT,
      AppPermission.CONVERT_TRIAL_MEMBER,
      AppPermission.GRANT_TRIAL_OVERRIDE,
    ]) {
      expect(hasPermission(DemoRole.BOARD, permission)).toBe(true);
      expect(hasPermission(DemoRole.TRAINER, permission)).toBe(false);
      expect(hasPermission(DemoRole.ASSISTANT_TRAINER, permission)).toBe(false);
      expect(hasPermission(DemoRole.TREASURER, permission)).toBe(false);
    }
  });

  it("erlaubt Gürteländerungen Vorstand, Trainer und Assistenztrainer, aber nicht Kassenwart", () => {
    for (const role of [DemoRole.BOARD, DemoRole.TRAINER, DemoRole.ASSISTANT_TRAINER]) {
      expect(hasPermission(role, AppPermission.CHANGE_BELT)).toBe(true);
      expect(hasPermission(role, AppPermission.DECIDE_BELT_SUGGESTION)).toBe(true);
    }
    expect(hasPermission(DemoRole.TREASURER, AppPermission.CHANGE_BELT)).toBe(false);
    expect(hasPermission(DemoRole.TREASURER, AppPermission.DECIDE_BELT_SUGGESTION)).toBe(false);
  });
});
