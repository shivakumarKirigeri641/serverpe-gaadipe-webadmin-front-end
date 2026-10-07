import { useState } from 'react';
import { api } from '../lib/api';
import { useSession, allowed } from '../lib/session';
import { openBlob, saveBlob } from './ui.jsx';

/*
 * A REPORT'S TWO VIEWS, everywhere a report is listed (user, 2026-10-07):
 *   👤 Customer view  the exact PDF the customer received — personal details masked
 *   🔓 Admin view     ADMIN COPY: every detail as stored, unmasked, made fresh for
 *                     the admin, never sent to anyone; each opening is in the
 *                     audit log. Only for admins allowed to see sensitive details.
 * `id` is the report's id (vehicle_reports.id).
 */
export default function ReportButtons({ id, hasPdf = true, compact = false }) {
  const { can } = useSession();
  const [busy, setBusy] = useState(null);
  const mayOpen = allowed(can, 'vehicles.view_sensitive');
  if (!id) return null;
  const get = async (kind, download = false) => {
    setBusy(kind);
    try {
      const { blob, filename } = kind === 'admin' ? await api.reportAdminPdf(id, download) : await api.reportPdf(id, download);
      download ? saveBlob(blob, filename) : openBlob(blob);
    } catch (e) { window.alert(e.message); } finally { setBusy(null); }
  };
  const size = compact ? '!px-2 !py-0.5 text-[11px]' : '!px-2.5 !py-1 text-2xs';
  return (
    <span className="inline-flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={`btn-quiet ${size}`} disabled={!hasPdf || busy}
        title="The exact PDF the customer received — personal details masked" onClick={() => get('customer')}>
        {busy === 'customer' ? '…' : '👤 Customer view'}
      </button>
      {mayOpen ? (
        <button type="button" disabled={Boolean(busy)}
          className={`rounded-lg border border-wrong-500 font-semibold text-wrong-700 hover:bg-wrong-50 disabled:opacity-50 ${size}`}
          title="ADMIN COPY — every detail as stored, unmasked. Never sent to the customer; logged." onClick={() => get('admin')}>
          {busy === 'admin' ? '…' : '🔓 Admin view'}
        </button>) : null}
    </span>
  );
}
