"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tag = {
  id: number;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NewNotePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [displayName, setDisplayName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;
      setDisplayName(
        user.user_metadata?.username || user.email?.split("@")[0] || "User"
      );

      try {
        if (!API_URL) {
          throw new Error("The backend API URL is not configured.");
        }

        const response = await fetch(`${API_URL}/tags/`, {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const result = await response.json();

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(result.error || "Could not load categories.");
        }

        if (mounted) setTags(result);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Could not load categories."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setDisplayName(
          session.user.user_metadata?.username ||
            session.user.email?.split("@")[0] ||
            "User"
        );
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId]
    );
  }

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      if (!API_URL) {
        throw new Error("The backend API URL is not configured.");
      }

      const response = await fetch(`${API_URL}/notes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tag_ids: selectedTagIds,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Request failed: HTTP ${response.status}`
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-lg font-medium text-indigo-600">
          Loading your workspace...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-2 text-2xl font-extrabold text-white shadow-md">NoteSpace</h1>
            <p className="mt-2 text-sm font-semibold text-indigo-700">
              Welcome, {displayName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Back to Dashboard
          </button>
        </div>

        <form
          onSubmit={saveNote}
          className="overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-2xl shadow-indigo-100 sm:p-8"
        >
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white shadow-lg sm:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Create a New Note
            </h2>
            <p className="mt-3 text-sm leading-6 text-indigo-100">
              Capture your thoughts, ideas and important information.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Note Title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your note title..."
            className="mb-6 w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Note Content
          </label>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start writing your ideas here..."
            rows={9}
            className="mb-6 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Select Categories
              </label>
              <span className="text-xs text-slate-500">
                {selectedTagIds.length} selected
              </span>
            </div>

            {tags.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                No categories available. Please check your connection.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      selectedTagIds.includes(tag.id)
                        ? "border-purple-500 bg-gradient-to-r from-indigo-50 to-purple-100 text-indigo-800 shadow-md ring-1 ring-purple-200"
                        : "border-indigo-100 bg-white text-slate-700 shadow-sm hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-slate-400">
              You can select more than one category for a note.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-8 py-3.5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save My Note"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-bold text-slate-600 shadow-sm transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
