import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
  "/auth",
  "/kiosk",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons",
  "/api/automations/run", // cron-triggered, authenticated via a shared secret header, not a user session
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/**
 * Refreshes the Supabase auth session on every request (required for
 * @supabase/ssr — access tokens are short-lived and Server Components can't
 * write cookies themselves) and gates every non-public route behind
 * authentication. Per-organization *authorization* is enforced separately by
 * RLS and by each `/o/[orgSlug]` route re-checking membership server-side —
 * this middleware only answers "is there a logged-in user at all".
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return supabaseResponse;
}
