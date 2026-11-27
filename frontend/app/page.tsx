
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Note = {
  id: number;
  title: string;
  body: string;
  created_at: string | null;
  tags: string[];
};

type Tag = {
  id: number;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const cardColors = [
  "bg-blue-50 border-blue-100",
  "bg-purple-50 border-purple-100",
  "bg-pink-50 border-pink-100",
  "bg-amber-50 border-amber-100",
  "bg-emerald-50 border-emerald-100",
  "bg-cyan-50 border-cyan-100",
];

const tagColors = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
];

export default function Home() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // ==========================================
  // LOAD NOTES
  // ==========================================

  async function loadNotes(accessToken: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/notes/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Could not load notes. HTTP ${response.status}`
        );
      }

      setNotes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load notes."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD TAGS
  // ==========================================

  async function loadTags(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/tags/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not load categories.");
      }

      setTags(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load categories."
      );
    }
  }

  // ==========================================
  // CHECK USER SESSION
  // ==========================================

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      setDisplayName(data.session.user.user_metadata?.username || data.session.user.email?.split("@")[0] || "User");

      await Promise.all([
        loadNotes(data.session.access_token),
        loadTags(data.session.access_token),
      ]);

      if (mounted) {
        setAuthLoading(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setDisplayName(session.user.user_metadata?.username || session.user.email?.split("@")[0] || "User");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // ==========================================
  // CREATE NOTE WITH TAGS
  // ==========================================

  async function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
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

      const data = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Request failed: HTTP ${response.status}`
        );
      }

      setTitle("");
      setBody("");
      setSelectedTagIds([]);
      setShowForm(false);
      setSelectedTag("All");

      setMessage("Your note has been saved successfully!");

      await loadNotes(sessionData.session.access_token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the note."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/login");
  }

  // ==========================================
  // SELECT OR REMOVE TAG
  // ==========================================

  function toggleTag(tagId: number) {
    setSelectedTagIds((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId]
    );
  }

  // ==========================================
  // OPEN NOTE DETAILS
  // ==========================================

  function openNote(noteId: number) {
    router.push(`/notes/${noteId}`);
  }

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const availableTags = [
    "All",
    ...Array.from(new Set(notes.flatMap((note) => note.tags || []))),
  ];

  const filteredNotes = notes.filter((note) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      note.title.toLowerCase().includes(searchText) ||
      note.body.toLowerCase().includes(searchText);

    const matchesTag =
      selectedTag === "All" ||
      (note.tags || []).includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const totalCategories = tags.length;

  // ==========================================
  // AUTHENTICATION LOADING SCREEN
  // ==========================================

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="font-medium text-indigo-700">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-800">

      {/* TOP NAVIGATION */}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 shadow-md backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 to-purple-700 text-xl font-extrabold text-white shadow-md">
              N
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Note<span className="text-indigo-600">Space</span>
              </h1>
              <p className="text-xs text-slate-500">
                Your personal workspace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase() || "U"}
              </div>

              <span className="max-w-[180px] truncate text-sm font-medium text-indigo-800">
                {displayName || "User Account"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">

        {/* WELCOME BANNER */}

        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-indigo-700 to-purple-800 p-7 text-white shadow-xl sm:p-10">

          <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
                Your ideas deserve a space
              </p>

              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Welcome to NoteSpace!
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-blue-100">
                Capture your thoughts, organize your work, and keep every
                important idea in one beautiful place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/notes/new")}
              className="shrink-0 rounded-xl bg-white px-6 py-3.5 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-1 hover:bg-blue-50"
            >
              + Create New Note
            </button>
          </div>

          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-white/10" />
        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            <span className="text-xl">&#10003;</span>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <span className="text-xl">!</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* DASHBOARD STATISTICS */}

        <div className="mb-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-indigo-100 bg-white p-7 shadow-md transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl">
            <p className="text-sm font-semibold text-blue-700">
              Total Notes
            </p>
            <h3 className="mt-2 text-4xl font-extrabold text-blue-900">
              {notes.length}
            </h3>
            <p className="mt-1 text-xs text-blue-600">
              Notes in your workspace
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white p-7 shadow-md transition duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl">
            <p className="text-sm font-semibold text-purple-700">
              Categories
            </p>
            <h3 className="mt-2 text-4xl font-extrabold text-purple-900">
              {totalCategories}
            </h3>
            <p className="mt-1 text-xs text-purple-600">
              Different tags available
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-7 shadow-md transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold text-emerald-700">
              Matching Notes
            </p>
            <h3 className="mt-2 text-4xl font-extrabold text-emerald-900">
              {filteredNotes.length}
            </h3>
            <p className="mt-1 text-xs text-emerald-600">
              Based on your current filters
            </p>
          </div>

        </div>

        {/* CREATE NOTE FORM */}

        {showForm && (
          <form
            onSubmit={addNote}
            className="mb-9 rounded-2xl border border-indigo-100 bg-white p-6 shadow-lg sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Create a New Note
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Write down something important.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Note Title
            </label>

            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your note title..."
              className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Note Content
            </label>

            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing your ideas here..."
              rows={5}
              className="mb-5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />

            {/* TAG SELECTION */}

            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
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
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300"
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

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3 font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save My Note"}
            </button>
          </form>
        )}

        {/* NOTES SECTION HEADING */}

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Your collection
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              My Notes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Browse and manage all your saved ideas.
            </p>
          </div>

          <span className="w-fit rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"} found
          </span>
        </div>

        {/* SEARCH */}

        <div className="mb-6 rounded-2xl border border-indigo-100 bg-white p-4 shadow-md transition focus-within:border-indigo-300 focus-within:shadow-lg">
          <div className="flex items-center gap-3 px-2">
            <span className="text-xl text-indigo-500">&#8981;</span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes by title or content..."
              className="w-full bg-transparent py-2 text-slate-800 outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY FILTERS */}

        <div className="mb-8">
          <p className="mb-3 text-sm font-bold text-slate-700">
            Filter by category
          </p>

          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag, index) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  selectedTag === tag
                    ? "bg-indigo-600 text-white shadow-md"
                    : `${tagColors[index % tagColors.length]} hover:-translate-y-0.5`
                }`}
              >
                {tag === "All" ? "All Notes" : tag}
              </button>
            ))}
          </div>
        </div>

        {/* NOTES GRID */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="font-medium text-slate-600">
              Loading your notes...
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-4 text-5xl">&#128221;</div>

            <h3 className="text-xl font-bold text-slate-800">
              No notes found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {notes.length === 0
                ? "Your workspace is ready. Create your first note and start organizing your ideas."
                : "Try another search or choose a different category to find your notes."}
            </p>

            {notes.length === 0 && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                + Create Your First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note, index) => (
              <article
                key={note.id}
                className={`group flex min-h-[280px] flex-col rounded-3xl border p-7 shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl ${
                  cardColors[index % cardColors.length]
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm">
                    &#128221;
                  </div>

                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500">
                    Note #{note.id}
                  </span>
                </div>

                <h3 className="mb-3 text-lg font-extrabold leading-6 text-slate-800 transition group-hover:text-indigo-700">
                  {note.title}
                </h3>

                <p className="mb-5 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {note.body.length > 150
                    ? `${note.body.slice(0, 150)}...`
                    : note.body}
                </p>

                <div className="mb-4 flex flex-wrap gap-2 border-t border-slate-300/40 pt-4">
                  {(note.tags || []).length > 0 ? (
                    note.tags.map((tag, tagIndex) => (
                      <span
                        key={tag}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tagColors[tagIndex % tagColors.length]
                        }`}
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-slate-500">
                      No tags assigned
                    </span>
                  )}
                </div>

                {/* OPEN NOTE BUTTON */}

                <button
                  type="button"
                  onClick={() => openNote(note.id)}
                  className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-md transition duration-300 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-200"
                >
                  <span>Open Note</span>
                  <span>&#8594;</span>
                </button>
              </article>
            ))}
          </div>
        )}

        {/* FOOTER */}

        <footer className="mt-14 border-t border-slate-200 py-7 text-center">
          <p className="text-sm font-semibold text-slate-600">
            NoteSpace
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Your ideas. Your notes. Your space. &copy; 2026
          </p>
        </footer>

      </section>
    </main>
  );
}










