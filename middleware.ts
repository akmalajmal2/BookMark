import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: request.cookies,
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  if (!session && path.startsWith("/bookmarks")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session && path === "/") {
    return NextResponse.redirect(new URL("/bookmarks", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/bookmarks/:path*"],
};
