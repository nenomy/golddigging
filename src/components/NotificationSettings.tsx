"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialTime: string;
  initialEnabled: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSettings({ initialTime }: Props) {
  const supabase = createClient();
  const [time, setTime] = useState(initialTime.slice(0, 5));
  const [savedTime, setSavedTime] = useState(initialTime.slice(0, 5));
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!subscription);
      } catch {
        // 브라우저가 확인을 거부해도 무시하고 "켜기" 상태로 둠
      }
    }
    checkSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveTime() {
    if (!time || time.length !== 5) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ notification_time: time }).eq("id", user.id);
    setSavedTime(time);
    setStatus("알림 시각이 저장됐어요.");
  }

  async function enableNotifications() {
    setBusy(true);
    setStatus(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("이 브라우저는 푸시 알림을 지원하지 않아요.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("알림 권한이 허용되지 않았어요.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        setStatus("구독 저장에 실패했어요.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ notification_enabled: true }).eq("id", user.id);
      }
      setEnabled(true);
      setStatus("알림이 켜졌어요!");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
    } catch {
      // 구독 해제 실패해도 계속 진행
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ notification_enabled: false }).eq("id", user.id);
    }
    setEnabled(false);
    setStatus("알림이 꺼졌어요.");
  }

  return (
    <div className="card">
      <div className="habit-head" style={{ marginBottom: 10 }}>
        <div className="habit-name" style={{ fontSize: 16 }}>
          알림 설정
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>매일</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px" }}
        />
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>에 알림 받기</span>
        <button
          onClick={saveTime}
          disabled={time === savedTime}
          style={{
            fontFamily: "var(--pixel)",
            fontSize: 11,
            padding: "6px 10px",
            background: time === savedTime ? "var(--paper-dark)" : "var(--navy)",
            color: time === savedTime ? "var(--ink-soft)" : "#F6F0DE",
            border: "none",
            borderRadius: 6,
            cursor: time === savedTime ? "default" : "pointer",
          }}
        >
          저장
        </button>
      </div>
      <div className="verify-row">
        {enabled ? (
          <button className="verify-btn" onClick={disableNotifications}>
            알림 끄기
          </button>
        ) : (
          <button className="verify-btn" onClick={enableNotifications} disabled={busy}>
            {busy ? "처리 중..." : "알림 켜기"}
          </button>
        )}
      </div>
      {status && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>{status}</div>}
    </div>
  );
}
