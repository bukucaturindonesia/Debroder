-- Phase 11 correction: remove the older generic immutable trigger from fulfillment status history.
-- The Phase 11 controlled trigger remains authoritative and permits cleanup only during Super Admin permanent deletion.
drop trigger if exists prevent_fulfillment_status_history_mutation on public.fulfillment_status_history;
