import Link from "next/link";
import { FLAG_LABELS } from "@/lib/admin/flags";
import { metricsCsv } from "@/lib/admin/metrics";
import { adminWeek, loadAdminData, requireAdmin } from "@/server/adminData";
import { kstDate } from "@/server/ticketAwards";
import { createDrawAction, disputeAction, resolveReportAction, runDrawAction } from "./actions";
import { CopyButton, SeedHelper } from "./tools";
import home from "@/components/home/home.module.css";
import styles from "./admin.module.css";

export const metadata = { title: "HelpLoop | Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ week?: string; msg?: string; err?: string }> }) {
  const { db } = await requireAdmin();
  const params = await searchParams;
  const week = adminWeek(params.week);
  const data = await loadAdminData(db, week);
  const shift = (days: number) => kstDate(new Date(week.start.getTime() + days * DAY_MS));
  const weekOver = data.weekOver;
  const drawn = !!data.draw?.drawn_at;

  return <main className={home.app}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>← HelpLoop admin</Link></header></div>
    <div className={styles.body}>
      <nav className={styles.weeks} aria-label="Week">
        <Link href={`/admin?week=${shift(-7)}`}>← Previous</Link>
        <h1>Week of {week.key} <small>(KST, Monday start)</small></h1>
        <Link href={`/admin?week=${shift(7)}`}>Next →</Link>
      </nav>
      {params.msg && <p role="status" className={styles.ok}>{params.msg}</p>}
      {params.err && <p role="alert" className={styles.err}>{params.err}</p>}

      <section>
        <h2>Draw</h2>
        {!data.draw && <form action={createDrawAction} className={styles.form}>
          <input type="hidden" name="week" value={week.key} />
          <p>Publish the commitment before the week&apos;s sessions. Generate the seed here (it stays in this browser) or paste a hash you made yourself.</p>
          <SeedHelper hashInput="draw-hash" />
          <label>Commit hash (sha256 of the seed)<input id="draw-hash" name="hash" required pattern="[0-9a-fA-F]{64}" autoComplete="off" /></label>
          <label>Prizes, one per line, in draw order<textarea name="prizes" rows={3} required placeholder={"₩30,000 café voucher\nCoffee chat with a senior"} /></label>
          <button className={styles.primary}>Publish draw</button>
        </form>}
        {data.draw && <>
          <p>Prizes: {data.draw.prizes.join(" · ")}</p>
          <p>Commit hash: <code>{data.draw.commit_hash}</code></p>
          {!drawn && <form action={runDrawAction} className={styles.form}>
            <input type="hidden" name="week" value={week.key} />
            <p>{weekOver ? "The week is over. Reveal the seed to run the draw: it recomputes tickets, checks the seed against the hash and saves the winners."
              : `The draw opens when the week ends (${shift(7)} 00:00 KST), so the ticket table is final.`}</p>
            <label>Seed<input name="seed" required autoComplete="off" disabled={!weekOver} /></label>
            <button className={styles.primary} disabled={!weekOver}>Run draw</button>
          </form>}
          {drawn && <>
            <p>Drawn {when.format(new Date(data.draw.drawn_at!))}. Seed: <code>{data.draw.seed}</code></p>
            <h3>Winners: check in person before handing over a prize</h3>
            <table><thead><tr><th>Prize</th><th>Winner</th><th>Real name · student no.</th><th>Helped this week</th></tr></thead>
              <tbody>{data.verification.map((w) => <tr key={w.user_id}><td>{w.prize}</td><td>{w.display_name}</td>
                <td>{w.realName} · {w.studentNo}</td>
                <td>{w.partners.map((p) => `${p.name} (${p.realName})`).join(", ") || "—"}</td></tr>)}</tbody></table>
          </>}
        </>}
      </section>

      <section>
        <h2>Ticket pool <small>{data.pool.length} students · {data.weekSessions} completed sessions</small></h2>
        {data.pool.length === 0 ? <p>No tickets this week yet.</p> :
          <table><thead><tr><th>Student</th><th>Tickets (capped)</th></tr></thead>
            <tbody>{data.pool.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.tickets}</td></tr>)}</tbody></table>}
      </section>

      <section>
        <h2>Sessions to check <small>{data.flagged.length} flagged</small></h2>
        <p>Flags are reasons to ask, not proof. Disputing removes a session&apos;s tickets (credits stay); it isn&apos;t possible after the week&apos;s draw.</p>
        {data.flagged.length === 0 && <p>Nothing flagged this week.</p>}
        {data.flagged.map((s) => <article key={s.id} className={styles.card}>
          <p><strong>{s.helper} → {s.asker}</strong> · {s.minutes} min · rating {s.rating ?? "—"} · {s.tickets ?? 0} tickets
            {s.completedAt && <> · {when.format(new Date(s.completedAt))}</>}</p>
          <ul>{s.flags.map((f) => <li key={f}>{FLAG_LABELS[f]}</li>)}</ul>
          {s.covered && <p className={styles.quote}>“{s.covered}”</p>}
          {!drawn && <form action={disputeAction}><input type="hidden" name="week" value={week.key} />
            <button name="session" value={s.id}>Dispute: remove its tickets</button></form>}
        </article>)}
      </section>

      <section>
        <h2>Open reports <small>{data.reports.length}</small></h2>
        {data.reports.length === 0 && <p>No open reports.</p>}
        {data.reports.map((r) => <article key={r.id} className={styles.card}>
          <p><strong>{r.reporter}</strong> · {when.format(new Date(r.createdAt))} · {r.session}</p>
          <p className={styles.quote}>{r.reason}</p>
          <form action={resolveReportAction}><input type="hidden" name="week" value={week.key} />
            <button name="report" value={r.id}>Mark resolved</button></form>
        </article>)}
      </section>

      <section>
        <h2>Pilot metrics <small>all time</small></h2>
        <div className={styles.tiles}>{data.metrics.map((m) => <div key={m.key}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div>
        <CopyButton text={metricsCsv(data.metrics)} label="Copy CSV" />
      </section>
    </div>
  </main>;
}
