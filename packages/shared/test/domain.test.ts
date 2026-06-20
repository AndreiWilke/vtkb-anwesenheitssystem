import { describe, expect, it } from "vitest";

import { ConsentPurpose, ConsentStatus, type BiometricConsent } from "../src/index.js";

describe("biometrisches Consent-Modell", () => {
  it("enthaelt den ausdruecklich abgelehnten Status", () => {
    expect(ConsentStatus.DECLINED).toBe("DECLINED");
  });

  it("ist eindeutig auf biometrische Anwesenheitsidentifizierung begrenzt", () => {
    const consent: BiometricConsent = {
      memberId: "member-example",
      purpose: ConsentPurpose.BIOMETRIC_ATTENDANCE_IDENTIFICATION,
      status: ConsentStatus.DECLINED,
      policyVersion: "biometric-policy-example",
      decidedAt: "2026-06-20T12:00:00.000Z",
    };

    expect(consent.purpose).toBe("BIOMETRIC_ATTENDANCE_IDENTIFICATION");
  });
});
