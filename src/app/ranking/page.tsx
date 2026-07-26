import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import NavTabs from "@/components/NavTabs";
import {
  Season,
  Checkin,
  calcStreak,
  computeHabitSeasonStats,
} from "@/lib/season";

type Profile = { id: string; nickname: string };
type Habit = { id: string; user_id: string; name: string };

export default async function RankingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: season } = await admin
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(1)
    .single<Season>();

  const { data: profiles } = await admin.from("profiles").select("id, nickname");
  const { data: habits } = await admin
    .from("habits")
    .select("id, user_id, name")
    .eq("is_active", true);

  const { data: checkins } = season
    ? await admin
        .from("checkins")
        .select("habit_id, user_id, date, method")
        .gte("date", season.start_date)
        .lte("date", season.end_date)
    : { data: [] };

  const { data: vacationRows } = season
    ? await admin
        .from("season_vacation_weeks")
        .select("user_id, week_index")
        .eq("season_id", season.id)
    : { data: [] };

  const rankings = (profiles ?? []).map((profile: Profile) => {
    const myHabits = (habits ?? []).filter((h: Habit) => h.user_id === profile.id);
    const myCheckins = (checkins ?? []).filter((c) => c.user_id === profile.id) as Checkin[];
    const myVacationWeeks = (vacationRows ?? [])
      .filter((v) => v.user_id === profile.id)
      .map((v) => v.week_index as number);

    let totalCompletedWeeks = 0;
    let maxStreak = 0;
    if (season) {
      myHabits.forEach((h: Habit) => {
        const stats = computeHabitSeasonStats(h.id, h.name, season, myCheckins, myVacationWeeks);
        totalCompletedWeeks += stats.completedWeeks;
        const streak = calcStreak(h.id, season, myCheckins, myVacationWeeks);
        if (streak > maxStreak) maxStreak = streak;
      });
    }

    return {
      userId: profile.id,
      nickname: profile.nickname,
      habitCount: myHabits.length,
      totalCompletedWeeks,
      maxStreak,
    };
  });

  rankings.sort((a, b) => b.totalCompletedWeeks - a.totalCompletedWeeks || b.maxStreak - a.maxStreak);

  return (
    <div className="app">
      <div className="eyebrow">시즌 랭킹</div>
      <h1>금모으기 랭킹보드</h1>
      <div className="sub">
        {season
          ? `시즌 ${season.number} 기준, 참여자들의 이번 시즌 채굴 성과예요.`
          : "아직 진행 중인 시즌이 없어요."}
      </div>

      <NavTabs />

      <div className="card">
        {rankings.length === 0 ? (
          <div className="archive-empty">아직 참여자가 없어요.</div>
        ) : (
          rankings.map((r, i) => (
            <div key={r.userId} className={`rank-row${r.userId === user!.id ? " me" : ""}`}>
              <div className="rank-pos">{i + 1}</div>
              <div className="rank-name">{r.nickname}</div>
              <div className="rank-stat">
                {r.totalCompletedWeeks}주 완료 · 연속 {r.maxStreak}주 · 광산 {r.habitCount}개
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
