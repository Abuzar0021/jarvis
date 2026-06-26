import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getProjects } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { ProjectsEditor } from "@/components/admin/ProjectsEditor";

export const dynamic = "force-dynamic";

export default async function ProjectsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const projects = await getProjects();
  return (
    <AdminShell>
      <PageTitle title="Projects" description="Add, edit, reorder, or remove portfolio projects." />
      <ProjectsEditor initial={projects} />
    </AdminShell>
  );
}
