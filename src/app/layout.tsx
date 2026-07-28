import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import BackgroundDecor from "@/components/BackgroundDecor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "금모으기 프로젝트",
  description: "습관 채굴 일지",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "금모으기",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#22314F",
  colorScheme: "light dark",
};

// Supabase 프로젝트가 서울 리전이라, Vercel 함수도 서울(icn1)에서 실행되게 고정
// (기본값인 미국 동부에서 실행되면 DB 요청마다 태평양을 왕복해서 느려짐)
export const preferredRegion = "icn1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <BackgroundDecor />
        {children}
      </body>
    </html>
  );
}
