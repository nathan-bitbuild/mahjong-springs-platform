import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { LeagueForm } from "@/components/league-form";

export default async function NewLeaguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId && session?.user?.role !== "ADMIN") redirect("/organizer/");
  const org = session?.user?.organizationId
    ? await prisma.organization.findUnique({ where: { id: session.user.organizationId } })
    : null;
  if (!org) redirect("/signup/?organizer=1");
  const query = await searchParams;
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">League builder</div><h1>New league</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 860 }}>
        <LeagueForm isHome={org.isHome} error={query.error} />
      </div></div>
    </main>
  );
}
