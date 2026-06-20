import { describe, expect, it } from "vitest";
import { PresenceStatus, SessionRole } from "@vtkb/shared";

import { createTodaySessions, members } from "./mockData";
import {
  canCompleteSession,
  createInitialAttendance,
  createLocalGuestIdFactory,
  presentMemberIds,
  sessionUiStatus,
  suggestSession,
} from "./workflow";

describe("Paket-1-Workflow", () => {
  it("schlaegt die in Europe/Berlin laufende Einheit unabhaengig von der Systemzeitzone vor", () => {
    const now = new Date("2026-06-20T16:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(suggestSession(sessions, now).id).toBe("session-main");
    expect(sessions[1]?.startsAt.toISOString()).toBe("2026-06-20T15:30:00.000Z");
    expect(sessions[1]?.endsAt.toISOString()).toBe("2026-06-20T17:00:00.000Z");
  });

  it("schlaegt vor Trainingsbeginn die naechste bevorstehende Einheit vor", () => {
    const now = new Date("2026-06-20T13:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(sessionUiStatus(sessions[0]!, now)).toBe("BEVORSTEHEND");
    expect(suggestSession(sessions, now).id).toBe("session-early");
  });

  it("wechselt bei direkt aufeinanderfolgenden Einheiten exakt um 19 Uhr Berlin", () => {
    const now = new Date("2026-06-20T17:00:00.000Z");
    const sessions = createTodaySessions(now);
    expect(sessionUiStatus(sessions[1]!, now)).toBe("BEENDET");
    expect(sessionUiStatus(sessions[2]!, now)).toBe("LAEUFT");
    expect(suggestSession(sessions, now).id).toBe("session-following");
  });

  it("bleibt bei gesetzter Prozesszeitzone UTC auf Europe/Berlin reproduzierbar", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const now = new Date("2026-06-20T16:00:00.000Z");
      const sessions = createTodaySessions(now);
      expect(suggestSession(sessions, now).id).toBe("session-main");
      expect(sessions[2]?.startsAt.toISOString()).toBe("2026-06-20T17:00:00.000Z");
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("verlangt genau einen verantwortlichen Trainer", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    attendance[session.responsibleTrainerId] = {
      presenceStatus: PresenceStatus.ABSENT,
      sessionRole: null,
    };
    expect(canCompleteSession(session, attendance, [], 0).allowed).toBe(false);
  });

  it("zaehlt einen Assistenztrainer nur einmal als anwesend", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    attendance["member-05"] = {
      presenceStatus: PresenceStatus.PRESENT,
      sessionRole: SessionRole.ASSISTANT_TRAINER,
    };
    expect(presentMemberIds(attendance)).toHaveLength(2);
    expect(canCompleteSession(session, attendance, [], 0).allowed).toBe(true);
  });

  it("blockiert den Abschluss bei ungeklaerten Foto-Demovorschlaegen", () => {
    const session = createTodaySessions(new Date("2026-06-20T18:00:00+02:00"))[1]!;
    const attendance = createInitialAttendance(members, session);
    const result = canCompleteSession(session, attendance, [], 2);
    expect(result.allowed).toBe(false);
    expect(result.messages.join(" ")).toContain("ungeklaert");
  });

  it("liefert genau 40 aktive fiktive Mitglieder fuer die Auswertung", () => {
    expect(members).toHaveLength(40);
    expect(members.every((member) => member.name.endsWith("Beispiel"))).toBe(true);
    expect(members.reduce((sum, member) => sum + member.trainingsVisited, 0)).toBeGreaterThan(0);
  });

  it("erzeugt monotone kollisionsfreie lokale Gast-IDs auch nach Entfernen", () => {
    const nextGuestId = createLocalGuestIdFactory();
    const first = nextGuestId();
    const second = nextGuestId();
    const remaining = [second];
    const third = nextGuestId();
    remaining.push(third);
    expect(new Set([first, ...remaining]).size).toBe(3);
    expect([first, second, third]).toEqual(["guest-001", "guest-002", "guest-003"]);
  });
});
