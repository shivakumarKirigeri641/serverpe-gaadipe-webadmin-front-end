import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';
import { State } from '../components/ui.jsx';
import { ago } from '../lib/format';

/**
 * EMAILS TO YOU (user, 2026-10-07: "mail trigger to admin, for me"). Each
 * moment GaadiPe emails the admin about, with its switch and how it has gone
 * in the last 24 hours. Sent from noreply to ADMINMAIL (or the
 * admin_alert_emails setting), each thing once.
 */
export default function Emails() {
  const { can } = useSession();
  const mayChange = can.includes('settings');
  const { data, error, loading, reload } = useLoad((quiet) => api.emails(quiet), [], { everyMs: 60000 });
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState(null);

  const flip = async (row) => {
    setSaving(row.key); setMsg(null);
    try { await api.setEmail(row.key, !row.on); await reload(); setMsg(`${row.label}: ${row.on ? 'off' : 'on'}.`); }
    catch (e) { setMsg(e.message); } finally { setSaving(null); }
  };

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data ? (
        <>
          <h1 className="text-lg font-semibold">Emails to you</h1>
          <p className="text-2xs text-muted">What GaadiPe emails you about. Each thing is emailed once; failed emails are tried again up to five times.</p>

          <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm ${data.configured && data.to.length ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>
            {!data.configured ? 'Email is not set up on the server (MAIL_HOST, NOREPLYMAIL, NOREPLYMAIL_PASSWORD) — nothing is sent.'
              : !data.to.length ? 'No address to send to: set ADMINMAIL in the server’s .env.'
                : <>Sending to <b>{data.to.join(', ')}</b></>}
          </div>
          {msg ? <div className="mt-2 rounded-lg bg-shell px-3 py-2 text-2xs text-body">{msg}</div> : null}

          <div className="card mt-4 divide-y divide-line">
            {data.rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{r.label}</div>
                  {r.hint ? <div className="text-2xs text-muted">{r.hint}</div> : null}
                  <div className="mt-0.5 text-2xs text-muted">
                    {r.sent_day ? `${r.sent_day} sent in 24 h` : 'none in 24 h'}
                    {r.failed_day ? <span className="font-semibold text-wrong-700"> · {r.failed_day} not sent</span> : null}
                    {r.last_sent ? ` · last ${ago(r.last_sent)}` : ''}
                  </div>
                </div>
                {r.exists ? (
                  <button role="switch" aria-checked={r.on} aria-label={r.label} disabled={!mayChange || saving === r.key} onClick={() => flip(r)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${r.on ? 'bg-brand' : 'bg-line'} disabled:opacity-50`}>
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${r.on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                ) : <span className="text-2xs text-watch-700">needs the server update</span>}
              </div>
            ))}
          </div>
          {!mayChange ? <p className="mt-2 text-2xs text-muted">Your admin role can see these but not change them.</p> : null}
          <p className="mt-3 text-2xs text-muted">Every email sent, and any that failed, is in the <Link to="/log" className="font-semibold text-brand">Log</Link> under “Emails to you”.</p>
        </>
      ) : null}
    </State>
  );
}
