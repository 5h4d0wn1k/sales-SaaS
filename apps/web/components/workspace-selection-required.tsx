import type { WorkspaceMembershipList } from "@sales/shared";
import { WorkspaceSwitcher } from "./workspace-switcher";

type WorkspaceSelectionRequiredProps = {
  memberships: WorkspaceMembershipList["memberships"];
  returnTo?: string;
  title?: string;
  description?: string;
};

export function WorkspaceSelectionRequired({
  memberships,
  returnTo = "/dashboard",
  title = "Choose the workspace you want to operate inside.",
  description = "Your account has access to more than one workspace. Pick the active scope first so dashboard data, approvals, outreach, and billing actions stay tenant-safe.",
}: WorkspaceSelectionRequiredProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_22%,#f8fafc_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[2rem] border border-orange-100 bg-white/90 p-8 shadow-xl shadow-orange-100/50">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Workspace selection required
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {description}
          </p>
        </div>

        {memberships.length > 0 ? (
          <WorkspaceSwitcher memberships={memberships} returnTo={returnTo} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
            We could not load your workspace assignments yet. Please retry in a moment or contact
            support if this keeps happening.
          </div>
        )}
      </div>
    </main>
  );
}
