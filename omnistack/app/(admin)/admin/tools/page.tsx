import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getActivity } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { BackupTools } from "@/components/admin/BackupTools";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ToolsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const activity = await getActivity();

  return (
    <AdminShell>
      <PageTitle title="Tools" description="Backups and a log of recent changes." />
      <div className="space-y-6">
        <BackupTools />

        <div className="rounded-2xl border border-hair bg-surface p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Activity log</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No changes recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hair">
              {activity.slice(0, 50).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-fg/90">
                    <span className="capitalize">{a.action}</span> - {a.detail}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatDate(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
