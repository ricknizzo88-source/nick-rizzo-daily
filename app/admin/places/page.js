import { DirectoryGrid } from "@/app/directory-grid";
import { PageShell } from "@/app/site-nav";
import { loadDirectoryPlaces } from "@/lib/directory";

export const dynamic = "force-dynamic";

export default async function ManagePlacesPage() {
  const places = await loadDirectoryPlaces({ admin: true });

  return (
    <PageShell
      active="manage"
      count={`${places.length} places`}
      includeAdmin
      eyebrow="Manage directory"
    >
      <DirectoryGrid admin places={places} />
    </PageShell>
  );
}
