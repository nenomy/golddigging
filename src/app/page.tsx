import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: checkins } = season
    ? await supabase
        .from("checkins")
        .select("habit_id, date, method")
        .eq("user_id", user.id)
        .gte("date", season.start_date)
        .lte("date", season.end_date)
    : { data: [] };

  const { data: vacationRows } = season
    ? await supabase
        .from("season_vacation_weeks")
        .select("week_index")
        .eq("user_id", user.id)
        .eq("season_id", season.id)
    : { data: [] };

  return (
    <Dashboard
      userId={user.id}
      initialSeason={season ?? null}
      initialHabits={habits ?? []}
      initialCheckins={checkins ?? []}
      initialVacationWeeks={(vacationRows ?? []).map((r) => r.week_index)}
    />
  );
}
