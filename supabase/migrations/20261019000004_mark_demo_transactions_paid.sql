begin;

do $$
begin
  if to_regclass('private.demo_transaction_registry') is null then
    raise exception 'Demo payment migration preflight failed: private.demo_transaction_registry is required.';
  end if;
end;
$$;

select set_config('rinse.payment_update', 'on', true);

update public.transactions transaction_row
set payment_status = 'PAID'
from private.demo_transaction_registry registry
where registry.transaction_id = transaction_row.id
  and transaction_row.payment_status not in ('PAID', 'REFUNDED')
  and transaction_row.refund_status <> 'COMPLETED'
  and transaction_row.transaction_status <> 'CANCELLED';

select set_config('rinse.payment_update', 'off', true);

do $$
begin
  if exists (
    select 1
    from private.demo_transaction_registry registry
    join public.transactions transaction_row on transaction_row.id = registry.transaction_id
    where transaction_row.payment_status not in ('PAID', 'REFUNDED')
      and transaction_row.refund_status <> 'COMPLETED'
      and transaction_row.transaction_status <> 'CANCELLED'
  ) then
    raise exception 'Demo payment migration failed: some eligible demo transactions are not PAID.';
  end if;
end;
$$;

commit;