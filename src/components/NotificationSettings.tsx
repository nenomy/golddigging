"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSettings() {
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

      setEnabled(true);
      setStatus("이 기기에서 알림을 받을 수 있어요! 이제 각 목표 카드 아래에서 알림 시간을 설정해주세요.");
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
    setEnabled(false);
    setStatus("이 기기 알림을 껐어요.");
  }

  return (
    <div className="card">
      <div className="habit-head" style={{ marginBottom: 10 }}>
        <div className="habit-name" style={{ fontSize: 16 }}>
          이 기기에서 알림 받기
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.5 }}>
        먼저 이 기기에서 알림 권한을 켜주세요. 각 목표별 알림 시간은 아래 목표 카드마다 따로 설정할 수 있어요.
      </div>
      <div className="verify-row">
        {enabled ? (
          <button className="verify-btn" onClick={disableNotifications}>
            이 기기 알림 끄기
          </button>
        ) : (
          <button className="verify-btn" onClick={enableNotifications} disabled={busy}>
            {busy ? "처리 중..." : "이 기기 알림 켜기"}
          </button>
        )}
      </div>
      {status && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>{status}</div>}
    </div>
  );
}
