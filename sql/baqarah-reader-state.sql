-- ============================================
-- رفقة البقرة: موضع قراءة مستمر + سجل الختمات
-- ============================================

create table if not exists public.baqarah_reading_state (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  current_cycle integer not null default 1
    check (current_cycle >= 1),

  last_ayah_number integer not null default 0
    check (last_ayah_number between 0 and 286),

  reader_percentage integer not null default 0
    check (reader_percentage between 0 and 100),

  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id)
);


create table if not exists public.baqarah_reading_completions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  cycle_number integer not null
    check (cycle_number >= 1),

  completion_date date not null,

  completed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  unique (
    user_id,
    cycle_number
  )
);


create index if not exists
baqarah_reading_completions_user_date_idx
on public.baqarah_reading_completions(
  user_id,
  completion_date desc
);


alter table
public.baqarah_reading_state
enable row level security;


alter table
public.baqarah_reading_completions
enable row level security;


revoke all
on public.baqarah_reading_state
from anon, authenticated;


revoke all
on public.baqarah_reading_completions
from anon, authenticated;


grant all
on public.baqarah_reading_state
to service_role;


grant all
on public.baqarah_reading_completions
to service_role;
