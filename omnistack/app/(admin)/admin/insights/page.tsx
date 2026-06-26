import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getPosts } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { PostsEditor } from "@/components/admin/PostsEditor";

export const dynamic = "force-dynamic";

export default async function InsightsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const posts = await getPosts();
  return (
    <AdminShell>
      <PageTitle title="Insights" description="Write and manage blog articles." />
      <PostsEditor initial={posts} />
    </AdminShell>
  );
}
