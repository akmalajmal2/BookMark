"use client";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <button
        onClick={login}
        className="bg-black text-white px-6 py-2 rounded-lg font-bold cursor-pointer"
      >
        Sign in with Google
      </button>
    </div>
  );
}
