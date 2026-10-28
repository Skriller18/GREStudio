create table if not exists public.study_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('vocab_word', 'essay_draft', 'mock_attempt', 'mock_result')),
  record_key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_type, record_key)
);

create index if not exists study_records_user_type_idx on public.study_records (user_id, record_type);

alter table public.study_records enable row level security;
revoke all on public.study_records from anon, authenticated;
grant select, insert, update, delete on public.study_records to authenticated;

create policy "read own study records" on public.study_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own study records" on public.study_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own study records" on public.study_records
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own study records" on public.study_records
  for delete to authenticated using ((select auth.uid()) = user_id);
