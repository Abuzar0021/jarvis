import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getFaqs } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import { FaqsEditor } from "@/components/admin/FaqsEditor";

export const dynamic = "force-dynamic";

export default async function FaqsAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const faqs = await getFaqs();
  return (
    <AdminShell>
      <PageTitle title="FAQs" description="Questions and answers shown on the homepage." />
      <FaqsEditor initial={faqs} />
    </AdminShell>
  );
}
