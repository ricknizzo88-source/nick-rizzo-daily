import { WorkWithMeEditor } from "@/app/admin/work-with-me/work-with-me-editor";
import { PageShell } from "@/app/site-nav";
import { loadWorkWithMeContent } from "@/lib/work-with-me";

export const dynamic = "force-dynamic";

export default async function AdminWorkWithMePage({ searchParams }) {
  const params = await searchParams;
  const content = await loadWorkWithMeContent({ admin: true });

  return (
    <PageShell active="work-admin" eyebrow="Edit Work With Me" includeAdmin>
      <section className="edit-panel">
        {params?.saved ? (
          <div className="success-state">Work With Me changes saved.</div>
        ) : null}
        {params?.error ? (
          <div className="error-state">{params.error}</div>
        ) : null}
        <WorkWithMeEditor content={content} />
      </section>
    </PageShell>
  );
}
