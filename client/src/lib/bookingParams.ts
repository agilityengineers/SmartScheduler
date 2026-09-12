/**
 * Query-parameter helpers for the public booking page.
 *
 * A booking link is usually reached from somewhere that already knows who the
 * client is — an intake form, a CRM, an email. Letting that caller pass the
 * details through removes a round of re-typing, and letting it pass an opaque
 * reference means the resulting booking can be tied back to its originating
 * record without depending on the client using the same email address twice.
 */

/** Values we refuse to treat as real input. */
const MAX_PARAM_LENGTH = 512;

/**
 * Read a single query parameter from the current URL, trimmed.
 *
 * Returns '' (not null) so the value can seed a controlled input's state
 * directly. Guards against absurd lengths so a crafted link can't stuff the
 * form, and ignores un-substituted merge tags like `{{email}}` — a caller whose
 * templating didn't run should leave the field empty rather than prefill it
 * with a literal placeholder the client then has to delete.
 */
export function readBookingParam(
  key: string,
  search: string = typeof window === 'undefined' ? '' : window.location.search,
): string {
  if (!search) return '';
  let value: string | null;
  try {
    value = new URLSearchParams(search).get(key);
  } catch {
    return '';
  }
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PARAM_LENGTH) return '';
  if (/[{}]/.test(trimmed)) return '';
  return trimmed;
}
