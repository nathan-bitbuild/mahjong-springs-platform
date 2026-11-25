import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { skillLabel } from "@/lib/constants";

export const metadata = { title: "Player directory", robots: { index: false } };

export default async function DirectoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/directory/");
  const member = await prisma.roster.findFirst({ where: { userId: session.user.id, status: "ACTIVE" } });
  if (!member && session.user.role === "PLAYER") {
    return <main id="main" className="content-area"><div className="ms-wrap"><p>The directory is for players on a season roster.</p></div></main>;
  }
  const people = await prisma.user.findMany({
    where: { rosters: { some: { status: "ACTIVE" } } },
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
