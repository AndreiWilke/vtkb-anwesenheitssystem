import { describe, expect, it } from "vitest";

import {
  checkForDuplicates,
  createMemberNumberGenerator,
  createPersonIdGenerator,
  normalizeName,
} from "../src/person.js";

// ---------------------------------------------------------------------------
// Normalisierung
// ---------------------------------------------------------------------------

describe("normalizeName", () => {
  it("trim, Kleinbuchstaben, mehrfache Leerzeichen vereinheitlicht", () => {
    expect(normalizeName("  Max  Mustermann  ")).toBe("max mustermann");
  });

  it("wandelt Umlaute konsistent um", () => {
    expect(normalizeName("Müller")).toBe("mueller");
    expect(normalizeName("Öztürk")).toBe("oeztuerk");
    expect(normalizeName("Günther")).toBe("guenther");
    expect(normalizeName("Straße")).toBe("strasse");
  });

  it("ignoriert Gross-/Kleinschreibung", () => {
    expect(normalizeName("LINA")).toBe("lina");
    expect(normalizeName("lina")).toBe("lina");
  });
});

// ---------------------------------------------------------------------------
// Dublettenpruefung
// ---------------------------------------------------------------------------

describe("checkForDuplicates", () => {
  const existing = [
    { id: "trial-001", firstName: "Lina", lastName: "Probetraining", birthDate: "2012-05-15" },
    { id: "trial-002", firstName: "Max", lastName: "Muster", birthDate: "2010-03-20" },
  ];

  it("erkennt exakte Dublette", () => {
    const result = checkForDuplicates(
      { firstName: "Lina", lastName: "Probetraining", birthDate: "2012-05-15" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.id).toBe("trial-001");
  });

  it("erkennt Dublette bei gleichem Jahr aber anderem Tag", () => {
    const result = checkForDuplicates(
      { firstName: "Lina", lastName: "Probetraining", birthDate: "2012-11-01" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(true);
  });

  it("ignoriert Gross-/Kleinschreibung", () => {
    const result = checkForDuplicates(
      { firstName: "lina", lastName: "probetraining", birthDate: "2012-05-15" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(true);
  });

  it("ignoriert fuehrende und nachfolgende Leerzeichen", () => {
    const result = checkForDuplicates(
      { firstName: " Lina ", lastName: " Probetraining ", birthDate: "2012-05-15" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(true);
  });

  it("findet keine Dublette bei anderem Geburtsjahr", () => {
    const result = checkForDuplicates(
      { firstName: "Lina", lastName: "Probetraining", birthDate: "2013-05-15" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(false);
  });

  it("findet keine Dublette bei anderem Nachnamen", () => {
    const result = checkForDuplicates(
      { firstName: "Lina", lastName: "Anders", birthDate: "2012-05-15" },
      existing,
    );
    expect(result.hasProbableDuplicate).toBe(false);
  });

  it("gibt leeres Array zurueck bei keiner Dublette", () => {
    const result = checkForDuplicates(
      { firstName: "Neu", lastName: "Person", birthDate: "2015-01-01" },
      existing,
    );
    expect(result.matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ID-Generatoren
// ---------------------------------------------------------------------------

describe("createPersonIdGenerator", () => {
  it("erzeugt IDs ab person-0001", () => {
    const nextId = createPersonIdGenerator([]);
    expect(nextId()).toBe("person-0001");
    expect(nextId()).toBe("person-0002");
  });

  it("umgeht bestehende IDs kollisionsfrei", () => {
    const nextId = createPersonIdGenerator(["person-0001"]);
    expect(nextId()).toBe("person-0002");
  });

  it("erzeugt monotone eindeutige IDs", () => {
    const nextId = createPersonIdGenerator([]);
    const ids = Array.from({ length: 5 }, () => nextId());
    expect(new Set(ids).size).toBe(5);
  });
});

describe("createMemberNumberGenerator", () => {
  it("erzeugt Mitgliedsnummern ab M-1001", () => {
    const nextNum = createMemberNumberGenerator([]);
    expect(nextNum()).toBe("M-1001");
    expect(nextNum()).toBe("M-1002");
  });

  it("umgeht bestehende Nummern kollisionsfrei", () => {
    const nextNum = createMemberNumberGenerator(["M-1001", "M-1002"]);
    expect(nextNum()).toBe("M-1003");
  });
});
