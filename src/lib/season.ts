export const SEASON_LENGTH_DAYS = 28;
export const WEEK_COUNT = SEASON_LENGTH_DAYS / 7;

export type Season = {
  id: string;
  number: number;
  start_date: string;
  end_date: string;
};

export type CheckinMethod = "checklist" | "photo";

export type Checkin = {
  habit_id: string;
  date: string;
  method: CheckinMethod;
};

export function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function dateStrOffset(offsetDays: number, base?: string): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + offsetDays);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function fmtShort(ds: string): string {
  const d = new Date(ds);
  return d.getMonth() + 1 + "/" + d.getDate();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function isSeasonOver(season: Season): boolean {
  return todayStr() > season.end_date;
}

export function getWeekIndex(dateStr: string, seasonStartDate: string): number {
  return Math.floor(daysBetween(seasonStartDate, dateStr) / 7);
}

export function weekRange(season: Season, weekIndex: number) {
  const from = dateStrOffset(weekIndex * 7, season.start_date);
  const to = dateStrOffset(weekIndex * 7 + 6, season.start_date);
  return { from, to };
}

export function isWeekComplete(
  habitId: string,
  weekIndex: number,
  season: Season,
  checkins: Checkin[],
): boolean {
  const { from, to } = weekRange(season, weekIndex);
  return checkins.some(
    (c) => c.habit_id === habitId && c.date >= from && c.date <= to,
  );
}

export function isVacationWeek(weekIndex: number, vacationWeeks: number[]): boolean {
  return vacationWeeks.includes(weekIndex);
}

export function getCurrentWeekIndex(season: Season): number {
  const idx = getWeekIndex(todayStr(), season.start_date);
  return Math.max(0, Math.min(WEEK_COUNT - 1, idx));
}

export function calcStreak(
  habitId: string,
  season: Season,
  checkins: Checkin[],
  vacationWeeks: number[],
): number {
  const curWeek = getCurrentWeekIndex(season);
  const curOk =
    isWeekComplete(habitId, curWeek, season, checkins) ||
    isVacationWeek(curWeek, vacationWeeks);
  let streak = 0;
  let w = curOk ? curWeek : curWeek - 1;
  while (w >= 0) {
    if (isWeekComplete(habitId, w, season, checkins) || isVacationWeek(w, vacationWeeks)) {
      streak++;
      w--;
    } else {
      break;
    }
  }
  return streak;
}

export function calcBestStreak(
  habitId: string,
  season: Season,
  checkins: Checkin[],
  vacationWeeks: number[],
): number {
  const curWeek = getCurrentWeekIndex(season);
  let best = 0;
  let cur = 0;
  for (let w = 0; w <= curWeek; w++) {
    if (isWeekComplete(habitId, w, season, checkins) || isVacationWeek(w, vacationWeeks)) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

export type HabitSeasonStats = {
  habitId: string;
  habitName: string;
  completedWeeks: number;
  best: number;
  final: number;
};

export function computeHabitSeasonStats(
  habitId: string,
  habitName: string,
  season: Season,
  checkins: Checkin[],
  vacationWeeks: number[],
): HabitSeasonStats {
  let completedWeeks = 0;
  const weekStatus: ("complete" | "vacation" | "missed")[] = [];
  for (let w = 0; w < WEEK_COUNT; w++) {
    const complete = isWeekComplete(habitId, w, season, checkins);
    const vacation = isVacationWeek(w, vacationWeeks);
    if (complete) completedWeeks++;
    weekStatus.push(complete ? "complete" : vacation ? "vacation" : "missed");
  }
  let best = 0;
  let cur = 0;
  weekStatus.forEach((s) => {
    if (s === "complete" || s === "vacation") {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  });
  let final = 0;
  for (let w = WEEK_COUNT - 1; w >= 0; w--) {
    if (weekStatus[w] === "complete" || weekStatus[w] === "vacation") final++;
    else break;
  }
  return { habitId, habitName, completedWeeks, best, final };
}

export const ENCOURAGEMENTS = [
  "오늘도 곡괭이질 한 번, 금 한 조각 캐냈어요.",
  "작은 사금 한 톨이 모여 결국 금괴가 됩니다.",
  "파도 파도 안 나오는 날도 있지만, 오늘은 캐냈네요.",
  "채굴은 계속하는 사람이 이깁니다. 오늘 몫 완료.",
  "금맥은 꾸준한 사람 손에 잡혀요. 지금 그러고 있어요.",
  "오늘도 곳간에 금 한 닢 추가요.",
  "포기하지 않고 판 덕분에, 오늘도 금이 나왔어요.",
  "채굴 일지에 오늘도 좋은 하루가 기록됐어요.",
];

export const MILESTONE_MSG: Record<number, string> = {
  1: "1주차 채굴 완료! 시즌의 첫 사이클을 끝냈어요.",
  2: "2주 연속 채굴! 이 정도면 흐름을 탄 거예요.",
  3: "3주 연속 채굴, 시즌 마무리가 눈앞이에요.",
  4: "4주 전체를 다 채웠어요. 이번 시즌 완주를 축하해요!",
};

export const QUOTES = [
  { text: "우리가 반복적으로 하는 행동이 바로 우리 자신이다. 탁월함은 순간의 행위가 아니라 습관에서 나온다.", src: "아리스토텔레스" },
  { text: "천 리 길도 한 걸음부터 시작된다.", src: "노자" },
  { text: "느리게 가도 괜찮다, 멈추지만 않는다면.", src: "공자" },
  { text: "습관은 처음엔 거미줄처럼 가늘지만, 나중엔 밧줄처럼 단단해진다.", src: "스페인 속담" },
  { text: "위대한 성취는 순간의 힘이 아니라 끊임없는 반복에서 나온다.", src: "새뮤얼 존슨" },
  { text: "물방울이 끊임없이 떨어지면 결국 바위도 뚫는다.", src: "오비디우스" },
  { text: "오늘 걷지 않으면 내일은 뛰어야 한다.", src: "속담" },
  { text: "작은 습관 하나가 쌓이면 삶의 방향이 바뀐다.", src: "윌리엄 제임스" },
  { text: "성공은 매일 반복한 작은 노력들의 총합이다.", src: "로버트 콜리어" },
  { text: "산을 옮기는 사람도 작은 돌 하나를 나르는 일부터 시작한다.", src: "공자" },
  { text: "시작이 반이다.", src: "아리스토텔레스" },
  { text: "매일 조금씩 나아지는 것, 그것이 완성에 이르는 유일한 길이다.", src: "존 우든" },
  { text: "꾸준함은 재능보다 강하다.", src: "격언" },
  { text: "행동이 반복되면 습관이 되고, 습관이 쌓이면 사람이 된다.", src: "격언" },
  { text: "어제보다 나은 오늘 하나면 충분하다.", src: "격언" },
];
