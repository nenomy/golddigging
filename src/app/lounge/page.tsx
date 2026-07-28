import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import NavTabs from "@/components/NavTabs";
import { todayStr } from "@/lib/season";

type Habit = { id: string; user_id: string };
type Profile = { id: string; nickname: string };

export default async function LoungePage() {
  const supabase = await createServerClient();
  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [
    {
      data: { user },
    },
    { data: coreHabits },
    { data: profiles },
  ] = await Promise.all([
    supabase.auth.getUser(),
    admin.from("habits").select("id, user_id").eq("is_core", true),
    admin.from("profiles").select("id, nickname"),
  ]);

  if (!user) {
    redirect("/login");
  }

  const today = todayStr();
  const coreHabitIds = (coreHabits ?? []).map((h: Habit) => h.id);

  const { data: todayCheckins } =
    coreHabitIds.length > 0
      ? await admin.from("checkins").select("habit_id").eq("date", today).in("habit_id", coreHabitIds)
      : { data: [] };

  const doneHabitIds = new Set((todayCheckins ?? []).map((c) => c.habit_id));
  const doneUserIds = new Set(
    (coreHabits ?? []).filter((h: Habit) => doneHabitIds.has(h.id)).map((h: Habit) => h.user_id),
  );

  const profileMap = new Map((profiles ?? []).map((p: Profile) => [p.id, p.nickname]));
  const arrived = Array.from(doneUserIds).map((uid) => ({
    userId: uid,
    nickname: profileMap.get(uid) ?? "이름 없음",
  }));

  return (
    <div className="app">
      <div className="eyebrow">오늘의 휴게실</div>
      <h1>휴게실</h1>
      <div className="sub">핵심 채굴 목표를 오늘 인증한 사람들이 모이는 곳이에요.</div>

      <NavTabs />

      <div className="card">
        {arrived.length === 0 ? (
          <div className="archive-empty">아직 아무도 도착하지 않았어요. 첫 번째로 채굴하고 와보세요 ⛏️</div>
        ) : (
          arrived.map((p) => (
            <div key={p.userId} className={`rank-row${p.userId === user!.id ? " me" : ""}`}>
              <span style={{ fontSize: 18 }}>🪙</span>
              <div className="rank-name">{p.nickname}</div>
              <div className="rank-stat">오늘 채굴 완료</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
