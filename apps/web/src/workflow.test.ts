import { describe, expect, it } from "vitest";
import { PresenceStatus, SessionRole } from "@vtkb/shared";

import { createTodaySessions, members } from "./mockData";
import {
  canCompleteSession,
  createInitialAttendance,
  presentMemberIds,
  suggestSession,
} from "./workflow";

describe("Paket-1-Workflow", () => {
  it("schlaegt die aktuell laufende Einheit anhand der Uhrzeit vor", () => {
    const now = new Date("2026-06-20T18:00:00+02:00");
    const sessions = createTodaySessions(now);
    expect(suggestSession(sessions, now).id).toBe("session-main");
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
});
