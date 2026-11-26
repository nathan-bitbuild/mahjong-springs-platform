"use client";

import { useState } from "react";
import { AWARD_COPY, type AwardKey, type AwardRow } from "@/lib/awards";

export function AwardBoard({
  boards,
}: {
  boards: Record<AwardKey, { rows: AwardRow[]; waiting: AwardRow[] }>;
}) {
  const keys: AwardKey[] = ["spring", "tile", "consistency", "table"];
  const [active, setActive] = useState<AwardKey>("spring");
  const board = boards[active];
  return (
    <div>
      <div className="award-tabs" role="tablist">
        {keys.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => setActive(key)}>
            {AWARD_COPY[key].label}
          </button>
        ))}
      </div>
      <p><strong>{AWARD_COPY[active].tagline}.</strong> {AWARD_COPY[active].desc}</p>
      <table className="data-table">
        <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Sessions</th></tr></thead>
        <tbody>
          {board.rows.length === 0 ? <tr><td colSpan={4}>No confirmed sessions yet.</td></tr> : board.rows.map((row) => (
            <tr key={row.userId}>
              <td>{row.rank}</td>
              <td>{row.name}</td>
              <td>{row.value}{active === "tile" && row.date ? ` · ${row.date.slice(0, 10)}` : ""}</td>
              <td>{row.sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {active === "consistency" && board.waiting.length ? (
        <>
          <h3>Still qualifying</h3>
          <ul>{board.waiting.map((row) => <li key={row.userId}>{row.name}: {row.need} more sessions to qualify</li>)}</ul>
        </>
      ) : null}
    </div>
  );
}
