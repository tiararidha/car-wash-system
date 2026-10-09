begin;

do $$ begin
  if not exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
    join pg_proc guard_function on guard_function.oid = trigger_row.tgfoid
    join pg_namespace function_schema on function_schema.oid = guard_function.pronamespace
    where table_schema.nspname = 'public'
      and table_row.relname = 'transactions'
      and trigger_row.tgname = 'transactions_integrity_guard'
      and trigger_row.tgenabled in ('O', 'A')
      and function_schema.nspname = 'public'
      and guard_function.proname = 'guard_transaction_integrity'
  ) then
    raise exception 'transactions_integrity_guard must be active before t-20 reconciliation.';
  end if;
end $$;

delete from public.transactions t
where t.id = 't-20'
  and (t.code is distinct from 'RS-SEED-010'
    or t.customer_id is distinct from 'rs-c-11'
    or t.vehicle_id is distinct from 'rs-v-13'
    or t.item_id is distinct from 'svc-self-car'
    or t.addon_id is not null
    or t.pickup_distance_km is not null
    or t.item_type is distinct from 'SERVICE'
    or t.item_name is distinct from 'Self-Service Car'
    or t.quantity is distinct from 1
    or t.amount is distinct from 30000
    or t.payment_method is distinct from 'CARD'
    or t.payment_status is distinct from 'PAID'
    or t.refund_status is distinct from 'NONE'
    or t.transaction_type is distinct from 'BOOKING'
    or t.transaction_status is distinct from 'BOOKED'
    or t.queue_status is distinct from 'WAITING'
    or t.booking_date is distinct from (now() at time zone 'Asia/Jakarta')::date + 3
    or t.booking_time is distinct from time '09:00'
    or t.duration_minutes is distinct from 30
    or t.bay_number is distinct from 4
    or t.completed_at is not null);

insert into public.transactions (
  id, code, customer_id, vehicle_id, item_id, addon_id, pickup_distance_km,
  item_type, item_name, quantity, amount, payment_method, payment_status,
  refund_status, transaction_type, transaction_status, queue_status,
  booking_date, booking_time, duration_minutes, bay_number, completed_at, created_at
)
values (
  't-20', 'RS-SEED-010', 'rs-c-11', 'rs-v-13', 'svc-self-car', null, null,
  'SERVICE', 'Self-Service Car', 1, 30000, 'CARD', 'PAID',
  'NONE', 'BOOKING', 'BOOKED', 'WAITING',
  (now() at time zone 'Asia/Jakarta')::date + 3, time '09:00', 30, 4, null,
  (((now() at time zone 'Asia/Jakarta')::date + 3 + time '09:00') at time zone 'Asia/Jakarta')
)
on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1
    from public.transactions t
    join public.vehicles v on v.id = t.vehicle_id and v.customer_id = t.customer_id
    join public.services_products service on service.id = t.item_id
    where t.id = 't-20'
      and t.code = 'RS-SEED-010'
      and t.customer_id = 'rs-c-11'
      and t.vehicle_id = 'rs-v-13'
      and t.item_id = 'svc-self-car'
      and t.item_type = 'SERVICE'
      and t.amount = 30000
      and t.duration_minutes = 30
      and t.payment_status = 'PAID'
      and t.transaction_status = 'BOOKED'
      and v.type = 'CAR'
      and service.item_type = 'SERVICE'
      and service.type = 'CAR'
      and service.price = 30000
  ) then
    raise exception 't-20 seed reconciliation did not produce the expected CAR Self-Service transaction.';
  end if;
end $$;

commit;
