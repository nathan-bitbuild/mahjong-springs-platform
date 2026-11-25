import { US_STATES } from "@/lib/utah";
import { saveLeague } from "@/server/actions";
export function LeagueForm({
  isHome,
  error,
  league,
}: {
  isHome: boolean;
  error?: string;
  league?: {
    id: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    entryFeeCents: number;
    capacity: number;
    venueCity: string;
    venueState: string;
    venueZip: string;
    status: string;
  };
}) {
  const date = (value?: Date) => (value ? value.toISOString().slice(0, 10) : "");
  return (
    <form className="form-grid panel" action={saveLeague}>
      {league ? <input type="hidden" name="leagueId" value={league.id} /> : null}
      {error ? <p className="notice error">{error}</p> : null}
      <label>Title<input name="title" required defaultValue={league?.title} /></label>
      <label>Description<textarea name="description" defaultValue={league?.description} /></label>
      <div className="split">
        <label>Start<input type="date" name="startDate" required defaultValue={date(league?.startDate)} /></label>
        <label>End<input type="date" name="endDate" required defaultValue={date(league?.endDate)} /></label>
      </div>
      <div className="split">
        <label>Entry fee (USD)<input name="entryFee" type="number" min="0" step="0.01" defaultValue={league ? (league.entryFeeCents / 100).toFixed(2) : "80"} /></label>
        <label>Capacity (blank = no limit)<input name="capacity" type="number" min="0" defaultValue={league?.capacity || ""} /></label>
      </div>
      <div className="split">
        <label>City<input name="venueCity" required defaultValue={league?.venueCity} /></label>
        <label>State
          <select name="venueState" required defaultValue={league?.venueState || ""}>
            <option value="">Choose</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code} disabled={state.code === "UT" && !isHome}>
                {state.name}{state.code === "UT" && !isHome ? " — Mahjong Springs only" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>ZIP<input name="venueZip" defaultValue={league?.venueZip} placeholder="Utah ZIP codes (84xxx) are limited to Mahjong Springs" /></label>
      <label>Status
        <select name="status" defaultValue={league?.status || "DRAFT"}>
          <option value="DRAFT">Draft (private)</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="OPEN">Open for sign-up</option>
          <option value="IN_PLAY">In play</option>
          <option value="CLOSED">Closed</option>
        </select>
      </label>
      <p>A $5 booking fee is added at checkout. You keep the entry fee. Players outside Utah are welcome in any league; only Mahjong Springs can place a league in Utah.</p>
      <button className="btn btn-solid" type="submit">{league ? "Save league" : "Create league"}</button>
    </form>
  );
}
