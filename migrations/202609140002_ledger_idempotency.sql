-- Impede que a mesma missão ou resgate gere mais de um lançamento de saldo.
create unique index if not exists uq_xp_transactions_source
  on public.xp_transactions (child_id, source_type, source_id)
  where source_id is not null;

create unique index if not exists uq_coin_transactions_source
  on public.coin_transactions (child_id, source_type, source_id)
  where source_id is not null;

create unique index if not exists uq_reward_redemptions_pending
  on public.reward_redemptions (reward_id, child_id)
  where status = 'requested';
