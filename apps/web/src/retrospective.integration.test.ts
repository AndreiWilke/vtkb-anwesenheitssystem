import { describe, expect, it } from "vitest";
import {
  CompensationBillingType,
  DemoRole,
  PersonMembershipStatus,
  SessionRole,
  createRetrospectiveSession,
  type CompensationRate,
} from "@vtkb/shared";

import { members, trialParticipants } from "./mockData";
import { aggregateAttendance, calculateSettlement } from "./reporting";
import { computeTrialSessionCount } from "./trialWorkflow";
import type { HistoricalTrainingSession } from "./types";

describe("Nachtragseinheit integriert", () => {
  const result = createRetrospectiveSession(
    "retro-integration",
    {
      date: "2026-06-22",
      scheduledSlotId: "mon-seikatsu-1700",
      startTime: "17:00",
      endTime: "18:00",
      name: "Training",
      trainingType: "ALLGEMEINES_TRAINING",
      dojoId: "dojo-seikatsu",
      dojo: "Seikatsu Dojo",
      responsibleTrainerId: "member-01",
      assistantTrainerIds: ["member-05"],
      participantIds: ["member-10", trialParticipants[0]!.id],
      membershipStatusByPersonId: {
        "member-01": PersonMembershipStatus.ACTIVE_MEMBER,
        "member-05": PersonMembershipStatus.ACTIVE_MEMBER,
        "member-10": PersonMembershipStatus.ACTIVE_MEMBER,
        [trialParticipants[0]!.id]: PersonMembershipStatus.TRIAL,
      },
      createdBy: DemoRole.BOARD,
      createdAt: "2026-06-23T12:00:00.000Z",
    },
    "2026-06-23",
  );
  const history = [result.session as HistoricalTrainingSession];

  it("aktualisiert Anwesenheitsauswertung und Historie", () => {
    const summary = aggregateAttendance(members, history, { mode: "MONTH", month: "2026-06" });
    expect(summary.find((entry) => entry.member.id === "member-10")?.total).toBe(1);
    expect(history[0]?.attendance).toHaveLength(4);
  });

  it("aktualisiert Trainervergütung", () => {
    const rates: CompensationRate[] = [
      {
        id: "rate-retro",
        label: "Fiktiver Nachtragssatz",
        role: SessionRole.RESPONSIBLE_TRAINER,
        billingType: CompensationBillingType.PER_COMPLETED_SESSION,
        amountCents: 2_000,
        validFrom: "2026-01-01",
        validUntil: null,
        active: true,
      },
    ];
    expect(calculateSettlement("member-01", "2026-06", history, rates).totalCents).toBe(2_000);
  });

  it("aktualisiert den Probetrainingzähler aus derselben Historie", () => {
    expect(computeTrialSessionCount(trialParticipants[0]!.id, history).attended).toBe(1);
  });
});
