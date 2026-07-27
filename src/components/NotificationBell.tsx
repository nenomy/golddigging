"use client";

import { useState } from "react";
import NotificationSettings from "@/components/NotificationSettings";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="bell-btn" onClick={() => setOpen(true)} aria-label="알림 설정 열기">
        🔔
      </button>
      {open && (
        <div className="overlay show" onClick={() => setOpen(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "left", padding: 0 }}>
            <NotificationSettings />
            <div style={{ padding: "0 26px 22px", textAlign: "center" }}>
              <button className="overlay-close" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
