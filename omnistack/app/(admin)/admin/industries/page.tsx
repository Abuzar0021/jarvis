import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getIndustries } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { IndustriesEditor } from "@/components/admin/IndustriesEditor";

export const dynamic = "force-dynamic";

export default async function IndustriesAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const industries = await getIndustries();
  return (
    <AdminShell>
      <PageTitle title="Industries" description="Manage industry landing pages." />
      <IndustriesEditor initial={industries} />
    </AdminShell>
  );
}
