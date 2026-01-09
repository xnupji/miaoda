create table if not exists airdrop_events (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references interaction_submissions(id) on delete cascade not null,
  address text not null,
  amount numeric not null,
  tx_hash text,
  status text check (status in ('pending', 'sent', 'failed')) not null,
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table airdrop_events enable row level security;

drop policy if exists "Users can view their own airdrop events" on airdrop_events;
create policy "Users can view their own airdrop events"
  on airdrop_events for select
  using (
    exists (
      select 1
      from interaction_submissions s
      where s.id = submission_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
