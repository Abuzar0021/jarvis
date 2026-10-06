import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getTestimonials } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { TestimonialsEditor } from "@/components/admin/TestimonialsEditor";

export const dynamic = "force-dynamic";

export default async function TestimonialsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const testimonials = await getTestimonials();
  return (
    <AdminShell>
      <PageTitle
        title="Reviews"
        description="Client reviews. Submissions land as pending and only go live once you approve them."
      />
      <TestimonialsEditor initial={testimonials} />
    </AdminShell>
  );
}
