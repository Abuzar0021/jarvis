import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSite } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const site = await getSite();
  return (
    <AdminShell>
      <PageTitle title="Site content" description="Edit the text and details across your whole website." />
      <ContentEditor initial={site} />
    </AdminShell>
  );
}
