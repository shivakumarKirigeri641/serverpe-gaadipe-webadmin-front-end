import { useState } from 'react';
import { api } from '../lib/api';
import { saveBlob } from './ui.jsx';

/*
 * ONE CUSTOMER, EVERYTHING, IN EXCEL (user, 2026-10-08): profile, vehicles,
 * checks, reports, payments, every sign-in with its device and agreement,
 * sessions, visits, agreements, the event trail — and charts. Built on the
 * server (admin/customerExport.js); personal details unmasked only for admins
 * allowed to see them; every export is in the audit log.
 */
export default function CustomerExcel({ id, compact = false }) {
  const [busy, setBusy] = useState(false);
  if (!id) return null;
  const go = async (e) => {
    e?.stopPropagation?.();
    setBusy(true);
    try { const { blob, filename } = await api.customerExcel(id); saveBlob(blob, filename); }
    catch (err) { window.alert(err.message); }
    finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={go} disabled={busy}
      title="Everything about this customer and their vehicles, with charts — as an Excel file"
      className={`btn-quiet ${compact ? '!px-2 !py-0.5 text-[11px]' : '!px-3 !py-1.5 text-2xs'}`}>
      {busy ? 'Preparing…' : compact ? '⬇ Excel' : '⬇ Export to Excel'}
    </button>
  );
}
