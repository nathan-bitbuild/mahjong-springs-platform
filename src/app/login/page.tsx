import { login } from "@/server/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const query = await searchParams;
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Account</div><h1>Sign in</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 520 }}>
        {query.error ? <p className="notice error">{query.error === "exists" ? "That email already has an account. Sign in instead." : "Those details didn’t match an account."}</p> : null}
        <form className="form-grid panel" action={login}>
          <input type="hidden" name="callbackUrl" value={query.callbackUrl || "/account/"} />
          <label>Email<input type="email" name="email" required autoComplete="email" /></label>
          <label>Password<input type="password" name="password" required autoComplete="current-password" /></label>
          <button className="btn btn-solid" type="submit">Sign in</button>
        </form>
        <p>New here? <a href="/signup/">Create a player account</a> or <a href="/signup/?organizer=1">apply to host a league</a>.</p>
      </div></div>
    </main>
  );
}
