"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavTabs from "@/components/NavTabs";
import InstallBanner from "@/components/InstallBanner";
import NotificationSettings from "@/components/NotificationSettings";
import {
  Season,
  Checkin,
  WEEK_COUNT,
  todayStr,
  dateStrOffset,
  fmtShort,
  daysBetween,
  isSeasonOver,
  isWeekComplete,
  isVacationWeek,
  weekRange,
  getCurrentWeekIndex,
  calcStreak,
  calcBestStreak,
  ENCOURAGEMENTS,
  MILESTONE_MSG,
  QUOTES,
} from "@/lib/season";

type Habit = { id: string; name: string; is_active: boolean; is_core: boolean };

type Props = {
  userId: string;
  initialSeason: Season | null;
  initialHabits: Habit[];
  initialCheckins: Checkin[];
  initialVacationWeeks: number[];
  initialNotificationTime: string;
  initialNotificationEnabled: boolean;
};

export default function Dashboard({
  userId,
  initialSeason,
  initialHabits,
  initialCheckins,
  initialVacationWeeks,
  initialNotificationTime,
  initialNotificationEnabled,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [season] = useState<Season | null>(initialSeason);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [vacationWeeks, setVacationWeeks] = useState<number[]>(initialVacationWeeks);
  const [habitInput, setHabitInput] = useState("");
  const [overlay, setOverlay] = useState<{ title: string; msg: string; quote: string; src: string } | null>(null);
  const [pendingPhotoHabitId, setPendingPhotoHabitId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const curWeek = season ? getCurrentWeekIndex(season) : 0;
  const over = season ? isSeasonOver(season) : false;
  const onVacation = season ? isVacationWeek(curWeek, vacationWeeks) : false;

  const seasonElapsedPct = useMemo(() => {
    if (!season) return 0;
    const elapsed = Math.min(28, Math.max(0, daysBetween(season.start_date, today) + 1));
    return Math.min(100, Math.round((elapsed / 28) * 100));
  }, [season, today]);

  const daysLeft = season ? daysBetween(today, season.end_date) : 0;

  async function addHabit() {
    const name = habitInput.trim();
    if (!name) return;
    const isCore = !habits.some((h) => h.is_core);
    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: userId, name, is_core: isCore })
      .select()
      .single();
    if (!error && data) {
      setHabits((prev) => [...prev, data as Habit]);
      setHabitInput("");
    }
  }

  async function removeHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setCheckins((prev) => prev.filter((c) => c.habit_id !== id));
  }

  function startEditHabit(habit: Habit) {
    setEditingHabitId(habit.id);
    setEditingName(habit.name);
  }

  function cancelEditHabit() {
    setEditingHabitId(null);
    setEditingName("");
  }

  async function saveEditHabit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    const { error } = await supabase.from("habits").update({ name }).eq("id", id);
    if (error) return;
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
    setEditingHabitId(null);
    setEditingName("");
  }

  async function setCoreHabit(id: string) {
    const currentCore = habits.find((h) => h.is_core);
    if (currentCore) {
      await supabase.from("habits").update({ is_core: false }).eq("id", currentCore.id);
    }
    await supabase.from("habits").update({ is_core: true }).eq("id", id);
    setHabits((prev) => prev.map((h) => ({ ...h, is_core: h.id === id })));
  }

  function showEncouragement(habitId: string, justCompletedWeek: boolean) {
    if (!season) return;
    const streak = calcStreak(habitId, season, checkins, vacationWeeks);
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (justCompletedWeek && MILESTONE_MSG[streak]) {
      setOverlay({
        title: `${streak}주 연속 채굴 달성!`,
        msg: MILESTONE_MSG[streak],
        quote: quote.text,
        src: quote.src,
      });
    } else {
      setOverlay({
        title: "오늘도 금 캐냈어요!",
        msg: ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
        quote: quote.text,
        src: quote.src,
      });
    }
  }

  async function checkIn(habitId: string, method: "checklist" | "photo", file?: File) {
    if (!season) return;
    const wasWeekComplete = isWeekComplete(habitId, curWeek, season, checkins);

    let photoPath: string | null = null;
    if (method === "photo" && file) {
      const path = `${userId}/${habitId}-${today}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("checkin-photos")
        .upload(path, file, { contentType: file.type });
      if (uploadError) return;
      photoPath = path;
    }

    const { error } = await supabase.from("checkins").insert({
      habit_id: habitId,
      user_id: userId,
      date: today,
      method,
      photo_path: photoPath,
    });
    if (error) return;

    setCheckins((prev) => [...prev, { habit_id: habitId, date: today, method }]);
    showEncouragement(habitId, !wasWeekComplete);
  }

  async function cancelCheckin(habitId: string) {
    if (!window.confirm("오늘 채굴 인증을 취소할까요?")) return;
    const { error } = await supabase
      .from("checkins")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .eq("date", today);
    if (error) return;
    setCheckins((prev) => prev.filter((c) => !(c.habit_id === habitId && c.date === today)));
  }

  function handleVerifyClick(habitId: string, method: "checklist" | "photo") {
    if (method === "checklist") {
      checkIn(habitId, "checklist");
    } else {
      setPendingPhotoHabitId(habitId);
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && pendingPhotoHabitId) {
      checkIn(pendingPhotoHabitId, "photo", file);
    }
    setPendingPhotoHabitId(null);
    e.target.value = "";
  }

  async function toggleVacation() {
    if (!season) return;
    const isOn = vacationWeeks.includes(curWeek);
    if (isOn) {
      await supabase
        .from("season_vacation_weeks")
        .delete()
        .eq("season_id", season.id)
        .eq("user_id", userId)
        .eq("week_index", curWeek);
      setVacationWeeks((prev) => prev.filter((w) => w !== curWeek));
    } else {
      if (!window.confirm("이번 주를 휴가로 등록할까요? 이번 주는 채굴하지 않아도 연속 기록이 끊기지 않아요.")) {
        return;
      }
      await supabase
        .from("season_vacation_weeks")
        .insert({ season_id: season.id, user_id: userId, week_index: curWeek });
      setVacationWeeks((prev) => [...prev, curWeek]);
    }
  }

  async function handleArchiveAndStart() {
    setArchiving(true);
    try {
      const res = await fetch("/api/season/archive", { method: "POST" });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } finally {
      setArchiving(false);
    }
  }

  function renderHabitCard(habit: Habit) {
    if (!season) return null;
    const streak = calcStreak(habit.id, season, checkins, vacationWeeks);
    const best = calcBestStreak(habit.id, season, checkins, vacationWeeks);
    const todayRec = checkins.find((c) => c.habit_id === habit.id && c.date === today);

    const isEditing = editingHabitId === habit.id;

    return (
      <div key={habit.id} className={`card habit-card${habit.is_core ? " core" : ""}`}>
        <div className="habit-head">
          {isEditing ? (
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEditHabit(habit.id)}
              maxLength={24}
              autoFocus
              style={{
                flex: 1,
                border: "1px solid var(--line)",
                background: "var(--paper)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 15,
                marginRight: 8,
              }}
            />
          ) : (
            <div className="habit-name">{habit.name}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isEditing ? (
              <>
                <button className="habit-remove" onClick={() => saveEditHabit(habit.id)}>
                  저장
                </button>
                <button className="habit-remove" onClick={cancelEditHabit}>
                  취소
                </button>
              </>
            ) : (
              <>
                {habit.is_core ? (
                  <span style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 700 }}>⭐ 핵심</span>
                ) : (
                  <button className="habit-remove" onClick={() => setCoreHabit(habit.id)}>
                    핵심으로 설정
                  </button>
                )}
                <button className="habit-remove" onClick={() => startEditHabit(habit)}>
                  수정
                </button>
                <button className="habit-remove" onClick={() => removeHabit(habit.id)}>
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        <div className="stampboard">
          {(() => {
            const weekStart = weekRange(season, curWeek).from;
            return Array.from({ length: 7 }, (_, i) => i).map((i) => {
              const d = new Date(dateStrOffset(i, weekStart));
              return (
                <div className="day-label" key={`lbl-${i}`}>
                  {["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}
                </div>
              );
            });
          })()}
          {(() => {
            const weekStart = weekRange(season, curWeek).from;
            return Array.from({ length: 7 }, (_, i) => i).map((i) => {
              const ds = dateStrOffset(i, weekStart);
              const rec = checkins.find((c) => c.habit_id === habit.id && c.date === ds);
              const d = new Date(ds);
              return (
                <div key={`cell-${i}`} className={`cell${ds === today ? " today" : ""}`}>
                  {!rec ? d.getDate() : <div className="stamp-mark">{rec.method === "photo" ? "📷" : "🪙"}</div>}
                </div>
              );
            });
          })()}
        </div>

        <div className="week-summary">
          <span className="ws-label">주차</span>
          {Array.from({ length: WEEK_COUNT }, (_, w) => w).map((w) => {
            const complete = isWeekComplete(habit.id, w, season, checkins);
            const vacation = isVacationWeek(w, vacationWeeks);
            const icon = complete ? "🪙" : vacation ? "⛱️" : w > curWeek ? "·" : w === curWeek ? "⏳" : "✕";
            return (
              <span
                key={w}
                className={`week-dot${complete ? " complete" : ""}${!complete && vacation ? " vacation" : ""}${w === curWeek ? " current" : ""}`}
              >
                {icon}
              </span>
            );
          })}
          <span className="ws-streak">연속 {streak}주</span>
        </div>

        {todayRec ? (
          <div className="done-pill-row">
            <div className="done-pill">
              {todayRec.method === "photo" ? "오늘 사진으로 채굴 완료" : "오늘 체크리스트로 채굴 완료"}
            </div>
            <button className="done-cancel" onClick={() => cancelCheckin(habit.id)}>
              취소
            </button>
          </div>
        ) : (
          <div className="verify-row">
            <button className="verify-btn" onClick={() => handleVerifyClick(habit.id, "checklist")}>
              <span className="ic">🪙</span>체크리스트 채굴
            </button>
            <button className="verify-btn" onClick={() => handleVerifyClick(habit.id, "photo")}>
              <span className="ic">📷</span>사진 채굴
            </button>
          </div>
        )}
        <div className="best-streak" style={{ marginTop: 8 }}>
          최고 연속 {best}주
        </div>
      </div>
    );
  }

  const coreHabit = habits.find((h) => h.is_core);
  const extraHabits = habits.filter((h) => !h.is_core);

  return (
    <div className="app">
      <div className="eyebrow" suppressHydrationWarning>
        {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
      </div>
      <h1>금모으기 프로젝트</h1>
      <div className="sub">
        👷🏻아아! 안녕하세요 여러분 작업반장입니다. 오늘도 열심히 채굴해서 금을 모아봅시다! 무리하지 말고, 오늘도 힘내보자구요💪🏻
      </div>

      <NavTabs />
      <InstallBanner />

      {season && (
        <div className="season-card">
          <div className="season-top">
            <div className="season-name">
              시즌 {season.number} · {curWeek + 1}주차
            </div>
            <div className="season-days">{over ? "종료됨" : `D-${Math.max(0, daysLeft)}`}</div>
          </div>
          <div className="season-range">
            {fmtShort(season.start_date)} ~ {fmtShort(season.end_date)} (4주)
          </div>
          <div className="season-bar">
            <div className="season-bar-fill" style={{ width: `${seasonElapsedPct}%` }} />
          </div>
          <div className="season-actions">
            {!over && (
              <button onClick={toggleVacation}>
                {onVacation ? "이번 주 휴가 취소하기" : "이번 주 휴가 신청하기"}
              </button>
            )}
          </div>
          {!over && onVacation && (
            <div
              className="season-ended-banner"
              style={{ background: "rgba(89,140,180,0.18)", borderColor: "rgba(89,140,180,0.45)" }}
            >
              이번 주는 휴가로 등록되어 있어요. 채굴을 쉬어도 연속 기록이 끊기지 않아요.
            </div>
          )}
          {over && (
            <div className="season-ended-banner">
              이번 시즌(4주)이 끝났어요. 아카이브에 기록을 남기고 새 시즌을 시작해보세요.
              <div>
                <button onClick={handleArchiveAndStart} disabled={archiving}>
                  {archiving ? "처리 중..." : "아카이브하고 새 시즌 시작"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="add-habit">
          <input
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            type="text"
            placeholder="채굴할 목표 (예: 물 2L 마시기)"
            maxLength={24}
          />
          <button onClick={addHabit}>추가</button>
        </div>
      </div>

      <NotificationSettings initialTime={initialNotificationTime} initialEnabled={initialNotificationEnabled} />

      {habits.length === 0 ? (
        <div className="empty">
          아직 등록된 광산이 없어요.
          <br />
          위에서 목표를 하나 추가하고 오늘 첫 금을 캐보세요.
        </div>
      ) : (
        <div>
          {coreHabit && <div className="habit-section-label">⭐ 핵심 채굴 목표</div>}
          {coreHabit && renderHabitCard(coreHabit)}
          {extraHabits.length > 0 && <div className="habit-section-label">추가 목표</div>}
          {extraHabits.map((habit) => renderHabitCard(habit))}
        </div>
      )}

      <div className="footnote">기록은 Supabase 서버에 저장돼요. 인증 사진은 본인만 볼 수 있는 비공개 저장소에 보관돼요.</div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />

      {overlay && (
        <div className="overlay show" onClick={() => setOverlay(null)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-coin">🪙</div>
            <div className="overlay-title">{overlay.title}</div>
            <div className="overlay-msg">{overlay.msg}</div>
            <div className="overlay-quote">
              <div className="overlay-quote-text">&quot;{overlay.quote}&quot;</div>
              <div className="overlay-quote-src">— {overlay.src}</div>
            </div>
            <button className="overlay-close" onClick={() => setOverlay(null)}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
