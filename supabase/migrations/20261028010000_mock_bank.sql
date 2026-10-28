-- GRE Studio mock bank. Only server-side code using the Supabase secret key can
-- read question keys or write attempts. The public browser key has no grants.
create table if not exists public.mock_questions (
  id text primary key,
  measure text not null check (measure in ('verbal', 'quant')),
  topic text not null,
  type text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  stem text not null,
  choices jsonb,
  answer jsonb not null,
  explanation text not null,
  passage text,
  image text,
  solution_image text,
  required integer,
  numeric_format text,
  choices_in_image boolean not null default false,
  source jsonb not null default '{}'::jsonb
);

create index if not exists mock_questions_measure_topic_idx
  on public.mock_questions (measure, topic, difficulty);

create table if not exists public.mock_tests (
  id integer primary key check (id between 1 and 50),
  title text not null,
  plan jsonb not null,
  published boolean not null default true
);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id integer not null references public.mock_tests(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  section_order jsonb not null default '[]'::jsonb,
  selections jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  marks jsonb not null default '{}'::jsonb,
  active_section integer,
  deadline timestamptz,
  current_question integer not null default 0,
  result jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists mock_attempts_user_recent_idx
  on public.mock_attempts (user_id, started_at desc);

alter table public.mock_questions enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_attempts enable row level security;
revoke all on public.mock_questions from anon, authenticated;
revoke all on public.mock_tests from anon, authenticated;
revoke all on public.mock_attempts from anon, authenticated;

-- Question and solution images are signed by the server for each active section
-- or completed review. No public Storage policy is created.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gre-mock-assets', 'gre-mock-assets', false, 10485760,
        array['image/png', 'image/jpeg'])
on conflict (id) do update set public = false;
