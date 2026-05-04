import type { WorkspaceMembershipList } from "@sales/shared";

type WorkspaceSwitcherProps = {
  memberships: WorkspaceMembershipList["memberships"];
  returnTo?: string;
  compact?: boolean;
};

export function WorkspaceSwitcher({
  memberships,
  returnTo = "/dashboard",
  compact = false,
}: WorkspaceSwitcherProps) {
  const activeMembership = memberships.find((membership) => membership.active) ?? memberships[0];
  const canSwitch = memberships.length > 1;

  return (
    <form
      action="/api/account/workspaces/select"
      method="post"
      className={compact ? "space-y-3" : "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active workspace
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            {activeMembership?.workspaceName ?? "Choose a workspace"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {canSwitch
              ? "Switch the scoped workspace explicitly instead of relying on hidden defaults."
              : "This account currently has access to one workspace."}
          </p>
        </div>
        {canSwitch ? (
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Switch workspace
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <label htmlFor="workspaceId" className="text-sm font-medium text-slate-800">
          Workspace scope
        </label>
        <select
          id="workspaceId"
          name="workspaceId"
          defaultValue={activeMembership?.workspaceId}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500"
        >
          {memberships.map((membership) => (
            <option key={membership.workspaceId} value={membership.workspaceId}>
              {membership.organizationName} / {membership.workspaceName} ({membership.role})
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
