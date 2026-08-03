do $p15_apply$
declare
  migration_sql text;
  payload_md5 text;
begin
  select
    convert_from(decode(string_agg(payload, '' order by seq), 'base64'), 'UTF8'),
    md5(string_agg(payload, '' order by seq))
  into migration_sql, payload_md5
  from private._p15_migration_stage;

  if payload_md5 <> '7ec51e68c593d027995b97a502fc8354' then
    raise exception 'P15 staged migration checksum mismatch';
  end if;

  execute migration_sql;
end
$p15_apply$;

drop table private._p15_migration_stage;;
