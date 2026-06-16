import { DirectoryGrid } from "@/app/directory-grid";
import { PageShell } from "@/app/site-nav";
import { loadDirectoryPlaces } from "@/lib/directory";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await loadDirectoryPlaces();

  return (
    <PageShell active="food" count={`${places.length} places`} socials>
      <DirectoryGrid places={places} />
    </PageShell>
  );
}
