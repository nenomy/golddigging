import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { todayStr, REMINDERS } from "@/lib/season";

function kstMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  return handleSend(request);
}

export async function POST(request: Request) {
  return handleSend(request);
}

async function handleSend(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    "mailto:admin@geummogi.local",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const nowMin = kstMinutesNow();
  const windowEnd = (nowMin + 15) % 1440;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, notification_time")
    .eq("notification_enabled", true);

  const matched = (profiles ?? []).filter((p) => {
    const t = timeStrToMinutes(p.notification_time);
    if (windowEnd > nowMin) return t >= nowMin && t < windowEnd;
    // 자정을 넘어가는 구간 (예: 23:50 ~ 00:05)
    return t >= nowMin || t < windowEnd;
  });

  let sent = 0;

  for (const profile of matched) {
    const today = todayStr();
    const { data: habits } = await admin
      .from("habits")
      .select("id")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    if (!habits || habits.length === 0) continue;

    const { data: todayCheckins } = await admin
      .from("checkins")
      .select("habit_id")
      .eq("user_id", profile.id)
      .eq("date", today);

    if ((todayCheckins?.length ?? 0) >= habits.length) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", profile.id);

    if (!subs || subs.length === 0) continue;

    const message = REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
    const payload = JSON.stringify({
      title: "오늘의 채굴을 잊지 마세요 ⛏️",
      body: message,
      url: "/",
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, matchedUsers: matched.length, sent });
}
