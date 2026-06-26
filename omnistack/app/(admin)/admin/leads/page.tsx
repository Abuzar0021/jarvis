import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getLeads } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { LeadsBoard } from "@/components/admin/LeadsBoard";

export const dynamic = "force-dynamic";

export default async function LeadsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const leads = await getLeads();
  return (
    <AdminShell>
      <PageTitle title="Leads" description="Enquiries from your contact and newsletter forms." />
      <LeadsBoard initial={leads} />
    </AdminShell>
  );
}
