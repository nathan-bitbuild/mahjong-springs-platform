import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { saveProfile } from "@/server/actions";
import { SKILLS } from "@/lib/constants";

export const metadata = { title: "My profile", robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/my-profile/");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login/");
  const query = await searchParams;
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Profile</div><h1>{user.name}</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 640 }}>
        {query.saved ? <p className="notice ok">Saved.</p> : null}
        <form className="form-grid panel" action={saveProfile}>
          <label>Display name<input name="displayName" defaultValue={user.displayName} /></label>
          <label>Skill
            <select name="skill" defaultValue={user.skill}>{SKILLS.map((skill) => <option key={skill.value} value={skill.value}>{skill.label}</option>)}</select>
          </label>
          <label>Part of town<input name="partOfTown" defaultValue={user.partOfTown} /></label>
          <label>Phone<input name="phone" defaultValue={user.phone} /></label>
          <label><input type="checkbox" name="sharePhone" value="1" defaultChecked={user.sharePhone} /> Share my phone with tablemates only</label>
          <label><input type="checkbox" name="emailReminders" value="1" defaultChecked={user.emailReminders} /> Reminders</label>
          <label><input type="checkbox" name="emailHostUpdates" value="1" defaultChecked={user.emailHostUpdates} /> Host updates</label>
          <label><input type="checkbox" name="emailScores" value="1" defaultChecked={user.emailScores} /> Score emails</label>
          <button className="btn btn-solid" type="submit">Save profile</button>
        </form>
      </div></div>
    </main>
  );
}
