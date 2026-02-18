"use client";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

import { useEffect, useState } from "react";

interface BookMarkProps {
  id: string;
  title: string;
  url: string;
}

export default function BookMark() {
  const [bookmarks, setBookmarks] = useState<BookMarkProps[]>([]);
  const [title, setTitle] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  const loadBookmark = async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at");
    setBookmarks(data || []);
  };

  const addBookmark = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("bookmarks").insert({ title, url, user_id: user?.id });
    setTitle("");
    setUrl("");
    loadBookmark();
  };

  const updateBookmarks = async (id: string) => {
    await supabase.from("bookmarks").update({ title: "Updated!" }).eq("id", id);
    loadBookmark();
  };

  const deleteBookmarks = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
    loadBookmark();
  };

  useEffect(() => {
    loadBookmark();

    const channel = supabase
      .channel("realtime-bookmarks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        () => loadBookmark(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl mb-4">My Bookmarks</h1>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={addBookmark}
        className="bg-blue-500 text-white px-4 py-2"
      >
        Add
      </button>
      {bookmarks.map((b) => (
        <div key={b.id} className="border p-3 mt-3 flex justify-between">
          <a href={b.url} target="_blank">
            {b.title}
          </a>

          <div>
            <button onClick={() => updateBookmarks(b.id)}>✏️</button>
            <button onClick={() => deleteBookmarks(b.id)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}
