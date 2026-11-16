import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  // The callback owns its code exchange and cookie writes.
  if (!env || request.nextUrl.pathname.startsWith("/auth/")) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  // Never cache session cookies, including on redirects and failed refreshes.
  response.headers.set("Cache-Control", "private, no-store");
  if (!user || request.nextUrl.pathname === "/onboarding") return response;

  const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (error) {
    const unavailable = new NextResponse("잠시 후 다시 시도해 주세요. / Please try again shortly.", {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
    return unavailable;
  }
  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
