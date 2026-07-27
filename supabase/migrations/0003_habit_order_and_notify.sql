-- 습관 정렬 순서 + 습관별 알림 설정
alter table public.habits add column sort_order integer not null default 0;
alter table public.habits add column notification_enabled boolean not null default false;
alter table public.habits add column notification_time time not null default '21:00';

-- 기존 습관들은 생성 순서대로 sort_order 채워주기
with ranked as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.habits
)
update public.habits h set sort_order = ranked.rn
from ranked where ranked.id = h.id;
