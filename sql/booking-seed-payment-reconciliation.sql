begin;

alter table public.transactions drop constraint if exists transactions_transaction_status_check;
alter table public.transactions add constraint transactions_transaction_status_check
  check (transaction_status in ('PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

create or replace function public.reconcile_self_service_transactions()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  now_at timestamptz := clock_timestamp();
  completed_count integer := 0;
  activated_count integer := 0;
  expired_count integer := 0;
  expired_rows integer := 0;
begin
  update public.transactions t set transaction_status='COMPLETED',queue_status='COMPLETED',
    completed_at=coalesce(t.completed_at,((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes))
  from public.services_products service
  where service.id=t.item_id and t.item_type='SERVICE' and t.payment_status='PAID' and t.transaction_status='ACTIVE'
    and (service.category='SELF_SERVICE' or t.queue_status in ('WASHING','FINISHING','COMPLETED'))
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics completed_count=row_count;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status='PAID' and t.transaction_status='BOOKED'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status in ('PENDING','FAILED') and t.transaction_status in ('PENDING','BOOKED','ACTIVE')
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status='ACTIVE'
  where t.item_type='SERVICE' and t.payment_status='PAID' and t.transaction_status='BOOKED'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')<=now_at
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)>now_at;
  get diagnostics activated_count=row_count;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status='PAID' and t.transaction_status='ACTIVE' and t.queue_status='WAITING'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  return completed_count+activated_count+expired_count;
end;
$$;

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
    raise exception 'transactions_integrity_guard must be active before booking seed reconciliation.';
  end if;
end $$;

select set_config('rinse.payment_update', 'on', true);

update public.transactions t
set payment_status = 'PAID',
    transaction_status = 'BOOKED',
    queue_status = 'WAITING'
from public.vehicles vehicle,
     public.services_products service,
     (values
       ('t-3', 'RS-261001-0107', 'svc-self-car', 30000, 30),
       ('t-7', 'RS-261002-0216', 'svc-moto', 20000, 35),
       ('t-19', 'RS-261007-3009', 'svc-self-car', 30000, 30),
       ('t-20', 'RS-SEED-010', 'svc-self-car', 30000, 30)
     ) as seed(id, code, item_id, amount, duration_minutes)
where t.id = seed.id
  and t.code = seed.code
  and t.item_id = seed.item_id
  and t.item_type = 'SERVICE'
  and t.transaction_type = 'BOOKING'
  and t.amount = seed.amount
  and t.duration_minutes = seed.duration_minutes
  and t.payment_method in ('QRIS', 'E_WALLET', 'CARD')
  and t.payment_status in ('PENDING', 'FAILED')
  and t.transaction_status = 'PENDING'
  and (((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') > clock_timestamp())
  and vehicle.id = t.vehicle_id
  and vehicle.customer_id = t.customer_id
  and service.id = t.item_id
  and service.item_type = 'SERVICE'
  and service.type = vehicle.type
  and service.price = t.amount;

select set_config('rinse.payment_update', 'off', true);

do $$ begin
  if exists (
    select 1
    from public.transactions t
    join (values
      ('t-3', 'RS-261001-0107'),
      ('t-7', 'RS-261002-0216'),
      ('t-19', 'RS-261007-3009'),
      ('t-20', 'RS-SEED-010')
    ) as seed(id, code) on t.id = seed.id and t.code = seed.code
    where ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') > clock_timestamp()
      and (t.payment_status <> 'PAID' or t.transaction_status <> 'BOOKED')
  ) then
    raise exception 'A future valid booking seed remains unpaid or unconfirmed.';
  end if;
end $$;

commit;
