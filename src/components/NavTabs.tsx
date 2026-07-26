"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/ranking", label: "랭킹" },
  { href: "/archive", label: "아카이브" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="nav-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname === tab.href ? "active" : ""}
        >
          {tab.label}
        </Link>
      ))}
      <a onClick={handleLogout} style={{ cursor: "pointer" }}>
        로그아웃
      </a>
    </div>
  );
}
