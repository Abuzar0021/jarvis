import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getRedirects } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { RedirectsEditor } from "@/components/admin/RedirectsEditor";

export const dynamic = "force-dynamic";

export default async function RedirectsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const redirects = await getRedirects();
  return (
    <AdminShell>
      <PageTitle title="Redirects" description="Manage URL redirects for moved or renamed pages." />
      <RedirectsEditor initial={redirects} />
    </AdminShell>
  );
}
