import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getServices } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { ServicesEditor } from "@/components/admin/ServicesEditor";

export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const services = await getServices();
  return (
    <AdminShell>
      <PageTitle title="Services" description="Manage the services shown across your site and mega menu." />
      <ServicesEditor initial={services} />
    </AdminShell>
  );
}
