"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavTabs from "@/components/NavTabs";
import InstallBanner from "@/components/InstallBanner";
import NotificationBell from "@/components/NotificationBell";
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

type Habit = {
  id: string;
  name: string;
  is_active: boolean;
  is_core: boolean;
  sort_order: number;
  notification_enabled: boolean;
  notification_time: string;
};

type Props = {
  userId: string;
  initialSeason: Season | null;
  initialHabits: Habit[];
  initialCheckins: Checkin[];
  initialVacationWeeks: number[];
};

export default function Dashboard({
  userId,
  initialSeason,
  initialHabits,
  initialCheckins,
  initialVacationWeeks,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [season] = useState<Season | null>(initialSeason);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [vacationWeeks, setVacationWeeks] = useState<number[]>(initialVacationWeeks);
  const [habitInput, setHabitInput] = useState("");
  const [overlay, setOverlay] = useState<{ title: string; msg: string; quote: string; src: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragInfo = useRef<{ id: string; startY: number; timer: ReturnType<typeof setTimeout> | null } | null>(null);

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
      .insert({ user_id: userId, name, is_core: isCore, sort_order: habits.length })
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

  async function updateHabitNotification(id: string, patch: Partial<Pick<Habit, "notification_enabled" | "notification_time">>) {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    await supabase.from("habits").update(patch).eq("id", id);
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

  async function checkIn(habitId: string) {
    if (!season) return;
    const wasWeekComplete = isWeekComplete(habitId, curWeek, season, checkins);

    const { error } = await supabase.from("checkins").insert({
      habit_id: habitId,
      user_id: userId,
      date: today,
      method: "checklist",
    });
    if (error) return;

    setCheckins((prev) => [...prev, { habit_id: habitId, date: today, method: "checklist" }]);
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

  async function toggleDayCheckin(habitId: string, date: string) {
    if (!season || date > today) return;
    const existing = checkins.find((c) => c.habit_id === habitId && c.date === date);

    if (existing) {
      if (!window.confirm(`${fmtShort(date)} 채굴 기록을 취소할까요?`)) return;
      const { error } = await supabase
        .from("checkins")
        .delete()
        .eq("habit_id", habitId)
        .eq("user_id", userId)
        .eq("date", date);
      if (error) return;
      setCheckins((prev) => prev.filter((c) => !(c.habit_id === habitId && c.date === date)));
      return;
    }

    const wasWeekComplete = isWeekComplete(habitId, curWeek, season, checkins);
    const { error } = await supabase.from("checkins").insert({
      habit_id: habitId,
      user_id: userId,
      date,
      method: "checklist",
    });
    if (error) return;
    setCheckins((prev) => [...prev, { habit_id: habitId, date, method: "checklist" }]);
    showEncouragement(habitId, !wasWeekComplete);
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

  function reorderExtras(draggedId: string, targetIndex: number) {
    setHabits((prev) => {
      const core = prev.filter((h) => h.is_core);
      const extras = prev.filter((h) => !h.is_core);
      const fromIndex = extras.findIndex((h) => h.id === draggedId);
      if (fromIndex === -1 || fromIndex === targetIndex) return prev;
      const reordered = [...extras];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return [...core, ...reordered];
    });
  }

  function handleDragPointerDown(e: React.PointerEvent, habitId: string) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragInfo.current = {
      id: habitId,
      startY: e.clientY,
      timer: setTimeout(() => setDraggingId(habitId), 350),
    };
  }

  function handleDragPointerMove(e: React.PointerEvent) {
    if (!dragInfo.current) return;
    if (!draggingId) {
      if (Math.abs(e.clientY - dragInfo.current.startY) > 8 && dragInfo.current.timer) {
        clearTimeout(dragInfo.current.timer);
        dragInfo.current = null;
      }
      return;
    }
    const extras = habits.filter((h) => !h.is_core);
    let targetIndex = extras.length - 1;
    for (let i = 0; i < extras.length; i++) {
      const el = cardRefs.current.get(extras[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        targetIndex = i;
        break;
      }
    }
    reorderExtras(dragInfo.current.id, targetIndex);
  }

  async function handleDragPointerUp() {
    if (dragInfo.current?.timer) clearTimeout(dragInfo.current.timer);
    if (draggingId) {
      const extras = habits.filter((h) => !h.is_core);
      await Promise.all(
        extras.map((h, i) => supabase.from("habits").update({ sort_order: i }).eq("id", h.id)),
      );
    }
    dragInfo.current = null;
    setDraggingId(null);
  }

  function renderHabitCard(habit: Habit, draggable: boolean) {
    if (!season) return null;
    const streak = calcStreak(habit.id, season, checkins, vacationWeeks);
    const best = calcBestStreak(habit.id, season, checkins, vacationWeeks);
    const todayRec = checkins.find((c) => c.habit_id === habit.id && c.date === today);

    const isEditing = editingHabitId === habit.id;

    return (
      <div
        key={habit.id}
        ref={(el) => {
          if (el) cardRefs.current.set(habit.id, el);
          else cardRefs.current.delete(habit.id);
        }}
        className={`card habit-card${habit.is_core ? " core" : ""}${draggingId === habit.id ? " dragging" : ""}`}
      >
        <div className="habit-head">
          {draggable && !isEditing && (
            <span
              className="drag-handle"
              onPointerDown={(e) => handleDragPointerDown(e, habit.id)}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              onPointerCancel={handleDragPointerUp}
            >
              ⠿
            </span>
          )}
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
          {isEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="habit-remove" onClick={() => saveEditHabit(habit.id)}>
                저장
              </button>
              <button className="habit-remove" onClick={cancelEditHabit}>
                취소
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {habit.is_core && (
                <span style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 700 }}>⭐ 핵심</span>
              )}
              <div className="habit-menu-wrap">
                <button
                  className="habit-menu-btn"
                  onClick={() => setMenuOpenId(menuOpenId === habit.id ? null : habit.id)}
                  aria-label="목표 설정 메뉴"
                >
                  ⚙️
                </button>
                {menuOpenId === habit.id && (
                  <div className="habit-menu-dropdown">
                    {!habit.is_core && (
                      <button
                        onClick={() => {
                          setCoreHabit(habit.id);
                          setMenuOpenId(null);
                        }}
                      >
                        핵심으로 설정
                      </button>
                    )}
                    <button
                      onClick={() => {
                        startEditHabit(habit);
                        setMenuOpenId(null);
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        removeHabit(habit.id);
                        setMenuOpenId(null);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
              const isPast = ds < today;
              const isFuture = ds > today;
              return (
                <div
                  key={`cell-${i}`}
                  className={`cell${ds === today ? " today" : ""}${isPast ? " clickable" : ""}${isFuture ? " future" : ""}`}
                  onClick={isPast ? () => toggleDayCheckin(habit.id, ds) : undefined}
                >
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
            <div className="done-pill">오늘 채굴 완료</div>
            <button className="done-cancel" onClick={() => cancelCheckin(habit.id)}>
              취소
            </button>
          </div>
        ) : (
          <button className="mine-btn" onClick={() => checkIn(habit.id)}>
            <span className="ic">⛏️</span>채굴하기
          </button>
        )}
        <div className="best-streak" style={{ marginTop: 8 }}>
          최고 연속 {best}주
        </div>

        <div className="habit-notify-row">
          <span style={{ fontSize: 12 }}>🔔</span>
          <input
            type="time"
            value={habit.notification_time.slice(0, 5)}
            onChange={(e) =>
              setHabits((prev) =>
                prev.map((h) => (h.id === habit.id ? { ...h, notification_time: e.target.value } : h)),
              )
            }
            onBlur={(e) => updateHabitNotification(habit.id, { notification_time: e.target.value })}
          />
          <button
            className="habit-notify-toggle"
            data-on={habit.notification_enabled}
            onClick={() => updateHabitNotification(habit.id, { notification_enabled: !habit.notification_enabled })}
          >
            {habit.notification_enabled ? "이 목표 알림 켬" : "이 목표 알림 꺼짐"}
          </button>
        </div>
      </div>
    );
  }

  const coreHabit = habits.find((h) => h.is_core);
  const extraHabits = habits.filter((h) => !h.is_core);

  return (
    <div className="app">
      <NotificationBell />
      <div className="eyebrow" suppressHydrationWarning>
        {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
      </div>
      <h1>금모으기 프로젝트</h1>
      <div className="sub">
        📢작업반장 공지 사항
        <br />
        👷🏻채굴하기 버튼 누르는 걸 깜빡했다면? 이제는 이전 날짜도 채굴을 완료할 수 있습니다! 인증을 원하는 날짜를 클릭해서 인증 또는 인증 취소가 가능합니다.
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

      {habits.length === 0 ? (
        <div className="empty">
          아직 등록된 광산이 없어요.
          <br />
          위에서 목표를 하나 추가하고 오늘 첫 금을 캐보세요.
        </div>
      ) : (
        <div>
          {coreHabit && <div className="habit-section-label">⭐ 핵심 채굴 목표</div>}
          {coreHabit && renderHabitCard(coreHabit, false)}
          {extraHabits.length > 0 && <div className="habit-section-label">추가 목표 (꾹 눌러서 순서 변경)</div>}
          {extraHabits.map((habit) => renderHabitCard(habit, true))}
        </div>
      )}

      <div className="footnote">기록은 Supabase 서버에 저장돼요.</div>

      {menuOpenId && <div className="habit-menu-backdrop" onClick={() => setMenuOpenId(null)} />}

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
