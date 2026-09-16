export type AuthRole = "parent" | "child";

export type AuthSession = {
  sessionId: string;
  profileId: string;
  familyId: string;
  role: AuthRole;
  displayName?: string;
};
