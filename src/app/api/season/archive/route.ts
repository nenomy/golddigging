import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  Season,
  Checkin,
  dateStrOffset,
  isSeasonOver,
  todayStr,
  computeHabitSeasonStats,
} from "@/lib/season";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  if (!season || !isSeasonOver(season)) {
    return NextResponse.json({ error: "season_not_over" }, { status: 400 });
  }

  const { data: habits } = await admin
    .from("habits")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: checkins } = await admin
    .from("checkins")
    .select("habit_id, date, method")
    .eq("user_id", user.id)
    .gte("date", season.start_date)
    .lte("date", season.end_date);

  const { data: vacationRows } = await admin
    .from("season_vacation_weeks")
    .select("week_index")
    .eq("user_id", user.id)
    .eq("season_id", season.id);

  const vacationWeeks = (vacationRows ?? []).map((r) => r.week_index as number);
  const checkinList = (checkins ?? []) as Checkin[];

  await admin
    .from("season_archives")
    .delete()
    .eq("season_id", season.id)
    .eq("user_id", user.id);

  if (habits && habits.length > 0) {
    const rows = habits.map((h) => {
      const stats = computeHabitSeasonStats(h.id, h.name, season, checkinList, vacationWeeks);
      return {
        season_id: season.id,
        user_id: user.id,
        habit_id: h.id,
        habit_name: stats.habitName,
        completed_weeks: stats.completedWeeks,
        best_streak: stats.best,
        final_streak: stats.final,
      };
    });
    await admin.from("season_archives").insert(rows);
  }

  const nextStart = todayStr() > season.end_date ? dateStrOffset(1, season.end_date) : dateStrOffset(1, todayStr());
  const { error: seasonInsertError } = await admin.from("seasons").insert({
    number: season.number + 1,
    start_date: nextStart,
    end_date: dateStrOffset(27, nextStart),
  });

  if (seasonInsertError && seasonInsertError.code !== "23505") {
    return NextResponse.json({ error: "season_create_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
