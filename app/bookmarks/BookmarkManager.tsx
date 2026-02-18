"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
export default function BookmarkManager({ userId }: { userId: string }) {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Clears the server cache
    router.push("/login");
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    // 1. Initial Fetch
    const fetchBookmarks = async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });
      setBookmarks(data || []);
    };
    fetchBookmarks();

    // 2. REALTIME SUBSCRIPTION
    // This is what makes Tab B update when Tab A changes data
    const channel = supabase
      .channel("realtime-bookmarks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
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
  }, [userId, supabase]);

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("bookmarks")
      .insert([{ title, url, user_id: userId }]);

    if (!error) {
      setTitle("");
      setUrl("");
    }
  };

  const deleteBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
  };

  const startEdit = (bm: any) => {
    setEditingId(bm.id);
    setEditTitle(bm.title);
  };

  const saveEdit = async (id: string) => {
    await supabase.from("bookmarks").update({ title: editTitle }).eq("id", id);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* ADD FORM */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-sm hover:bg-red-100 transition"
        >
          Logout
        </button>
      </div>
      <form
        onSubmit={addBookmark}
        className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg"
      >
        <input
          className="border p-2 rounded"
          placeholder="Website Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 transition">
          Add Bookmark
        </button>
      </form>

      {/* LIST */}
      <div className="space-y-3">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm"
          >
            <div className="flex-1">
              {editingId === bm.id ? (
                <input
                  className="border p-1 rounded w-full"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveEdit(bm.id)}
                  autoFocus
                />
              ) : (
                <>
                  <p className="font-bold text-gray-800">{bm.title}</p>
                  <a
                    href={bm.url}
                    target="_blank"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {bm.url}
                  </a>
                </>
              )}
            </div>

            <div className="flex gap-3 ml-4">
              <button
                onClick={() =>
                  editingId === bm.id ? saveEdit(bm.id) : startEdit(bm)
                }
                className="text-gray-500 hover:text-blue-600 text-sm"
              >
                {editingId === bm.id ? "Save" : "Edit"}
              </button>
              <button
                onClick={() => deleteBookmark(bm.id)}
                className="text-red-400 hover:text-red-600 text-sm"
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
