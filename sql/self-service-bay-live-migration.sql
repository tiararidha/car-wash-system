begin;

create extension if not exists pg_cron with schema pg_catalog;

alter table public.transactions
  add column if not exists completed_at timestamptz;

create or replace function public.reconcile_self_service_transactions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reconciliation_time timestamptz := clock_timestamp();
  completed_count integer := 0;
  activated_count integer := 0;
begin
  update public.transactions t
  set transaction_status = 'COMPLETED',
      queue_status = 'COMPLETED',
      completed_at = coalesce(
        t.completed_at,
        ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
          + make_interval(mins => t.duration_minutes)
      )
  from public.services_products service
  where service.id = t.item_id
    and service.category = 'SELF_SERVICE'
    and t.item_type = 'SERVICE'
    and t.bay_number between 1 and 4
    and t.transaction_status in ('BOOKED', 'ACTIVE')
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
        + make_interval(mins => t.duration_minutes) <= reconciliation_time;
  get diagnostics completed_count = row_count;

  update public.transactions t
  set transaction_status = 'ACTIVE'
  from public.services_products service
  where service.id = t.item_id
    and service.category = 'SELF_SERVICE'
    and t.item_type = 'SERVICE'
    and t.bay_number between 1 and 4
    and t.transaction_status = 'BOOKED'
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') <= reconciliation_time
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
        + make_interval(mins => t.duration_minutes) > reconciliation_time;
  get diagnostics activated_count = row_count;

  return completed_count + activated_count;
end;
$$;

create or replace function public.get_public_bay_status()
returns table(
  bay_number integer,
  bay_status text,
  vehicle_type text,
  duration_minutes integer,
  minutes_remaining integer,
  booking_time time
)
language sql
stable
security definer
set search_path = public
as $$
  select bays.bay_number,
         case when active.transaction_status in ('BOOKED', 'ACTIVE') then 'OCCUPIED'
              else 'AVAILABLE' end,
         vehicle.type,
         coalesce(active.duration_minutes, 0),
         case when active.transaction_status in ('BOOKED', 'ACTIVE') then
           greatest(
             0,
             active.duration_minutes - floor(
               extract(epoch from (
                 now()
                 - ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta')
               )) / 60
             )::integer
           )
           else 0 end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select t.*
    from public.transactions t
    join public.services_products service on service.id = t.item_id
    where t.bay_number = bays.bay_number
      and t.item_type = 'SERVICE'
      and service.category = 'SELF_SERVICE'
        and t.transaction_status in ('BOOKED', 'ACTIVE')
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') <= now()
      and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
          + make_interval(mins => t.duration_minutes) > now()
    order by ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') asc
    limit 1
  ) active on true
  left join public.vehicles vehicle on vehicle.id = active.vehicle_id
  order by bays.bay_number;
$$;

