import { dateTime } from '../lib/format';
import { Hint } from './ui.jsx';

/*
 * THE AGREEMENT AT A SIGN-IN (user, 2026-10-08): the Terms, Privacy and Refund
 * policies ticked before signing in — when, and which versions. From the
 * consent_accepted record the sign-in wrote (back end customers.CONSENT_OF):
 * a row carries consent_at and consent.
 */
const DOC_NAMES = { terms: 'Terms of use', privacy: 'Privacy policy', refund: 'Refund policy' };

export function consentOf(r) {
  if (!r?.consent_at) return null;
  let c = r.consent;
  try { c = typeof c === 'string' ? JSON.parse(c) : c; } catch { c = null; }
  const docs = (c?.documents || ['terms', 'privacy', 'refund']).map((d) => DOC_NAMES[d] || d);
  const v = c?.versions || {};
  const versions = Object.entries(v).filter(([, x]) => x).map(([k, x]) => `${DOC_NAMES[k] || k} v${x}`).join(' · ')
    || (c?.policy_version ? `v${c.policy_version}` : null);
  // How it was given: by signing in under the notice (from 2026-10-08), or the earlier tick.
  const how = c?.method === 'sign_in' ? 'by signing in' : 'by ticking “I agree”';
  return { at: r.consent_at, docs: docs.join(', '), versions, ip: c?.ip || null, how, notice: c?.notice || null };
}

/** "✓ Terms agreed · 08 Oct 2026, 06:21" under a sign-in, the versions on hover. */
export function ConsentChip({ r }) {
  const c = consentOf(r);
  if (!c) return <div className="mt-0.5 text-2xs text-wrong-700">No agreement recorded</div>;
  return (
    <Hint note={`Agreed to ${c.docs} ${c.how} at ${dateTime(c.at)}${c.versions ? ` — ${c.versions}` : ''}${c.notice ? `\nShown: “${c.notice}”` : ''}`}>
      <div className="mt-0.5 text-2xs font-semibold text-good-700">✓ Terms agreed {c.how} · {dateTime(c.at)}</div>
    </Hint>
  );
}
