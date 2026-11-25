-- Apply after the application's orders, deliveries, profiles and addresses tables exist.
begin;

alter table public.addresses
  add column delivery_latitude double precision,
  add column delivery_longitude double precision,
  add column delivery_instructions text,
  add constraint address_delivery_point check (
    (delivery_latitude is null and delivery_longitude is null) or
    (delivery_latitude is not null and delivery_longitude is not null
      and delivery_latitude between -90 and 90 and delivery_longitude between -180 and 180)
  );

alter table public.orders
  add column delivery_latitude double precision,
  add column delivery_longitude double precision,
  add column delivery_instructions text,
  add column tracking_updated_at timestamptz,
  add constraint order_delivery_point check (
    (delivery_latitude is null and delivery_longitude is null) or
    (delivery_latitude is not null and delivery_longitude is not null
      and delivery_latitude between -90 and 90 and delivery_longitude between -180 and 180)
  );

create table public.delivery_positions (
  delivery_id bigint primary key references public.deliveries(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision not null check (accuracy between 0 and 100000),
  captured_at timestamptz not null
);

alter table public.delivery_positions enable row level security;
revoke all on public.delivery_positions from public, anon, authenticated;

create function public.clear_inactive_delivery_position() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.employee_id is distinct from old.employee_id
     or new.order_id is distinct from old.order_id
     or new.status not in ('in_progress', 'out_for_delivery') then
    delete from public.delivery_positions where delivery_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.clear_inactive_delivery_position() from public;
create trigger clear_inactive_delivery_position
after update of employee_id, order_id, status on public.deliveries
for each row execute function public.clear_inactive_delivery_position();

create function public.update_order_tracking() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.tracking_updated_at := now();
  elsif new.status is distinct from old.status then
    new.tracking_updated_at := now();
    if new.status <> 'out_for_delivery' then
      delete from public.delivery_positions p using public.deliveries d
      where p.delivery_id = d.id and d.order_id = new.id;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.update_order_tracking() from public;
create trigger update_order_tracking
before insert or update of status on public.orders
for each row execute function public.update_order_tracking();

create index if not exists deliveries_tracking_order_id_idx on public.deliveries(order_id);
create index if not exists orders_tracking_user_id_idx on public.orders(user_id);

create function public.set_rider_delivery_status(target_delivery_id bigint, next_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_delivery public.deliveries%rowtype;
begin
  select o.* into target_order from public.orders o
  join public.deliveries d on d.order_id = o.id
  where d.id = target_delivery_id and d.employee_id = auth.uid() for update of o;

  select * into target_delivery from public.deliveries
  where id = target_delivery_id and order_id = target_order.id and employee_id = auth.uid() for update;

  if target_delivery.id is null or target_order.status in ('delivered', 'cancelled', 'canceled') then
    raise exception 'Delivery is unavailable' using errcode = '42501';
  end if;

  if not coalesce(
    (next_status = 'out_for_delivery' and target_delivery.status = 'assigned')
    or (next_status = 'delivered' and target_delivery.status in ('in_progress', 'out_for_delivery')),
    false
  ) then
    raise exception 'Invalid delivery status transition' using errcode = '22023';
  end if;

  update public.deliveries
  set status = next_status,
      delivery_date = case when next_status = 'delivered' then now() else delivery_date end
  where id = target_delivery_id;
  update public.orders set status = next_status where id = target_order.id;
end;
$$;

create function public.publish_delivery_position(
  target_delivery_id bigint,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  captured_at timestamptz
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  active_order_id bigint;
begin
  select o.id into active_order_id from public.orders o
  join public.deliveries d on d.order_id = o.id
  where d.id = target_delivery_id and d.employee_id = auth.uid()
    and o.status = 'out_for_delivery'
  for update of o;

  perform 1 from public.deliveries d
  where d.id = target_delivery_id and d.employee_id = auth.uid()
    and d.order_id = active_order_id and d.status in ('in_progress', 'out_for_delivery')
  for update;
  if not found then
    raise exception 'Delivery is unavailable' using errcode = '42501';
  end if;

  if captured_at is null or captured_at < now() - interval '2 minutes'
     or captured_at > now() + interval '30 seconds' then
    raise exception 'Invalid location timestamp' using errcode = '22023';
  end if;

  insert into public.delivery_positions as p (delivery_id, latitude, longitude, accuracy, captured_at)
  values (target_delivery_id, $2, $3, $4, $5)
  on conflict (delivery_id) do update
    set latitude = excluded.latitude, longitude = excluded.longitude,
        accuracy = excluded.accuracy, captured_at = excluded.captured_at
    where excluded.captured_at > p.captured_at;
end;
$$;

create function public.clear_delivery_position(target_delivery_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.deliveries where id = target_delivery_id and employee_id = auth.uid() for update;
  if not found then
    raise exception 'Delivery is unavailable' using errcode = '42501';
  end if;
  delete from public.delivery_positions where delivery_id = target_delivery_id;
end;
$$;

create function public.get_delivery_position(target_order_id bigint)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'latitude', p.latitude, 'longitude', p.longitude,
    'accuracy', p.accuracy, 'captured_at', p.captured_at
  )
  from public.delivery_positions p
  join public.deliveries d on d.id = p.delivery_id
  join public.orders o on o.id = d.order_id
  where o.id = target_order_id and o.status = 'out_for_delivery'
    and d.employee_id is not null and d.status in ('in_progress', 'out_for_delivery')
    and p.captured_at > now() - interval '15 minutes'
    and (o.user_id = auth.uid() or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ))
  order by p.captured_at desc
  limit 1;
$$;

revoke all on function public.set_rider_delivery_status(bigint, text) from public, anon;
revoke all on function public.publish_delivery_position(bigint, double precision, double precision, double precision, timestamptz) from public, anon;
revoke all on function public.clear_delivery_position(bigint) from public, anon;
revoke all on function public.get_delivery_position(bigint) from public, anon;
grant execute on function public.set_rider_delivery_status(bigint, text) to authenticated;
grant execute on function public.publish_delivery_position(bigint, double precision, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.clear_delivery_position(bigint) to authenticated;
grant execute on function public.get_delivery_position(bigint) to authenticated;

create function public.get_customer_tracking_orders(target_order_id bigint default null)
returns table (
  id bigint, order_reference text, status text, order_date timestamptz,
  tracking_updated_at timestamptz, delivery_address text,
  delivery_latitude double precision, delivery_longitude double precision
)
language sql stable security definer set search_path = ''
as $$
  select o.id, to_jsonb(o)->>'order_reference', o.status::text, o.order_date,
    o.tracking_updated_at, o.delivery_address, o.delivery_latitude, o.delivery_longitude
  from public.orders o
  where o.user_id = auth.uid() and (target_order_id is null or o.id = target_order_id)
  order by o.id desc;
$$;
revoke all on function public.get_customer_tracking_orders(bigint) from public, anon;
grant execute on function public.get_customer_tracking_orders(bigint) to authenticated;

commit;
