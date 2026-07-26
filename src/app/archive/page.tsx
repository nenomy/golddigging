import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import NavTabs from "@/components/NavTabs";
import { fmtShort } from "@/lib/season";

type ArchiveRow = {
  id: string;
  habit_name: string;
  completed_weeks: number;
  best_streak: number;
  final_streak: number;
  seasons: { number: number; start_date: string; end_date: string } | null;
};

export default async function ArchivePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("season_archives")
    .select("id, habit_name, completed_weeks, best_streak, final_streak, seasons(number, start_date, end_date)")
    .eq("user_id", user!.id)
    .order("archived_at", { ascending: false });

  const rows = (data ?? []) as unknown as ArchiveRow[];

  const bySeasonNumber = new Map<number, { start_date: string; end_date: string; rows: ArchiveRow[] }>();
  rows.forEach((row) => {
    if (!row.seasons) return;
    const num = row.seasons.number;
    if (!bySeasonNumber.has(num)) {
      bySeasonNumber.set(num, { start_date: row.seasons.start_date, end_date: row.seasons.end_date, rows: [] });
    }
    bySeasonNumber.get(num)!.rows.push(row);
  });

  const seasons = Array.from(bySeasonNumber.entries()).sort((a, b) => b[0] - a[0]);

  return (
    <div className="app">
      <div className="eyebrow">지난 시즌 기록</div>
      <h1>아카이브</h1>
      <div className="sub">종료된 시즌의 채굴 기록이 여기에 남아요.</div>

      <NavTabs />

      {seasons.length === 0 ? (
        <div className="card">
          <div className="archive-empty">아직 마감된 시즌이 없어요. 첫 시즌을 완주해보세요.</div>
        </div>
      ) : (
        seasons.map(([number, info]) => (
          <div key={number} className="archive-season">
            <div className="archive-season-head">
              <span>시즌 {number}</span>
              <span className="archive-range">
                {fmtShort(info.start_date)} ~ {fmtShort(info.end_date)}
              </span>
            </div>
            {info.rows.map((row) => (
              <div className="archive-stat-row" key={row.id}>
                <span>⛏️ {row.habit_name}</span>
                <span>
                  <b>{row.completed_weeks}</b>/4주 완료 · 최고 <b>{row.best_streak}</b>주
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
