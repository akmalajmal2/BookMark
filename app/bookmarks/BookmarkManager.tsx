"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BookmarkManager({ userId }: { userId: string }) {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const router = useRouter();

  // FIX 1: Use useMemo so the subscription can track the client instance properly
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const fetchBookmarks = useCallback(async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false });
    setBookmarks(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchBookmarks();

    // FIX 2: Ensure the channel is named and correctly listening
    const channel = supabase
      .channel(`db-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Realtime Change:", payload); // Debugging log

          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            // payload.old.id is used here
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === payload.new.id ? payload.new : b)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, fetchBookmarks]);

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    await supabase.from("bookmarks").insert([{ title, url, user_id: userId }]);
    setTitle("");
    setUrl("");
  };

  const deleteBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
  };

  const startEdit = (bm: any) => {
    setEditTitle(bm.title);
    setEditingId(bm.id);
  };

  const saveEdit = async (id: string) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditingId(null);
      return;
    }

    setEditingId(null);
    await supabase
      .from("bookmarks")
      .update({ title: trimmedTitle })
      .eq("id", id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const formatExternalUrl = (url: string) => {
    if (!url) return "#";
    // If it already has http:// or https://, return it as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // Otherwise, add https:// to the front
    return `https://${url}`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="text-red-600 bg-red-50 px-3 py-1 rounded text-sm hover:bg-red-100 transition"
        >
          Logout
        </button>
      </div>

      <form
        onSubmit={addBookmark}
        className="flex flex-col gap-2 p-4 bg-white border rounded-lg shadow-sm"
      >
        <input
          className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">
          Add
        </button>
      </form>

      <div className="space-y-3">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm"
          >
            <div className="flex-1 mr-4">
              {editingId === bm.id ? (
                <input
                  className="border p-1 w-full rounded outline-none focus:ring-2 focus:ring-blue-400"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(bm.id)}
                  autoFocus
                />
              ) : (
                <>
                  <p className="font-bold text-gray-800">{bm.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    <a
                      href={formatExternalUrl(bm?.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-blue-500 transition-colors"
                    >
                      {bm?.url}
                    </a>
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() =>
                  editingId === bm.id ? saveEdit(bm.id) : startEdit(bm)
                }
                className="text-blue-600 text-sm font-semibold hover:underline"
              >
                {editingId === bm.id ? "Save" : "Edit"}
              </button>
              <button
                onClick={() => deleteBookmark(bm.id)}
                className="text-red-500 text-sm font-semibold hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
