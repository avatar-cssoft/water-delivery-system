-- PRODUCTS: ANYONE CAN READ, ONLY ADMINS CAN WRITE, CHANGES ARE BROADCAST LIVE
--
-- Run once in the Supabase SQL Editor (or with `supabase db push`).
-- Safe to re-run: every step checks or replaces what it creates.
--
-- After running it, make yourself an admin in Table Editor > profiles by setting
-- your row's role to 'admin'. The dashboard is allowed to do this; the website is not.

-- 1. HELPER: IS THE SIGNED-IN USER AN ADMIN?
-- security definer so it can read profiles even after RLS is turned on there.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and role = 'admin'
    );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. ROW LEVEL SECURITY ON PRODUCTS
alter table public.products enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
    on public.products for select
    to anon, authenticated
    using (true);

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
    on public.products for insert
    to authenticated
    with check ((select public.is_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
    on public.products for update
    to authenticated
    using ((select public.is_admin()))
    with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
    on public.products for delete
    to authenticated
    using ((select public.is_admin()));

-- 3. DATA CHECKS (the admin form validates too, but it can be bypassed)
alter table public.products drop constraint if exists products_price_positive;
alter table public.products add constraint products_price_positive check (price > 0);

alter table public.products drop constraint if exists products_stock_not_negative;
alter table public.products add constraint products_stock_not_negative check (stock >= 0);

-- 4. STOP USERS FROM MAKING THEMSELVES ADMIN
-- profiles has no RLS yet, and Register.tsx sends the role from the browser, so
-- without this anyone could set role = 'admin' and pass the policies above.
-- Website users (anon / authenticated) can only create 'user' profiles and can't
-- change a role unless they are already an admin. The dashboard and SQL Editor
-- (postgres / service_role) are not affected.
-- Must stay security invoker (the default): current_user has to be the caller's
-- role, and in a security definer function it would be the owner (postgres).
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if current_user in ('anon', 'authenticated') and not public.is_admin() then
        if tg_op = 'INSERT' and new.role is distinct from 'user' then
            raise exception 'Only admins can set a role other than user.'
                using errcode = '42501';
        end if;

        if tg_op = 'UPDATE' and new.role is distinct from old.role then
            raise exception 'Only admins can change roles.'
                using errcode = '42501';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
    before insert or update on public.profiles
    for each row execute function public.guard_profile_role();

-- 5. REALTIME: BROADCAST PRODUCT CHANGES SO THE CATALOG UPDATES WITHOUT A REFRESH
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'products'
    ) then
        alter publication supabase_realtime add table public.products;
    end if;
end;
$$;
