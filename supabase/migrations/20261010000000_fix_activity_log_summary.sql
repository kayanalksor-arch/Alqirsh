-- Avoid a PL/pgSQL name collision between the output column and source column.
drop function if exists public.activity_log_summary(timestamptz, timestamptz);

create function public.activity_log_summary(p_since timestamptz default null,p_until timestamptz default null)
returns table(total bigint,successful bigint,failed bigint,active_users bigint,sensitive_count bigint)
language plpgsql security invoker set search_path=public as $$
begin
 if not public.has_section_permission('activity_logs.view') then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;

 return query
  select count(*),
         count(*) filter (where logs.outcome='success'),
         count(*) filter (where logs.outcome<>'success'),
         count(distinct logs.actor_id),
         count(*) filter (where logs.sensitive)
  from public.activity_logs as logs
  where (p_since is null or logs.created_at>=p_since)
    and (p_until is null or logs.created_at<=p_until);
end;
$$;

revoke all on function public.activity_log_summary(timestamptz,timestamptz) from public;
grant execute on function public.activity_log_summary(timestamptz,timestamptz) to authenticated;
