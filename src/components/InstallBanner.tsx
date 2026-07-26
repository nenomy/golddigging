"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "install-banner-dismissed";

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";

    if (isIos && !isStandalone && !dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="season-ended-banner" style={{ background: "rgba(89,140,180,0.18)", borderColor: "rgba(89,140,180,0.45)" }}>
      아이폰에서는 <b>공유 버튼(⬆️) → &quot;홈 화면에 추가&quot;</b>를 눌러 설치해야 매일 알림을 받을 수 있어요.
      <div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
