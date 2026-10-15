import type { AuthUser } from "./middleware/auth";
import type { SalesStorage, StorageAccessContext } from "./storage";

export interface AppVariables {
  user: AuthUser;
  storage: SalesStorage;
  requestId: string;
  requestStartedAt: number;
}

export function getStorageContextFromUser(user?: Pick<AuthUser, "organizationId" | "workspaceId">) {
  return {
    organizationId: user?.organizationId ?? null,
    workspaceId: user?.workspaceId ?? null,
  } satisfies StorageAccessContext;
}
