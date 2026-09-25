-- W1 correction: quotation admin pages use the authenticated Supabase client
-- with RLS as the authorization boundary.  The policies existed, but the
-- authenticated table-level SELECT privileges were missing on staging.
-- This forward-only grant does not broaden anonymous access or bypass RLS.

begin;

grant select on public.quotations,
  public.quotation_items,
  public.quotation_status_history,
  public.quotation_versions,
  public.quotation_item_services,
  public.mockup_sets,
  public.mockup_parts,
  public.mockup_approval_history,
  public.mockup_files
to authenticated;

commit;
