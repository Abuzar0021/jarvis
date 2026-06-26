import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const dynamic = "force-dynamic";

export default async function MediaAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  return (
    <AdminShell>
      <PageTitle title="Media" description="Upload, browse, copy URLs, and delete images." />
      <MediaLibrary />
    </AdminShell>
  );
}
