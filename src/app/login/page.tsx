"use client";

export default function LoginPage() {
  const handleKakaoLogin = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
      redirect_uri: `${window.location.origin}/auth/kakao/callback`,
      response_type: "code",
      scope: "profile_nickname,profile_image",
    });
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">금모으기 프로젝트</h1>
      <p className="text-sm text-neutral-500">카카오 계정으로 시작해보세요</p>
      <button
        onClick={handleKakaoLogin}
        className="rounded-md bg-[#FEE500] px-6 py-3 font-semibold text-black"
      >
        카카오로 시작하기
      </button>
    </main>
  );
}
