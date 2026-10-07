/**
 * ALERT SOUNDS (spec §77–78), drawn by the browser (Web Audio) — no files.
 *
 *   critical  three firm falling notes
 *   warning   two short notes
 *   success   two rising bells
 *   info      one soft drop
 *
 * Never a stream of noise: a COOLDOWN per severity (one sound per window,
 * however many alerts), and several alerts arriving together play once — the
 * most serious of them. Browsers allow sound only after the admin has clicked
 * or typed on the page once; until then it stays silent instead of failing.
 */

export const SEVERITIES = ['critical', 'warning', 'success', 'info'];
export const DEFAULT_SOUND = { master: true, critical: true, warning: true, success: true, info: false, volume: 70, cooldown: 30 };

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(a, { f, start, dur, gain, type = 'sine' }) {
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.05);
}

const SHAPES = {
  critical: [[880, 0, 0.22], [660, 0.24, 0.22], [440, 0.48, 0.32]],
  warning: [[740, 0, 0.16], [587, 0.2, 0.2]],
  success: [[784, 0, 0.25], [1175, 0.18, 0.45]],
  info: [[660, 0, 0.3]],
};

const last = {};
/** Play one severity's sound if settings allow and its cooldown has passed. `force` is the Test button. */
export function play(severity, settings = DEFAULT_SOUND, { force = false } = {}) {
  const s = { ...DEFAULT_SOUND, ...settings };
  if (!force && (!s.master || !s[severity])) return false;
  const now = Date.now();
  if (!force && last[severity] && now - last[severity] < s.cooldown * 1000) return false;
  const a = audio();
  if (!a) return false;
  last[severity] = now;
  const vol = Math.max(0, Math.min(1, (Number(s.volume) || 0) / 100)) * 0.35;
  for (const [f, start, dur] of SHAPES[severity] || SHAPES.info) {
    tone(a, { f, start, dur, gain: Math.max(0.0002, vol), type: severity === 'critical' ? 'triangle' : 'sine' });
  }
  return true;
}

/** Several arriving together: the most serious one plays. */
export function playMost(severities, settings) {
  for (const sev of SEVERITIES) if (severities.includes(sev)) return play(sev, settings);
  return false;
}
