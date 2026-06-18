import { DirectoryGrid } from "@/app/directory-grid";
import { PageShell } from "@/app/site-nav";
import { loadDirectoryPlaces } from "@/lib/directory";

export const dynamic = "force-dynamic";

export default async function HiddenPlacesPage() {
  const places = (await loadDirectoryPlaces({ admin: true })).filter(
    (place) => place.videos.length === 0
  );

  return (
    <PageShell
      active="hidden"
      count={`${places.length} hidden`}
      includeAdmin
      eyebrow="Hidden places"
    >
      <DirectoryGrid
        admin
        emptyMessage="No hidden places right now."
        places={places}
      />
    </PageShell>
  );
}
