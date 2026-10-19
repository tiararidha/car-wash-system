begin;

alter table public.transactions disable trigger transactions_integrity_guard;

with jakarta_today as (
  select (now() at time zone 'Asia/Jakarta')::date as today
)
update public.transactions transaction_row
set booking_date = case
      when transaction_row.booking_date > jakarta_today.today then jakarta_today.today
      else transaction_row.booking_date
    end,
    created_at = least(transaction_row.created_at, now())
from jakarta_today
where (
    transaction_row.id in (
      't-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7', 't-8', 't-9', 't-10',
      't-11', 't-12', 't-13', 't-14', 't-15', 't-16', 't-17', 't-18', 't-19', 't-20',
      'seed-tx-budi-wash', 'seed-tx-rina-self-service', 'seed-tx-hendra-wash'
    )
    or transaction_row.id like 'rich-tx-%'
  )
  and (transaction_row.booking_date > jakarta_today.today or transaction_row.created_at > now());

alter table public.transactions enable trigger transactions_integrity_guard;

commit;