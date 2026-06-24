// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberQualification } from "@vtkb/shared";

import { BeltChangeDialog } from "./beltScreens";
import type { BeltHistoryEntry, Member } from "./types";

afterEach(cleanup);

const member: Member = {
  id: "member-date-test",
  name: "Mika Muster",
  initials: "MM",
  gender: "MAENNLICH",
  beltColor: "ORANGE",
  beltGrade: "7. Kyu",
  qualification: MemberQualification.NONE,
  active: true,
  trainingsVisited: 0,
  responsibleAssignments: 0,
  assistantAssignments: 0,
};

describe("deutsche Datumsfelder", () => {
  it("speichert ein deutsches Gürteldatum intern als ISO", async () => {
    const onConfirm = vi.fn<(entry: BeltHistoryEntry) => void>();
    const user = userEvent.setup();
    render(
      <BeltChangeDialog
        actorName="ASSISTANT_TRAINER"
        existingHistoryIds={[]}
        member={member}
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );
    const date = screen.getByLabelText("Gültig ab Gürteländerung");
    expect(date).toHaveAttribute("placeholder", "TT.MM.JJJJ");
    await user.type(date, "29.02.2024");
    await user.click(screen.getByRole("button", { name: "Änderung speichern" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]?.[0].effectiveFrom).toBe("2024-02-29");
  });

  it("lehnt ein unmögliches deutsches Gürteldatum ab", async () => {
    const onConfirm = vi.fn<(entry: BeltHistoryEntry) => void>();
    const user = userEvent.setup();
    render(
      <BeltChangeDialog
        actorName="ASSISTANT_TRAINER"
        existingHistoryIds={[]}
        member={member}
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );
    await user.type(screen.getByLabelText("Gültig ab Gürteländerung"), "31.02.2026");
    await user.click(screen.getByRole("button", { name: "Änderung speichern" }));
    expect(screen.getByText(/gültiges Datum im Format TT\.MM\.JJJJ/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
