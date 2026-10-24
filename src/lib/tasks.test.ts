import { describe, expect, it } from "vitest";
import {
  canDeleteTask,
  canSeeAllTasks,
  compareTasks,
  isReminderDue,
  isTaskVisibleTo,
  type Task,
} from "@/lib/tasks";

const NOW = new Date("2026-10-24T10:00:00Z");

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    title: "Tâche",
    description: null,
    priority: "important",
    remind_at: null,
    assigned_to: "u1",
    created_by: "u2",
    created_at: "2026-10-20T10:00:00Z",
    completed_at: null,
    completed_by: null,
    ...overrides,
  };
}

describe("canSeeAllTasks", () => {
  it("réserve la vue de toute l'équipe à l'admin et à la secrétaire", () => {
    expect(canSeeAllTasks("admin")).toBe(true);
    expect(canSeeAllTasks("secretaire")).toBe(true);
    expect(canSeeAllTasks("telepro")).toBe(false);
    expect(canSeeAllTasks("stockage")).toBe(false);
    expect(canSeeAllTasks(undefined)).toBe(false);
  });
});

describe("isTaskVisibleTo", () => {
  it("montre au télépro les tâches qu'il reçoit ou qu'il a envoyées, pas les autres", () => {
    expect(isTaskVisibleTo(task({ assigned_to: "me" }), "me", "telepro")).toBe(true);
    expect(isTaskVisibleTo(task({ created_by: "me" }), "me", "telepro")).toBe(true);
    expect(isTaskVisibleTo(task({}), "me", "telepro")).toBe(false);
  });

  it("montre tout à la secrétaire", () => {
    expect(isTaskVisibleTo(task({}), "me", "secretaire")).toBe(true);
  });
});

describe("canDeleteTask", () => {
  it("laisse l'auteur supprimer, pas le simple destinataire", () => {
    expect(canDeleteTask(task({ created_by: "me" }), "me", "telepro")).toBe(true);
    expect(canDeleteTask(task({ assigned_to: "me" }), "me", "telepro")).toBe(false);
    expect(canDeleteTask(task({}), "me", "admin")).toBe(true);
  });
});

describe("isReminderDue", () => {
  it("est vrai dès que l'heure du rappel est passée et que la tâche n'est pas validée", () => {
    expect(isReminderDue(task({ remind_at: "2026-10-24T09:59:00Z" }), NOW)).toBe(true);
    expect(isReminderDue(task({ remind_at: "2026-10-24T10:00:00Z" }), NOW)).toBe(true);
  });

  it("est faux sans rappel, avant l'heure ou une fois validée", () => {
    expect(isReminderDue(task({}), NOW)).toBe(false);
    expect(isReminderDue(task({ remind_at: "2026-10-24T10:01:00Z" }), NOW)).toBe(false);
    expect(
      isReminderDue(
        task({ remind_at: "2026-10-24T09:00:00Z", completed_at: "2026-10-24T09:30:00Z" }),
        NOW
      )
    ).toBe(false);
  });
});

describe("compareTasks", () => {
  it("trie : rappels dépassés, rappels à venir, puis sans rappel du plus récent au plus ancien", () => {
    const overdue = task({ id: "overdue", remind_at: "2026-10-24T08:00:00Z" });
    const soon = task({ id: "soon", remind_at: "2026-10-24T11:00:00Z" });
    const later = task({ id: "later", remind_at: "2026-10-25T11:00:00Z" });
    const recent = task({ id: "recent", created_at: "2026-10-23T10:00:00Z" });
    const old = task({ id: "old", created_at: "2026-10-01T10:00:00Z" });

    const sorted = [old, later, recent, soon, overdue].sort((a, b) => compareTasks(a, b, NOW));
    expect(sorted.map((t) => t.id)).toEqual(["overdue", "soon", "later", "recent", "old"]);
  });
});
