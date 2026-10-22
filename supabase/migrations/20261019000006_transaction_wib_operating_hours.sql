begin;

alter table public.transactions disable trigger transactions_integrity_guard;

with transaction_limit as (
  select (clock_timestamp() at time zone 'Asia/Jakarta')::date as max_date
), fixture_schedule as (
  select transaction_row.id,
    least(transaction_row.booking_date, transaction_limit.max_date) as booking_date,
    case
      when transaction_row.item_type = 'SERVICE' and transaction_row.duration_minutes between 1 and 780
        then least(greatest(transaction_row.booking_time, time '08:00'), time '21:00' - make_interval(mins => transaction_row.duration_minutes))
      else least(greatest(transaction_row.booking_time, time '08:00'), time '21:00')
    end as booking_time
  from public.transactions transaction_row
  cross join transaction_limit
  where transaction_row.id in (
    't-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7', 't-8', 't-9', 't-10',
    't-11', 't-12', 't-13', 't-14', 't-15', 't-16', 't-17', 't-18', 't-19', 't-20',
    'seed-tx-budi-wash', 'seed-tx-rina-self-service', 'seed-tx-hendra-wash'
  )
    or transaction_row.id like 'rich-tx-%'
)
update public.transactions transaction_row
set booking_date = fixture_schedule.booking_date,
    booking_time = fixture_schedule.booking_time,
    created_at = ((fixture_schedule.booking_date + fixture_schedule.booking_time) at time zone 'Asia/Jakarta')
from fixture_schedule
where transaction_row.id = fixture_schedule.id;

alter table public.transactions enable trigger transactions_integrity_guard;

create or replace function public.guard_transaction_wib_schedule()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  local_now timestamp := clock_timestamp() at time zone 'Asia/Jakarta';
  schedule_changed boolean;
begin
  if tg_op = 'INSERT' then
    schedule_changed := true;
  else
    schedule_changed := old.booking_date is distinct from new.booking_date
      or old.booking_time is distinct from new.booking_time
      or old.item_type is distinct from new.item_type
      or old.duration_minutes is distinct from new.duration_minutes;
  end if;
  if schedule_changed then
    if new.booking_date > local_now::date and new.transaction_type <> 'BOOKING' then
      raise exception 'Tanggal transaksi tidak boleh melewati hari ini.';
    end if;
    if new.booking_time < time '08:00' or new.booking_time > time '21:00' then
      raise exception 'Transaksi hanya dapat dijadwalkan pukul 08.00–21.00 WIB.';
    end if;
    if new.item_type = 'SERVICE' and new.duration_minutes > 0
      and new.booking_time + make_interval(mins => new.duration_minutes) > time '21:00' then
      raise exception 'Durasi layanan harus selesai paling lambat pukul 21.00 WIB.';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if local_now::time < time '08:00' or local_now::time > time '21:00' then
      raise exception 'Transaksi baru hanya dapat dibuat pada 08.00–21.00 WIB.';
    end if;
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger transactions_wib_schedule_guard
before insert or update on public.transactions
for each row execute function public.guard_transaction_wib_schedule();

commit;
