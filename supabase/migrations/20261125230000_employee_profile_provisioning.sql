begin;

-- Auth app metadata is written by the trusted employee creation function.
-- Keep this trigger deferred so existing signup triggers can finish first.
create or replace function public.provision_employee_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  details jsonb := new.raw_user_meta_data;
  employee_department text := details->>'department';
  employee_address text;
begin
  if new.raw_app_meta_data->>'account_type' is distinct from 'employee' then
    return new;
  end if;

  if employee_department is null or employee_department not in ('Management', 'Delivery') then
    raise exception 'Invalid employee department.' using errcode = '22023';
  end if;

  employee_address := pg_catalog.concat_ws(', ',
    nullif(btrim(details->>'street'), ''),
    nullif(btrim(details->>'barangay'), ''),
    nullif(btrim(details->>'city'), ''),
    nullif(btrim(details->>'province'), ''),
    nullif(btrim(details->>'postal_code'), '')
  );

  insert into public.profiles (id, first_name, last_name, middle_initial, phone, address, role, department)
  values (new.id, btrim(details->>'first_name'), btrim(details->>'last_name'),
    nullif(btrim(details->>'middle_initial'), ''), btrim(details->>'phone'),
    employee_address, 'employee', employee_department)
  on conflict (id) do update
    set role = 'employee', department = excluded.department
    where profiles.role in ('user', 'customer', 'employee');

  return new;
end;
$$;

revoke all on function public.provision_employee_profile() from public, anon, authenticated;

drop trigger if exists provision_employee_profile on auth.users;
create constraint trigger provision_employee_profile
after insert on auth.users
deferrable initially deferred
for each row execute function public.provision_employee_profile();

-- Repair existing profiles associated with accounts created as employees.
-- Preserve administrator roles and any valid department already assigned.
update public.profiles p
set role = 'employee',
    department = case when p.department in ('Management', 'Delivery') then p.department
      else u.raw_user_meta_data->>'department' end
from auth.users u
where p.id = u.id
  and u.raw_app_meta_data->>'account_type' = 'employee'
  and u.raw_user_meta_data->>'department' in ('Management', 'Delivery')
  and p.role in ('user', 'customer', 'employee')
  and (p.role <> 'employee' or p.department is null or p.department not in ('Management', 'Delivery'));

-- Check the caller's profile without recursively invoking a profiles policy.
create or replace function public.can_read_employee_directory()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.can_read_employee_directory() from public, anon, authenticated;
grant execute on function public.can_read_employee_directory() to authenticated;

drop policy if exists "Admins can read employee profiles" on public.profiles;
create policy "Admins can read employee profiles"
on public.profiles for select to authenticated
using (role = 'employee' and (select public.can_read_employee_directory()));

commit;
