revoke all on function public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb) from public,anon,authenticated;
revoke all on function public.update_fulfillment_draft(uuid,text,text,text,text,integer,timestamptz,text) from public,anon,authenticated;
revoke all on function public.update_fulfillment_tracking(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.transition_fulfillment_status(uuid,text,text) from public,anon,authenticated;
revoke all on function public.refresh_order_fulfillment_status(uuid) from public,anon,authenticated;

revoke all on function public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb,text) from public,anon;
revoke all on function public.update_fulfillment_details(uuid,text,text,text,text,text,integer,timestamptz,text,text) from public,anon;
revoke all on function public.transition_fulfillment_status(uuid,text,text,text) from public,anon;
revoke all on function public.register_fulfillment_file(uuid,text,text,text,text,bigint) from public,anon;
revoke all on function public.remove_fulfillment_file(uuid) from public,anon;
revoke all on function public.archive_fulfillment(uuid,text) from public,anon;
revoke all on function public.restore_fulfillment(uuid) from public,anon;
revoke all on function public.permanently_delete_fulfillment(uuid) from public,anon;

grant execute on function public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb,text) to authenticated;
grant execute on function public.update_fulfillment_details(uuid,text,text,text,text,text,integer,timestamptz,text,text) to authenticated;
grant execute on function public.transition_fulfillment_status(uuid,text,text,text) to authenticated;
grant execute on function public.register_fulfillment_file(uuid,text,text,text,text,bigint) to authenticated;
grant execute on function public.remove_fulfillment_file(uuid) to authenticated;
grant execute on function public.archive_fulfillment(uuid,text) to authenticated;
grant execute on function public.restore_fulfillment(uuid) to authenticated;
grant execute on function public.permanently_delete_fulfillment(uuid) to authenticated;
grant execute on function public.refresh_order_fulfillment_status(uuid) to service_role;
