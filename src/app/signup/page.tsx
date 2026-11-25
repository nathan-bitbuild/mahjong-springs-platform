import { signup } from "@/server/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ organizer?: string }> }) {
  const query = await searchParams;
  const organizer = query.organizer === "1";
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">{organizer ? "Organizer" : "Player"}</div><h1>{organizer ? "Host a league" : "Create an account"}</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 560 }}>
        <form className="form-grid panel" action={signup}>
          <input type="hidden" name="asOrganizer" value={organizer ? "1" : "0"} />
          <label>Name<input name="name" required autoComplete="given-name" /></label>
          {organizer ? <label>Organization name<input name="orgName" placeholder="Your league’s name" /></label> : null}
          <label>Email<input type="email" name="email" required /></label>
          <label>Password<input type="password" name="password" required minLength={8} /></label>
          {organizer ? <p>New organizers stay in the approval queue until Mahjong Springs approves them. Leagues in Utah can only be created by Mahjong Springs. You’ll connect Stripe before players can pay.</p> : null}
          <button className="btn btn-solid" type="submit">{organizer ? "Apply" : "Create account"}</button>
        </form>
      </div></div>
    </main>
  );
}
