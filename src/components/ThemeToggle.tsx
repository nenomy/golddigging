"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getEffectiveTheme(): Theme {
  const stored = document.documentElement.getAttribute("data-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getEffectiveTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <button className="theme-toggle-btn" onClick={toggle} aria-label="라이트/다크 모드 전환">
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
