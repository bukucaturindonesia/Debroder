/**
 * @deprecated Shared static tokens are not an authorization boundary.
 * Use a canonical actor/session guard such as requirePhase13Actor instead.
 *
 * This compatibility shim is deliberately fail-closed so an old import cannot
 * silently reopen a mutation route in development or production.
 */
export function isAdminRequest(_request: Request): boolean {
  return false;
}
