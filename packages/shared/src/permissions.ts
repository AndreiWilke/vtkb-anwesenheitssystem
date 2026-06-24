import { DemoRole } from "./domain.js";

export const AppPermission = {
  CREATE_RETROSPECTIVE_SESSION: "CREATE_RETROSPECTIVE_SESSION",
  MANAGE_TRIAL_PROFILES: "MANAGE_TRIAL_PROFILES",
  CREATE_DIRECT_MEMBER: "CREATE_DIRECT_MEMBER",
  ACTIVATE_CONTRACT: "ACTIVATE_CONTRACT",
  CONVERT_TRIAL_MEMBER: "CONVERT_TRIAL_MEMBER",
  GRANT_TRIAL_OVERRIDE: "GRANT_TRIAL_OVERRIDE",
  CHANGE_BELT: "CHANGE_BELT",
  DECIDE_BELT_SUGGESTION: "DECIDE_BELT_SUGGESTION",
} as const;

export type AppPermission = (typeof AppPermission)[keyof typeof AppPermission];

const ROLE_PERMISSIONS: Record<string, ReadonlySet<AppPermission>> = {
  [DemoRole.BOARD]: new Set(Object.values(AppPermission)),
  [DemoRole.TRAINER]: new Set([
    AppPermission.CREATE_RETROSPECTIVE_SESSION,
    AppPermission.MANAGE_TRIAL_PROFILES,
    AppPermission.CHANGE_BELT,
    AppPermission.DECIDE_BELT_SUGGESTION,
  ]),
  [DemoRole.ASSISTANT_TRAINER]: new Set([
    AppPermission.CREATE_RETROSPECTIVE_SESSION,
    AppPermission.CHANGE_BELT,
    AppPermission.DECIDE_BELT_SUGGESTION,
  ]),
  [DemoRole.TREASURER]: new Set([AppPermission.CREATE_RETROSPECTIVE_SESSION]),
};

export function isDemoRole(role: string): role is (typeof DemoRole)[keyof typeof DemoRole] {
  return Object.values(DemoRole).some((candidate) => candidate === role);
}

export function hasPermission(role: string, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
