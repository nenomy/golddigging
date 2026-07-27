-- 습관을 "핵심 채굴 목표"(유저당 1개) / "추가 목표"로 구분
alter table public.habits add column is_core boolean not null default false;

-- 유저당 핵심 목표는 최대 1개만 허용
create unique index habits_one_core_per_user on public.habits(user_id) where is_core;
