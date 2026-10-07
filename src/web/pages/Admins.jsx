import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';
import { State, Table } from '../components/ui.jsx';
import { ago, dateTime } from '../lib/format';

/**
 * ADMINS (user, 2026-10-07: "only me as admin, but in future I can add one
 * more — make it configurable"; spec §46). The owner adds a person by name and
 * mobile with a role; they sign in with a code sent to that mobile by SMS.
 * Switching someone off signs them out everywhere at once. The last owner can
 * never be removed or demoted, and nobody can switch themselves off.
 */
const ROLES = [
  ['owner', 'Owner — everything, including admins'],
  ['admin', 'Admin — everything except managing admins'],
  ['operations', 'Operations — customers, vehicles, settings'],
  ['support', 'Support — customers, sessions, support'],
  ['finance', 'Finance — payments, revenue, invoices'],
  ['technical', 'Technical — API, errors, system health'],
  ['viewer', 'Viewer — read only, numbers masked'],
];

export default function Admins() {
  const { me } = useSession();
  const { data, error, loading, reload } = useLoad(() => api.admins(), [], { everyMs: 0 });
  const [form, setForm] = useState({ name: '', mobile: '', role: 'support' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ tone: 'good', text: ok }); reload(); } catch (e) { setMsg({ tone: 'bad', text: e.message }); } finally { setBusy(false); }
  };
  return (
    <>
      <h1 className="text-lg font-semibold">Admins</h1>
      <p className="text-2xs text-muted">Who can open the admin panels. A new admin signs in with a code sent by SMS to their mobile. Every change is in the audit log.</p>
      {msg ? <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.tone === 'good' ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>{msg.text}</div> : null}

      <form className="card mt-4 grid gap-3 px-4 py-4 md:grid-cols-4" onSubmit={(e) => {
        e.preventDefault();
        run(() => api.addAdmin(form), `${form.name} can now sign in with ${form.mobile} (role: ${form.role}).`);
      }}>
        <label className="block"><span className="label">Name</span><input className="input !py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} required /></label>
        <label className="block"><span className="label">Mobile (10 digits)</span><input className="input tabular !py-2" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} required /></label>
        <label className="block"><span className="label">Role</span>
          <select className="input !py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <div className="flex items-end"><button className="btn-primary w-full" disabled={busy || form.mobile.length !== 10 || form.name.trim().length < 2}>Add or update admin</button></div>
      </form>

      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload}>
          {data?.rows?.length ? (
            <Table head={['Admin', 'Role', 'Status', 'Last sign-in', 'Added', '']}>
              {data.rows.map((a) => (
                <tr key={a.id}>
                  <td className="td"><div className="text-ink">{a.name}{String(a.id) === String(me?.id) ? <span className="ml-1.5 chip bg-brand/10 text-brand">you</span> : null}</div><div className="tabular text-2xs text-muted">{a.mobile}</div></td>
                  <td className="td">
                    <select className="input !w-auto !py-1 text-2xs" value={a.role} disabled={busy}
                      onChange={(e) => run(() => api.addAdmin({ name: a.name, mobile: a.mobile, role: e.target.value }), `${a.name} is now ${e.target.value}.`)}>
                      {ROLES.map(([k]) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="td">{a.is_active ? <span className="chip bg-good-50 text-good-700">Active</span> : <span className="chip bg-shell text-muted">Switched off</span>}</td>
                  <td className="td text-2xs">{a.last_login_at ? ago(a.last_login_at) : 'never'}</td>
                  <td className="td text-2xs text-muted">{dateTime(a.created_at)}</td>
                  <td className="td">
                    {String(a.id) !== String(me?.id) ? (
                      <button className={`btn-quiet !px-3 !py-1 text-2xs ${a.is_active ? 'text-wrong-700' : ''}`} disabled={busy}
                        onClick={() => { if (!a.is_active || window.confirm(`Switch off ${a.name}? They are signed out everywhere at once.`)) run(() => api.setAdminActive(a.id, !a.is_active), `${a.name} ${a.is_active ? 'switched off and signed out' : 'switched on'}.`); }}>
                        {a.is_active ? 'Switch off' : 'Switch on'}
                      </button>) : null}
                  </td>
                </tr>))}
            </Table>
          ) : null}
        </State>
      </div>
    </>
  );
}
