import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type KakaoTokenResponse = {
  access_token: string;
};

type KakaoUserResponse = {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=kakao_no_code`);
  }

  const redirectUri = `${origin}/auth/kakao/callback`;

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=kakao_token_failed`);
  }
  const tokenData = (await tokenRes.json()) as KakaoTokenResponse;

  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!meRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=kakao_profile_failed`);
  }
  const me = (await meRes.json()) as KakaoUserResponse;

  const profile = me.kakao_account?.profile;
  const nickname = profile?.nickname ?? `광부${me.id}`;
  const avatarUrl = profile?.profile_image_url;
  const syntheticEmail = `kakao-${me.id}@geummogi.local`;

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
    options: {
      data: { nickname, avatar_url: avatarUrl },
    },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.redirect(`${origin}/login?error=kakao_link_failed`);
  }

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.redirect(`${origin}/login?error=kakao_session_failed`);
  }

  return NextResponse.redirect(`${origin}/`);
}