create or replace function public.record_service_transaction(
  p_transaction jsonb,
  p_addon_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wash_service public.services_products%rowtype;
  addon public.services_products%rowtype;
  saved_transaction public.transactions%rowtype;
  selected_vehicle public.vehicles%rowtype;
  transaction_kind text;
  service_duration integer;
  total_duration integer;
  base_price integer;
  final_amount integer;
  bay integer;
  requested_start timestamptz;
  requested_end timestamptz;
  payment_method_value text;
  payment_status_value text;
  transaction_status_value text;
begin
  select * into wash_service
  from public.services_products
  where id = p_transaction ->> 'item_id'
    and item_type = 'SERVICE'
    and active = true;
  if not found then raise exception 'Layanan tidak ditemukan atau tidak aktif.'; end if;

  select * into selected_vehicle
  from public.vehicles
  where id = p_transaction ->> 'vehicle_id'
    and customer_id = p_transaction ->> 'customer_id';
  if not found or selected_vehicle.type <> wash_service.type then
    raise exception 'Kendaraan tidak sesuai dengan layanan.';
  end if;

  if p_addon_id is not null then
    select * into addon
    from public.services_products
    where id = p_addon_id
      and item_type = 'ADD_ON'
      and active = true;
    if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
  end if;

  total_duration := (p_transaction ->> 'duration_minutes')::integer;
  if total_duration is null or total_duration < 1 then
    raise exception 'Durasi layanan tidak valid.';
  end if;
  service_duration := total_duration - coalesce(addon.duration, 0);
  if service_duration < 1 then raise exception 'Durasi layanan tidak valid.'; end if;
  base_price := wash_service.price;
  final_amount := base_price + coalesce(addon.price, 0);

  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind not in ('BOOKING', 'WALK_IN') then
    raise exception 'Jenis transaksi layanan tidak valid.';
  end if;
  if wash_service.category = 'SELF_SERVICE' and transaction_kind <> 'BOOKING' then
    raise exception 'Self-Service harus dibuat sebagai booking.';
  end if;

  payment_method_value := p_transaction ->> 'payment_method';
  payment_status_value := case
    when transaction_kind = 'WALK_IN' and payment_method_value = 'CASH' then 'PAID'
    else 'PENDING'
  end;
  transaction_status_value := case
    when transaction_kind = 'BOOKING' then 'BOOKED'
    else 'ACTIVE'
  end;
  bay := nullif(p_transaction ->> 'bay_number', '')::integer;

  if wash_service.category = 'SELF_SERVICE' then
    if bay is null or bay not between 1 and 4 then
      raise exception 'Pilih salah satu dari empat self-service bay.';
    end if;
    if p_transaction ->> 'booking_date' is null or p_transaction ->> 'booking_time' is null then
      raise exception 'Tanggal dan waktu Self-Service wajib diisi.';
    end if;
    requested_start := (
      ((p_transaction ->> 'booking_date')::date + (p_transaction ->> 'booking_time')::time)
      at time zone 'Asia/Jakarta'
    );
    if requested_start <= clock_timestamp() then
      raise exception 'Pilih waktu Self-Service yang belum lewat.';
    end if;
    requested_end := requested_start + make_interval(mins => total_duration);

    perform pg_advisory_xact_lock(78131, bay);
    if exists (
      select 1
      from public.transactions t
      join public.services_products service on service.id = t.item_id
      where t.bay_number = bay
        and t.item_type = 'SERVICE'
        and service.category = 'SELF_SERVICE'
        and t.transaction_status in ('ACTIVE', 'BOOKED')
        and requested_start <
            ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
              + make_interval(mins => t.duration_minutes)
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') < requested_end
    ) then
      raise exception 'Bay tersebut sudah digunakan atau dipesan pada slot waktu ini.';
    end if;
  else
    bay := null;
  end if;

  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, transaction_type, transaction_status, queue_status,
    booking_date, booking_time, duration_minutes, bay_number, created_at
  )
  values (
    p_transaction ->> 'id',
    p_transaction ->> 'code',
    p_transaction ->> 'customer_id',
    selected_vehicle.id,
    wash_service.id,
    'SERVICE',
    wash_service.name || case when addon.id is not null then ' + ' || addon.name else '' end,
    1,
    final_amount,
    payment_method_value,
    payment_status_value,
    transaction_kind,
    transaction_status_value,
    'WAITING',
    (p_transaction ->> 'booking_date')::date,
    (p_transaction ->> 'booking_time')::time,
    total_duration,
    bay,
    now()
  )
  returning * into saved_transaction;

  return to_jsonb(saved_transaction);
end;
$$;

revoke all on function public.reconcile_self_service_transactions() from public, anon;
grant execute on function public.reconcile_self_service_transactions() to authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'rinse-self-service-reconciliation'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'rinse-self-service-reconciliation',
    '* * * * *',
    'select public.reconcile_self_service_transactions();'
  );
end;
$$;

commit;
