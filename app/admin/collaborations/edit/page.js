import { notFound } from "next/navigation";
import { CollaborationForm } from "@/app/admin/collaborations/collaboration-form";
import { PageShell } from "@/app/site-nav";
import { loadCollaborations } from "@/lib/collaborations";

export const dynamic = "force-dynamic";

export default async function EditCollaborationPage({ searchParams }) {
  const params = await searchParams;
  const id = String(params?.id ?? "").trim();

  if (!id) {
    notFound();
  }

  const collaborations = await loadCollaborations({ admin: true });
  const partner = collaborations.find((item) => item.id === id);

  if (!partner) {
    notFound();
  }

  return (
    <PageShell
      active="collaborations-admin"
      eyebrow="Edit brand partner"
      includeAdmin
    >
      <section className="edit-panel">
        <CollaborationForm partner={partner} />
      </section>
    </PageShell>
  );
}
