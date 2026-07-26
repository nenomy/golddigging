-- 금모으기 프로젝트 초기 스키마
-- Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.

-- ============================================================
-- 1. profiles: 사용자 프로필 (auth.users 와 1:1)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  notification_time time not null default '21:00',
  notification_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 카카오 로그인으로 새 사용자가 생기면 자동으로 프로필 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      '광부' || substr(new.id::text, 1, 4)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. seasons: 전체 참여자가 공유하는 시즌 (글로벌, 4주 단위)
-- ============================================================
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table public.seasons enable row level security;

create policy "seasons_select_all_authenticated"
  on public.seasons for select
  to authenticated
  using (true);

-- 시즌 1을 오늘 날짜 기준으로 시작 (4주 = 28일)
insert into public.seasons (number, start_date, end_date)
values (1, current_date, current_date + 27);

-- ============================================================
-- 3. season_vacation_weeks: 유저별 주간 휴가 신청
-- ============================================================
create table public.season_vacation_weeks (
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_index int not null check (week_index >= 0 and week_index < 4),
  primary key (season_id, user_id, week_index)
);

alter table public.season_vacation_weeks enable row level security;

create policy "vacation_owner_all"
  on public.season_vacation_weeks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. habits: 유저별 습관(광산)
-- ============================================================
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits(user_id);

alter table public.habits enable row level security;

create policy "habits_owner_all"
  on public.habits for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. checkins: 일별 인증 기록
-- ============================================================
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  method text not null check (method in ('checklist', 'photo')),
  photo_path text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create index checkins_user_id_idx on public.checkins(user_id);
create index checkins_habit_id_date_idx on public.checkins(habit_id, date);

alter table public.checkins enable row level security;

create policy "checkins_owner_all"
  on public.checkins for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 6. season_archives: 시즌 종료 시 스냅샷
-- ============================================================
create table public.season_archives (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  habit_name text not null,
  completed_weeks int not null,
  best_streak int not null,
  final_streak int not null,
  archived_at timestamptz not null default now()
);

create index season_archives_user_id_idx on public.season_archives(user_id);

alter table public.season_archives enable row level security;

create policy "season_archives_owner_select"
  on public.season_archives for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 7. push_subscriptions: 브라우저별 웹 푸시 구독 정보
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_owner_all"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 8. 인증 사진 저장용 Storage 버킷 (비공개)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false);

-- 사진 경로는 반드시 "본인 uid/파일명" 형태로 업로드하도록 강제
create policy "checkin_photos_owner_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);
