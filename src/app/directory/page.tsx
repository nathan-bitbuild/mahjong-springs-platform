import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { skillLabel } from "@/lib/constants";

export const metadata = { title: "Player directory", robots: { index: false } };

export default async function DirectoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/directory/");
  const mine = await prisma.roster.findMany({ where: { userId: session.user.id, status: "ACTIVE" }, select: { leagueId: true } });
  const hosted = session.user.organizationId
    ? await prisma.league.findMany({ where: { organizationId: session.user.organizationId }, select: { id: true } })
    : [];
  const leagueIds = [...new Set([...mine.map((row) => row.leagueId), ...hosted.map((league) => league.id)])];
  if (leagueIds.length === 0) {
    return <main id="main" className="content-area"><div className="ms-wrap"><p>The directory shows players from seasons you have joined or host.</p></div></main>;
  }
  const people = await prisma.user.findMany({
    where: { rosters: { some: { status: "ACTIVE", leagueId: { in: leagueIds } } } },
    orderBy: { name: "asc" },
  });
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Members</div><h1>Directory</h1></header>
      <div className="content-area"><div className="ms-wrap">
        <ul>{people.map((person) => <li key={person.id}>{person.displayName || person.name} · {skillLabel(person.skill)}{person.partOfTown ? ` · ${person.partOfTown}` : ""}</li>)}</ul>
      </div></div>
    </main>
  );
}
