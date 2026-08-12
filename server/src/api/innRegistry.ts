/**
 * Minimal stub "registry" for INN/EDRPOU validation.
 *
 * The product requirement says: GET /api/check-inn?inn= → { valid: true|false } based on registry lookup.
 * Until real integration exists, keep deterministic behavior for dev/testing.
 */

const VALID_INNS = new Set<string>([
  '12345678',
  '87654321',
  '1234567890',
  '0987654321',
]);

export function isInnInRegistry(inn: string): boolean {
  return VALID_INNS.has(inn);
}

